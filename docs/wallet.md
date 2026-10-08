# RAGE Cloud — Wallet System & Ledger Design

## 1. Institutional Double-Entry Principle

Every user on RAGE Cloud is provisioned a financial wallet with three distinct balance buckets:
- **`available_balance`**: Unencumbered funds ready for withdrawal request.
- **`pending_balance`**: Earnings awaiting settlement period or milestone review.
- **`locked_balance`**: Funds earmarked during an active withdrawal approval cycle.

---

## 2. Immutable Ledger Invariants

The database strictly prohibits modifying wallet balances without a simultaneous ledger transaction:

```text
[Operation]
  │
  ├── 1. Acquire row-level lock: SELECT * FROM wallets WHERE id = ... FOR UPDATE;
  ├── 2. Update wallet balance
  └── 3. INSERT INTO wallet_transactions (wallet_id, type, amount, status, ...);
```

### Supported Transaction Types:
- `CREATOR_REVENUE`: Revenue from qualified file downloads
- `DOWNLOAD_REVENUE`: Platform-level download distribution
- `VIDEO_REVENUE`: Qualified continuous video watch milestones
- `REFERRAL_REWARD`: Reward for invited creator milestone completion
- `PURCHASE`: Sale of paid creator files
- `WITHDRAWAL`: Cash payouts to bank / UPI accounts
- `REFUND`: Payout rejection refund back to available balance
- `ADJUSTMENT`: Super admin verified adjustments
- `BONUS`: Platform performance awards

---

## 3. Withdrawal State Lifecycle

```text
User Requests Payout
       ↓
Funds moved from available_balance -> locked_balance (Status: PENDING)
       ↓
Super Admin Review
       ├── REJECT -> Funds returned to available_balance (Status: REJECTED)
       └── APPROVE -> Queued for manual bank/UPI dispatch (Status: APPROVED)
             ↓
Manual Payout Completed -> locked_balance deducted, ledger WITHDRAWAL created (Status: COMPLETED)
```
