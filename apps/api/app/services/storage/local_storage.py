import os
import uuid
import shutil
import aiofiles
from typing import BinaryIO, Dict, Any, Optional, AsyncIterator
from app.services.storage.base import StorageService
from app.core.config import settings

class LocalStorage(StorageService):
    """
    Local filesystem storage provider for offline development & testing.
    Maintains identical folder organization: users, teams, public, private, paid, quarantine.
    """

    def __init__(self, base_dir: str = settings.LOCAL_STORAGE_DIR):
        self.base_dir = os.path.abspath(base_dir)
        self._ensure_folders()

    def _ensure_folders(self):
        categories = ["users", "teams", "public", "private", "paid", "quarantine"]
        for cat in categories:
            os.makedirs(os.path.join(self.base_dir, cat), exist_ok=True)

    async def upload(
        self,
        file_obj: BinaryIO,
        filename: str,
        mime_type: str,
        folder_category: str = "public",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        file_id = f"local_{uuid.uuid4().hex}"
        category_dir = os.path.join(self.base_dir, folder_category)
        os.makedirs(category_dir, exist_ok=True)
        dest_path = os.path.join(category_dir, f"{file_id}_{filename}")

        file_obj.seek(0)
        async with aiofiles.open(dest_path, "wb") as f:
            while chunk := file_obj.read(1024 * 1024):
                await f.write(chunk)

        file_size = os.path.getsize(dest_path)
        storage_key = f"local://{folder_category}/{file_id}_{filename}"

        return {
            "file_id": file_id,
            "storage_key": storage_key,
            "size": file_size,
            "storage_backend": "local",
            "url": f"/api/v1/files/stream/{file_id}"
        }

    def _resolve_path(self, file_id_or_key: str) -> Optional[str]:
        if not file_id_or_key:
            return None

        # Clean "local://" protocol prefix if present
        clean_key = file_id_or_key.replace("local://", "").strip()

        # 1. Direct match relative to base_dir
        direct = os.path.join(self.base_dir, clean_key)
        if os.path.exists(direct) and os.path.isfile(direct):
            return direct

        # 2. Extract basename
        basename = os.path.basename(clean_key)
        direct_base = os.path.join(self.base_dir, basename)
        if os.path.exists(direct_base) and os.path.isfile(direct_base):
            return direct_base

        # 3. Search across all category folders in base_dir
        for root, _, files in os.walk(self.base_dir):
            for file in files:
                if file == basename or file == clean_key:
                    return os.path.join(root, file)
                if basename and (file.startswith(basename) or basename in file):
                    return os.path.join(root, file)
                # Check for UUID / local_ prefix
                if "_" in basename:
                    prefix_parts = basename.split("_")
                    if len(prefix_parts) >= 2:
                        token = f"{prefix_parts[0]}_{prefix_parts[1]}"
                        if file.startswith(token):
                            return os.path.join(root, file)

        return None

    async def download_stream(self, file_id_or_key: str) -> AsyncIterator[bytes]:
        path = self._resolve_path(file_id_or_key)
        if not path or not os.path.exists(path):
            raise FileNotFoundError(f"Local file not found for key: {file_id_or_key}")

        async with aiofiles.open(path, "rb") as f:
            while chunk := await f.read(1024 * 1024):
                yield chunk

    async def delete(self, file_id_or_key: str) -> bool:
        path = self._resolve_path(file_id_or_key)
        if path and os.path.exists(path):
            os.remove(path)
            return True
        return False

    async def move(self, file_id_or_key: str, destination_category: str) -> bool:
        path = self._resolve_path(file_id_or_key)
        if not path or not os.path.exists(path):
            return False
        dest_dir = os.path.join(self.base_dir, destination_category)
        os.makedirs(dest_dir, exist_ok=True)
        shutil.move(path, os.path.join(dest_dir, os.path.basename(path)))
        return True

    async def get_metadata(self, file_id_or_key: str) -> Dict[str, Any]:
        path = self._resolve_path(file_id_or_key)
        if not path or not os.path.exists(path):
            return {}
        stat = os.stat(path)
        return {
            "name": os.path.basename(path),
            "size": stat.st_size,
            "modifiedTime": stat.st_mtime
        }

    async def generate_access(self, file_id_or_key: str, expires_in_seconds: int = 3600) -> str:
        return f"/api/v1/files/stream/{file_id_or_key}"
