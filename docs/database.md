# RAGE Cloud — Database Schema & Data Models

## 1. Relational Model Architecture

RAGE Cloud uses PostgreSQL (with SQLite support for zero-config rapid testing) managed via SQLAlchemy 2.0 async ORM.

### Tables Overview:

| Table Name | Primary Key | Description |
|---|---|---|
| `users` | UUID (string) | Core accounts, role (SUPER_ADMIN, CREATOR, etc.), referral codes |
| `teams` | UUID (string) | Team workspaces owned by creators |
| `team_members` | UUID (string) | Membership and revenue split percentage (sum <= 100%) |
| `files` | UUID (string) | File metadata, checksums, visibility, storage backend |
| `folders` | UUID (string) | Hierarchical folder structures |
| `share_links` | UUID (string) | Short codes (`/d/{code}`), expiration, password hash, limits |
| `downloads` | UUID (string) | Raw download telemetry, hashed IP, device, browser, risk score |
| `qualified_downloads` | UUID (string) | Fraud-cleared downloads credited to creator revenue |
| `video_views` | UUID (string) | Video watch duration telemetry & qualification (10s min) |
| `wallets` | UUID (string) | Available, Pending, and Locked financial balances |
| `wallet_transactions` | UUID (string) | **Immutable Ledger**: Double-entry ledger entries |
| `withdrawal_requests` | UUID (string) | Payout requests (PENDING, APPROVED, COMPLETED, REJECTED) |
| `referrals` | UUID (string) | Referrer-to-referred relationships & reward status |
| `subscription_plans` | UUID (string) | Tier configurations (FREE, PRO, CREATOR_STUDIO) |
| `user_subscriptions` | UUID (string) | Active user subscription state |
| `content_purchases` | UUID (string) | One-time purchases for paid files |
| `ad_placements` | UUID (string) | Dynamic advertisement slots across pages |
| `ad_events` | UUID (string) | Impression and click telemetry |
| `fraud_events` | UUID (string) | High risk anomalies, bot flags, and IP patterns |
| `audit_logs` | UUID (string) | Immutable administrative and sensitive user actions |
| `system_settings` | UUID (string) | Configurable business rules (splits, minimum withdrawal) |

---

## 2. Ledger Integrity Invariant

Balances in the `wallets` table are **never modified directly** via loose arithmetic. All balance changes are executed within an atomic database transaction alongside an explicit record in `wallet_transactions`.
