import logging
from app.core.config import settings
from app.services.storage.base import StorageService
from app.services.storage.google_drive import GoogleDriveStorage
from app.services.storage.local_storage import LocalStorage
from app.services.storage.s3_storage import S3Storage

logger = logging.getLogger("rage.storage.factory")

_storage_instance: StorageService = None

def get_storage_service() -> StorageService:
    global _storage_instance
    if _storage_instance is not None:
        return _storage_instance

    backend = settings.STORAGE_BACKEND.lower()

    if backend == "google_drive":
        gdrive = GoogleDriveStorage()
        if gdrive.is_configured():
            logger.info("Using GoogleDriveStorage as primary storage provider.")
            _storage_instance = gdrive
        else:
            logger.warning(
                "Google Drive credentials not detected or incomplete. "
                "Falling back to LocalStorage provider for seamless local operation."
            )
            _storage_instance = LocalStorage()
    elif backend == "s3":
        _storage_instance = S3Storage()
    else:
        _storage_instance = LocalStorage()

    return _storage_instance
