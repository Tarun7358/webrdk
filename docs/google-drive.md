# RAGE Cloud — Google Drive Storage Integration

## 1. Overview

Google Drive serves as the cost-effective initial object storage backend for RAGE Cloud MVP. It enables storing user files without paying high upfront cloud storage egress bills while keeping the rest of the application completely decoupled from Google APIs.

---

## 2. Setup Guide

### Step 1: Create Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `rage-cloud-mvp`).
3. Under **APIs & Services**, enable the **Google Drive API v3**.

### Step 2: Create a Service Account
1. Go to **IAM & Admin > Service Accounts**.
2. Click **Create Service Account** (e.g., `rage-storage-bot`).
3. Under **Keys**, click **Add Key > Create New Key > JSON**.
4. Download the JSON key file safely.

### Step 3: Setup Google Drive Root Folder
1. In your personal or team Google Drive, create a top-level folder named `RAGE CLOUD STORAGE`.
2. Right-click the folder > **Share** > Add the Service Account email address as **Editor**.
3. Copy the Folder ID from the URL (`https://drive.google.com/drive/folders/{FOLDER_ID}`).

### Step 4: Configure Environment Variables
In your `.env`:
```env
GOOGLE_PROJECT_ID=rage-cloud-mvp
GOOGLE_DRIVE_FOLDER_ID=your-copied-folder-id
GOOGLE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
# Or provide the JSON string directly:
# GOOGLE_SERVICE_ACCOUNT_JSON={"type": "service_account", ...}
STORAGE_BACKEND=google_drive
```

---

## 3. Automated Subfolder Structure

RAGE Cloud automatically provisions subfolders inside the root folder:
```text
RAGE CLOUD ROOT/
├── public/       # Public downloads
├── private/      # Team and private files
├── paid/         # Pay-to-access downloads
└── quarantine/   # Suspicious or copyright-flagged files
```

---

## 4. Local Development Fallback

If `GOOGLE_SERVICE_ACCOUNT_JSON` is not provided, the platform automatically falls back to `LocalStorage` in `./storage_uploads/` without throwing unhandled exceptions.
