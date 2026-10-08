from abc import ABC, abstractmethod
from typing import BinaryIO, Dict, Any, Optional, AsyncIterator

class StorageService(ABC):
    """
    Abstract Storage Service interface.
    Decouples RAGE Cloud application logic from specific storage providers.
    """

    @abstractmethod
    async def upload(
        self,
        file_obj: BinaryIO,
        filename: str,
        mime_type: str,
        folder_category: str = "public",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Uploads file to storage backend.
        Returns dictionary containing:
        {
            "file_id": str (provider-specific ID or key),
            "storage_key": str,
            "size": int,
            "storage_backend": str,
            "url": Optional[str]
        }
        """
        pass

    @abstractmethod
    async def download_stream(self, file_id_or_key: str) -> AsyncIterator[bytes]:
        """
        Streams file contents from storage backend.
        """
        pass

    @abstractmethod
    async def delete(self, file_id_or_key: str) -> bool:
        """
        Deletes a file from storage backend.
        """
        pass

    @abstractmethod
    async def move(self, file_id_or_key: str, destination_category: str) -> bool:
        """
        Moves file to a different folder category (e.g. to 'quarantine').
        """
        pass

    @abstractmethod
    async def get_metadata(self, file_id_or_key: str) -> Dict[str, Any]:
        """
        Retrieves remote storage metadata.
        """
        pass

    @abstractmethod
    async def generate_access(self, file_id_or_key: str, expires_in_seconds: int = 3600) -> str:
        """
        Generates a secure temporary download access URL or token.
        """
        pass
