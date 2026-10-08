# RAGE Cloud — System Architecture

## 1. Architectural Overview

RAGE Cloud is built as a modular, creator-focused cloud file distribution and monetization platform designed for high throughput, minimal initial infrastructure overhead, and institutional-grade ledger integrity.

```text
┌────────────────┐          ┌───────────────────────┐          ┌─────────────────────┐
│  React 19 SPA  │ ◄──────► │  FastAPI REST Engine  │ ◄──────► │ PostgreSQL Database │
│ (Dark Gamer UI)│          │ (Async Python 3.12)   │          │ (Immutable Ledger)  │
└────────────────┘          └───────────┬───────────┘          └─────────────────────┘
                                        │
                                        ▼
                             ┌───────────────────────┐
                             │ StorageService Layer  │
                             │ (Pluggable Interface) │
                             └───────────┬───────────┘
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                 ▼
             ┌─────────────────────┐           ┌─────────────────────┐
             │ GoogleDriveStorage  │           │   Future: S3 / R2   │
             │ (Service Account v3)│           │   (Object Storage)  │
             └─────────────────────┘           └─────────────────────┘
```

---

## 2. Decoupled Storage Provider Architecture

Application routes never communicate directly with Google Drive SDK or S3 SDKs. All operations are dispatched through the abstract `StorageService` contract:

```python
class StorageService(ABC):
    async def upload(self, file_obj, filename, mime_type, folder_category, metadata) -> Dict: ...
    async def download_stream(self, file_id_or_key) -> AsyncIterator[bytes]: ...
    async def delete(self, file_id_or_key) -> bool: ...
    async def move(self, file_id_or_key, destination_category) -> bool: ...
    async def get_metadata(self, file_id_or_key) -> Dict: ...
    async def generate_access(self, file_id_or_key, expires_in_seconds) -> str: ...
```

### Implementations:
1. **`GoogleDriveStorage`**: Uses Google Drive API v3 via Google Service Account authentication to ingest and stream files inside a organized root folder hierarchy (`/public`, `/private`, `/paid`, `/teams`, `/quarantine`).
2. **`LocalStorage`**: High-performance local filesystem provider that seamlessly activates whenever Google Cloud credentials are not configured or in offline test environments.
3. **`S3Storage`**: Standardized blueprint for zero-friction migration to AWS S3, Cloudflare R2, or Backblaze B2 Object Storage + Global CDN without rewriting application code.

---

## 3. Request Flow & Traffic Lifecycle

```text
Creator Upload:
Client -> Multipart POST /api/v1/files/upload -> SHA-256 Checksum -> StorageService -> Metadata DB -> ShareLink

Public Download:
Visitor -> Public Link /d/{code} -> Fraud Analysis & Risk Score (0-100) -> 
   [If Qualified] -> RevenueEngine -> Wallet Credit Transaction ->
   Direct Secure Stream -> Completion Recorded
```
