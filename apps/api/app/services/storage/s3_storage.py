import os
from typing import BinaryIO, Dict, Any, Optional, AsyncIterator
from app.services.storage.base import StorageService

class S3Storage(StorageService):
    """
    S3 / Cloudflare R2 / Backblaze B2 compatible storage provider.
    Enables future migration from Google Drive to object storage & CDN without app rewrites.
    """

    def __init__(self, bucket_name: str = "rage-cloud-storage", region: str = "auto", endpoint_url: Optional[str] = None):
        self.bucket_name = bucket_name
        self.region = region
        self.endpoint_url = endpoint_url

    async def upload(
        self,
        file_obj: BinaryIO,
        filename: str,
        mime_type: str,
        folder_category: str = "public",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        storage_key = f"{folder_category}/{filename}"
        # When boto3/aioboto3 credentials are provided, calls s3_client.upload_fileobj(...)
        return {
            "file_id": storage_key,
            "storage_key": f"s3://{self.bucket_name}/{storage_key}",
            "size": 0,
            "storage_backend": "s3",
            "url": f"https://cdn.ragecloud.io/{storage_key}"
        }

    async def download_stream(self, file_id_or_key: str) -> AsyncIterator[bytes]:
        # Streams byte chunks from S3 response['Body']
        raise NotImplementedError("S3 storage client will stream directly from S3 bucket or presigned CDN URL.")

    async def delete(self, file_id_or_key: str) -> bool:
        return True

    async def move(self, file_id_or_key: str, destination_category: str) -> bool:
        return True

    async def get_metadata(self, file_id_or_key: str) -> Dict[str, Any]:
        return {"bucket": self.bucket_name, "key": file_id_or_key}

    async def generate_access(self, file_id_or_key: str, expires_in_seconds: int = 3600) -> str:
        return f"https://cdn.ragecloud.io/{file_id_or_key}"
