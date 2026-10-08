# RAGE Cloud — Authentication & Security Architecture

## 1. Security Overview

RAGE Cloud employs production security standards:
- **Password Hashing:** Passwords hashed with `bcrypt` (and argon2 support) with salt rounds.
- **JWT Authentication:** Dual-token model with Short-lived Access Tokens (60 min) and Refresh Tokens (7 days).
- **Role-Based Access Control (RBAC):** Roles enforced via dependency injection:
  - `SUPER_ADMIN`: Platform-wide governance, settings, user bans, payout approvals
  - `CREATOR`: File upload, share generation, monetization, wallet, team invitations
  - `TEAM_OWNER`: Team workspace management, revenue split configuration
  - `TEAM_MEMBER`: Assigned file management and member revenue earnings
  - `NORMAL_USER`: Public downloads, content purchasing, referral participation
- **Rate Limiting:** Redis-backed sliding window rate limiter with memory fallback.
- **Audit Logging:** Sensitive actions logged with user ID, IP address, target entity, and timestamp.
