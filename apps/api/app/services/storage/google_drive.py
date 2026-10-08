import io
import os
import json
import logging
from typing import BinaryIO, Dict, Any, Optional, AsyncIterator
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from app.services.storage.base import StorageService
from app.core.config import settings

logger = logging.getLogger("rage.storage.gdrive")

class GoogleDriveStorage(StorageService):
    """
    Google Drive API v3 Storage Provider for RAGE Cloud.
    Organizes files into structured folders: users, teams, public, private, paid, quarantine.
    """

    SCOPES = ['https://www.googleapis.com/auth/drive']

    def __init__(self):
        self.service = None
        self.folder_cache = {}
        self.root_folder_id = settings.GOOGLE_DRIVE_FOLDER_ID
        self.credentials = None
        self._initialize_client()

    def _initialize_client(self):
        """
        Initializes Google Drive API service using either:
        1. OAuth 2.0 User Token (with refresh token) from GOOGLE_TOKEN_FILE
        2. Google Service Account JSON
        """
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request

        token_candidates = [
            settings.GOOGLE_TOKEN_FILE,
            "google_token.json",
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "google_token.json"),
            os.path.abspath(os.path.join(os.getcwd(), "google_token.json")),
            r"C:\Users\rdxyz\Downloads\webads\google_token.json",
            r"C:\Users\rdxyz\Downloads\webads\apps\api\google_token.json"
        ]

        # 0. Try direct JSON string from environment variable (ideal for Railway/Render/Docker)
        if settings.GOOGLE_TOKEN_JSON:
            try:
                logger.info("Loading Google Drive OAuth credentials from GOOGLE_TOKEN_JSON environment variable")
                token_data = (
                    json.loads(settings.GOOGLE_TOKEN_JSON)
                    if isinstance(settings.GOOGLE_TOKEN_JSON, str)
                    else settings.GOOGLE_TOKEN_JSON
                )
                creds = Credentials.from_authorized_user_info(token_data, scopes=self.SCOPES)
                if creds and creds.expired and creds.refresh_token:
                    logger.info("Google Drive OAuth token expired, refreshing...")
                    creds.refresh(Request())
                self.credentials = creds
                self.service = build('drive', 'v3', credentials=creds, cache_discovery=False)
                logger.info("Google Drive API client initialized successfully via GOOGLE_TOKEN_JSON env var.")
                return
            except Exception as e:
                logger.error(f"Failed to load OAuth token from GOOGLE_TOKEN_JSON: {e}")

        # 1. Try authorized user token file
        for token_path in token_candidates:
            if token_path and os.path.exists(token_path):
                try:
                    logger.info(f"Loading Google Drive OAuth credentials from {token_path}")
                    creds = Credentials.from_authorized_user_file(token_path, scopes=self.SCOPES)
                    if creds and creds.expired and creds.refresh_token:
                        logger.info("Google Drive OAuth token expired, refreshing...")
                        creds.refresh(Request())
                        with open(token_path, "w", encoding="utf-8") as f:
                            f.write(creds.to_json())
                    
                    self.credentials = creds
                    self.service = build('drive', 'v3', credentials=creds, cache_discovery=False)
                    logger.info("Google Drive API client initialized successfully via OAuth 2.0.")
                    return
                except Exception as e:
                    logger.error(f"Failed to load OAuth token from {token_path}: {e}")

        # 2. Try Service Account credentials
        creds_data = settings.GOOGLE_SERVICE_ACCOUNT_JSON
        if creds_data:
            try:
                if os.path.isfile(creds_data):
                    creds = service_account.Credentials.from_service_account_file(
                        creds_data, scopes=self.SCOPES
                    )
                else:
                    info = json.loads(creds_data)
                    creds = service_account.Credentials.from_service_account_info(
                        info, scopes=self.SCOPES
                    )

                self.credentials = creds
                self.service = build('drive', 'v3', credentials=creds, cache_discovery=False)
                logger.info("Google Drive API client initialized successfully via Service Account.")
                return
            except Exception as e:
                logger.error(f"Failed to initialize Google Drive client via Service Account: {e}")

        logger.warning(
            "Google Drive client not yet authorized. Run `python scripts/setup_google_drive.py` "
            "to authenticate with your 5TB Google account."
        )
        self.service = None

    def is_configured(self) -> bool:
        return self.service is not None

    def _ensure_root_folder(self) -> Optional[str]:
        """Finds or creates RAGE_Cloud_Storage folder if no root_folder_id is set"""
        if not self.service:
            return None
        if self.root_folder_id:
            return self.root_folder_id

        try:
            query = "name = 'RAGE_Cloud_Storage' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            response = self.service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
            files = response.get('files', [])
            if files:
                self.root_folder_id = files[0]['id']
            else:
                folder_metadata = {
                    'name': 'RAGE_Cloud_Storage',
                    'mimeType': 'application/vnd.google-apps.folder'
                }
                folder = self.service.files().create(body=folder_metadata, fields='id').execute()
                self.root_folder_id = folder.get('id')
            return self.root_folder_id
        except Exception as e:
            logger.error(f"Error ensuring root folder in Google Drive: {e}")
            return None

    def get_storage_quota(self) -> Dict[str, Any]:
        """Returns total, used, and available storage in bytes from the Drive account"""
        if not self.service:
            return {"configured": False, "total_bytes": 0, "used_bytes": 0, "free_bytes": 0}
        try:
            about = self.service.about().get(fields='user, storageQuota').execute()
            user_info = about.get('user', {})
            quota = about.get('storageQuota', {})
            limit = int(quota.get('limit', 0))
            usage = int(quota.get('usage', 0))
            return {
                "configured": True,
                "email": user_info.get('emailAddress'),
                "display_name": user_info.get('displayName'),
                "total_bytes": limit,
                "used_bytes": usage,
                "free_bytes": max(0, limit - usage) if limit > 0 else 0,
                "total_gb": round(limit / (1024**3), 2) if limit else 0,
                "used_gb": round(usage / (1024**3), 2),
                "is_5tb": limit >= (4 * 1024**4)
            }
        except Exception as e:
            logger.error(f"Error querying storage quota: {e}")
            return {"configured": False, "error": str(e)}

    def _get_or_create_subfolder(self, folder_name: str) -> Optional[str]:
        """Finds or creates a subfolder inside RAGE Cloud root folder"""
        if not self.service:
            return None

        root_id = self._ensure_root_folder()
        if not root_id:
            return None

        if folder_name in self.folder_cache:
            return self.folder_cache[folder_name]

        try:
            query = (
                f"'{root_id}' in parents and "
                f"name = '{folder_name}' and "
                f"mimeType = 'application/vnd.google-apps.folder' and trashed = false"
            )
            response = self.service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
            files = response.get('files', [])

            if files:
                folder_id = files[0]['id']
            else:
                folder_metadata = {
                    'name': folder_name,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [root_id]
                }
                folder = self.service.files().create(body=folder_metadata, fields='id').execute()
                folder_id = folder.get('id')

            self.folder_cache[folder_name] = folder_id
            return folder_id
        except Exception as e:
            logger.error(f"Error managing subfolder '{folder_name}': {e}")
            return root_id

    async def upload(
        self,
        file_obj: BinaryIO,
        filename: str,
        mime_type: str,
        folder_category: str = "public",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not self.service:
            raise RuntimeError("Google Drive client is not configured or authenticated.")

        target_folder = self._get_or_create_subfolder(folder_category) or self.root_folder_id
        file_metadata = {
            'name': filename,
            'parents': [target_folder] if target_folder else []
        }
        if metadata:
            file_metadata['properties'] = {k: str(v) for k, v in metadata.items()}

        media = MediaIoBaseUpload(file_obj, mimetype=mime_type, resumable=True)
        file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, size, webViewLink, webContentLink'
        ).execute()

        file_id = file.get('id')
        size = int(file.get('size', 0))

        return {
            "file_id": file_id,
            "storage_key": f"gdrive://{target_folder}/{file_id}",
            "size": size,
            "storage_backend": "google_drive",
            "url": file.get('webContentLink') or file.get('webViewLink')
        }

    async def download_stream(self, file_id_or_key: str) -> AsyncIterator[bytes]:
        if not self.service:
            raise RuntimeError("Google Drive client is not configured.")

        file_id = file_id_or_key.replace("gdrive://", "").split("/")[-1]
        request = self.service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)

        done = False
        while not done:
            status, done = downloader.next_chunk()
            fh.seek(0)
            chunk = fh.read()
            fh.seek(0)
            fh.truncate(0)
            if chunk:
                yield chunk

    async def delete(self, file_id_or_key: str) -> bool:
        if not self.service:
            return False
        try:
            file_id = file_id_or_key.replace("gdrive://", "").split("/")[-1]
            self.service.files().delete(fileId=file_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting file from Google Drive ({file_id_or_key}): {e}")
            return False

    async def move(self, file_id_or_key: str, destination_category: str) -> bool:
        if not self.service:
            return False
        try:
            file_id = file_id_or_key.replace("gdrive://", "").split("/")[-1]
            file = self.service.files().get(fileId=file_id, fields='parents').execute()
            previous_parents = ",".join(file.get('parents', []))
            new_parent = self._get_or_create_subfolder(destination_category)

            self.service.files().update(
                fileId=file_id,
                addParents=new_parent,
                removeParents=previous_parents,
                fields='id, parents'
            ).execute()
            return True
        except Exception as e:
            logger.error(f"Error moving file in Google Drive: {e}")
            return False

    async def get_metadata(self, file_id_or_key: str) -> Dict[str, Any]:
        if not self.service:
            return {}
        file_id = file_id_or_key.replace("gdrive://", "").split("/")[-1]
        file = self.service.files().get(
            fileId=file_id,
            fields='id, name, mimeType, size, createdTime, modifiedTime'
        ).execute()
        return file

    async def generate_access(self, file_id_or_key: str, expires_in_seconds: int = 3600) -> str:
        # Returns internal streaming route so Google Drive credentials are never exposed
        file_id = file_id_or_key.replace("gdrive://", "").split("/")[-1]
        return f"/api/v1/files/stream/{file_id}"
