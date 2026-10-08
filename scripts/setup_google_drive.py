#!/usr/bin/env python3
"""
RAGE Cloud — Google Drive 5TB Storage Setup & OAuth Authenticator
================================================================
Authenticates your 5TB Google Account using your Google Cloud OAuth Client Secret:
client_secret_320388741203-i1nejc0rriqpa4tu1qhfff05cla7fnhn.apps.googleusercontent.com.json

This script:
1. Runs Google OAuth 2.0 flow with offline access (refresh token)
2. Saves `google_token.json` to project root and API directory
3. Verifies connection with Google Drive v3 API
4. Inspects your account's 5TB storage quota
5. Creates or verifies the dedicated 'RAGE_Cloud_Storage' folder
"""

import os
import sys
import json
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

import os
import sys
import json
import argparse
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/drive']

def find_client_secrets_file():
    candidates = [
        os.environ.get("GOOGLE_OAUTH_CLIENT_SECRETS_FILE"),
        r"C:\Users\rdxyz\Downloads\webads\client_secret_320388741203-i1nejc0rriqpa4tu1qhfff05cla7fnhn.apps.googleusercontent.com.json",
        "client_secret_320388741203-i1nejc0rriqpa4tu1qhfff05cla7fnhn.apps.googleusercontent.com.json",
        "../client_secret_320388741203-i1nejc0rriqpa4tu1qhfff05cla7fnhn.apps.googleusercontent.com.json"
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return os.path.abspath(c)
    return None

def main():
    parser = argparse.ArgumentParser(description="RAGE Cloud Google Drive 5TB Storage Authenticator")
    parser.add_argument("--print-url", action="store_true", help="Print the OAuth authorization URL without opening browser")
    parser.add_argument("--code", type=str, help="Exchange an OAuth authorization code manually")
    parser.add_argument("--check-only", action="store_true", help="Check existing token status and storage quota")
    parser.add_argument("--port", type=int, default=8080, help="Local server callback port (default: 8080)")
    args = parser.parse_args()

    print("=" * 70)
    print("   RAGE CLOUD — GOOGLE DRIVE 5TB STORAGE INTEGRATION SETUP")
    print("=" * 70)

    secrets_file = find_client_secrets_file()
    if not secrets_file:
        print("[ERROR] Could not find Google Client Secrets JSON file.")
        print("Please ensure the client_secret_*.json file is in the project directory.")
        sys.exit(1)

    print(f"[+] Found OAuth client secrets file:\n    {secrets_file}\n")

    token_destinations = [
        os.path.abspath("google_token.json"),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "google_token.json")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api", "google_token.json")),
        r"C:\Users\rdxyz\Downloads\webads\google_token.json",
        r"C:\Users\rdxyz\Downloads\webads\apps\api\google_token.json"
    ]

    creds = None
    existing_token = None
    for path in token_destinations:
        if os.path.exists(path):
            existing_token = path
            break

    if existing_token:
        try:
            print(f"[i] Found existing token at: {existing_token}")
            creds = Credentials.from_authorized_user_file(existing_token, SCOPES)
            if creds and creds.expired and creds.refresh_token:
                print("[i] Token expired. Refreshing using Google OAuth refresh token...")
                creds.refresh(Request())
                print("[+] Token refreshed successfully!")
        except Exception as e:
            print(f"[!] Existing token invalid or failed to refresh: {e}")
            creds = None

    if args.check_only:
        if not creds or not creds.valid:
            print("[!] No valid Google Drive credentials found.")
            sys.exit(1)
    elif not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(
            secrets_file,
            scopes=SCOPES,
            redirect_uri=f"http://localhost:{args.port}/"
        )

        if args.print_url:
            auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
            print("[*] Open the following Google OAuth URL in your browser to authorize:")
            print("-" * 70)
            print(auth_url)
            print("-" * 70)
            print("After authorizing, run:")
            print(f"python scripts/setup_google_drive.py --code <YOUR_AUTH_CODE>")
            return

        if args.code:
            flow.fetch_token(code=args.code)
            creds = flow.credentials
        else:
            print("[*] Initiating Google OAuth 2.0 Authorization Flow...")
            print("    A browser window will open for you to sign into your 5TB Google account.")
            print("    Grant Drive permissions to link storage to RAGE Cloud.")
            print("-" * 70)
            try:
                creds = flow.run_local_server(
                    port=args.port,
                    prompt='consent',
                    access_type='offline'
                )
            except Exception as e:
                print(f"[!] Local server on port {args.port} failed: {e}")
                print("[*] Trying with dynamic port...")
                flow = InstalledAppFlow.from_client_secrets_file(
                    secrets_file,
                    scopes=SCOPES
                )
                creds = flow.run_local_server(
                    port=0,
                    prompt='consent',
                    access_type='offline'
                )

    token_json = creds.to_json()
    for dest in set(token_destinations):
        try:
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "w", encoding="utf-8") as f:
                f.write(token_json)
            print(f"[+] Saved authorized token: {dest}")
        except Exception as e:
            pass

    print("\n" + "=" * 70)
    print("   VERIFYING 5TB GOOGLE DRIVE CONNECTION & QUOTA")
    print("=" * 70)

    try:
        drive = build('drive', 'v3', credentials=creds, cache_discovery=False)
        about = drive.about().get(fields='user, storageQuota').execute()
        user = about.get('user', {})
        quota = about.get('storageQuota', {})

        limit_bytes = int(quota.get('limit', 0))
        usage_bytes = int(quota.get('usage', 0))
        limit_gb = round(limit_bytes / (1024**3), 2) if limit_bytes else "Unlimited / Enterprise"
        usage_gb = round(usage_bytes / (1024**3), 2)
        free_gb = round((limit_bytes - usage_bytes) / (1024**3), 2) if limit_bytes else "Unlimited"

        print(f"[+] Connected Google User: {user.get('displayName')} ({user.get('emailAddress')})")
        print(f"[+] Total Storage Quota: {limit_gb} GB ({round(limit_bytes / (1024**4), 2) if limit_bytes else 0} TB)")
        print(f"[+] Used Storage:        {usage_gb} GB")
        print(f"[+] Available Storage:   {free_gb} GB")

        # Check / create root folder
        query = "name = 'RAGE_Cloud_Storage' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        resp = drive.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        files = resp.get('files', [])

        if files:
            folder_id = files[0]['id']
            print(f"[+] Root storage folder verified: 'RAGE_Cloud_Storage' (ID: {folder_id})")
        else:
            folder_meta = {
                'name': 'RAGE_Cloud_Storage',
                'mimeType': 'application/vnd.google-apps.folder'
            }
            folder = drive.files().create(body=folder_meta, fields='id').execute()
            folder_id = folder.get('id')
            print(f"[+] Created root storage folder: 'RAGE_Cloud_Storage' (ID: {folder_id})")

        print("=" * 70)
        print("   SUCCESS! 5TB GOOGLE DRIVE STORAGE IS FULLY OPERATIONAL FOR RAGE CLOUD")
        print("=" * 70)

    except Exception as e:
        print(f"[ERROR] Failed to query Google Drive: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
