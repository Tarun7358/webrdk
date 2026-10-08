# RAGE Cloud — REST API Reference

Full interactive Swagger/OpenAPI documentation is available at `http://localhost:8000/docs`.

## Key Endpoints

### 1. Authentication (`/api/v1/auth`)
- `POST /register`: Register new creator account, provision wallet, process referral
- `POST /login`: Authenticate with email and password, returns JWT tokens
- `POST /refresh`: Refresh access token
- `GET /me`: Fetch profile for active user

### 2. Files (`/api/v1/files`)
- `POST /upload`: Multipart upload with checksum validation and storage dispatch
- `GET /`: List files for current user with search & visibility filters
- `GET /{id}`: Fetch file metadata
- `PATCH /{id}`: Update file name, visibility, or price
- `DELETE /{id}`: Delete file from storage and database
- `GET /stream/{id}`: Stream file content safely

### 3. Share Links (`/api/v1/shares`)
- `POST /`: Create share link with short code, password, and expiration
- `GET /d/{short_code}`: Public view metadata for download page
- `POST /d/{short_code}/verify`: Verify password for locked share link

### 4. Downloads (`/api/v1/download`)
- `GET /{short_code}`: Download file through share link with fraud evaluation and qualified revenue attribution

### 5. Videos (`/api/v1/videos`)
- `POST /track`: Track watch seconds; qualifies creator revenue at 10s

### 6. Creator Dashboard (`/api/v1/creator`)
- `GET /dashboard`: Aggregate analytics, qualified traffic percentage, RPM, charts

### 7. Wallet & Ledger (`/api/v1/wallet`)
- `GET /`: Available, pending, and locked balances
- `GET /transactions`: Immutable transaction ledger history
- `POST /withdraw`: Submit payout request
- `GET /withdrawals`: List user's payout requests

### 8. Teams (`/api/v1/teams`)
- `POST /`: Create team
- `GET /`: List user's teams
- `POST /{id}/members`: Invite team member
- `PUT /{id}/revenue-split`: Update member splits (sum <= 100%)

### 9. Super Admin (`/api/v1/admin`)
- `GET /stats`: Platform-wide financials, storage, and fraud metrics
- `GET /users` & `PATCH /users/{id}/status`: User management
- `GET /withdrawals` & `POST /withdrawals/{id}/action`: Payout approval queue
- `GET /settings` & `PUT /settings`: Configure platform monetization rules
- `GET /fraud-alerts`: View flagged bot/fraud activity
- `GET /audit-logs`: View system audit trail
