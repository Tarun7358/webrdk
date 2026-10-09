from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# ----------------- AUTH SCHEMAS -----------------
class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    referral_code: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserSummaryResponse"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserSummaryResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    plan_tier: Optional[str] = "FREE"
    storage_limit_bytes: Optional[int] = 10737418240
    storage_used_bytes: Optional[int] = 0
    is_active: bool
    is_verified: bool
    referral_code: str
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- FILE SCHEMAS -----------------
class FileResponse(BaseModel):
    id: str
    name: str
    original_name: str
    mime_type: str
    extension: str
    size: int
    checksum: str
    visibility: str
    status: str
    price: float
    download_count: int
    view_count: int
    storage_backend: str
    created_at: datetime
    updated_at: datetime
    owner_id: str
    team_id: Optional[str] = None
    folder_id: Optional[str] = None
    share_url: Optional[str] = None
    short_code: Optional[str] = None
    download_limit: Optional[int] = None
    link_download_count: Optional[int] = 0
    expires_at: Optional[datetime] = None
    is_password_protected: Optional[bool] = False

    class Config:
        from_attributes = True

class FileUpdateRequest(BaseModel):
    name: Optional[str] = None
    visibility: Optional[str] = None # PUBLIC, PRIVATE, UNLISTED, PAID
    price: Optional[float] = None
    folder_id: Optional[str] = None
    # Share link configuration
    password: Optional[str] = None
    clear_password: Optional[bool] = False
    expires_in_hours: Optional[int] = None # Positive integer = hours until expiry; None / 0 with unlimited_expiry = None
    unlimited_expiry: Optional[bool] = False
    download_limit: Optional[int] = None # Positive integer = download cap; None / 0 with unlimited_downloads = None
    unlimited_downloads: Optional[bool] = False
    reset_link: Optional[bool] = False # True = generate fresh short_code
    reset_download_count: Optional[bool] = False # True = reset link download count

class ShareLinkCreateRequest(BaseModel):
    file_id: str
    password: Optional[str] = None
    expires_in_hours: Optional[int] = None
    download_limit: Optional[int] = None

class ShareLinkResponse(BaseModel):
    id: str
    file_id: str
    short_code: str
    is_password_protected: bool
    expires_at: Optional[datetime] = None
    download_limit: Optional[int] = None
    download_count: int
    is_active: bool
    created_at: datetime
    share_url: str

class PublicDownloadPageResponse(BaseModel):
    short_code: str
    file_id: str
    file_name: str
    size: int
    mime_type: str
    extension: str
    upload_date: datetime
    creator_name: str
    is_password_protected: bool
    is_paid: bool
    price: float
    is_video: bool
    download_count: int
    ad_placements: List[Dict[str, Any]]

class DownloadUnlockRequest(BaseModel):
    password: Optional[str] = None

# ----------------- WALLET & LEDGER SCHEMAS -----------------
class WalletResponse(BaseModel):
    id: str
    user_id: str
    currency: str
    available_balance: float
    pending_balance: float
    locked_balance: float
    total_balance: float

class WalletTransactionResponse(BaseModel):
    id: str
    type: str
    amount: float
    currency: str
    reference_type: Optional[str]
    reference_id: Optional[str]
    description: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class WithdrawalCreateRequest(BaseModel):
    amount: float = Field(gt=0)
    payout_method: str = "UPI" # UPI, BANK_TRANSFER, CRYPTO, MANUAL
    payout_details: Dict[str, Any]

class WithdrawalResponse(BaseModel):
    id: str
    user_id: str
    amount: float
    currency: str
    payout_method: str
    payout_details: str
    status: str
    admin_note: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WithdrawalAdminActionRequest(BaseModel):
    action: str # APPROVE, REJECT, COMPLETE
    admin_note: Optional[str] = None

# ----------------- TEAM SCHEMAS -----------------
class TeamCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

class TeamMemberAddRequest(BaseModel):
    email: EmailStr
    role: str = "MEMBER"
    revenue_share_percent: float = Field(ge=0, le=100)

class TeamRevenueRuleUpdate(BaseModel):
    members_split: List[Dict[str, float]] # [{"user_id": "...", "percent": 40.0}]

# ----------------- ANALYTICS & REVENUE SCHEMAS -----------------
class CreatorDashboardResponse(BaseModel):
    total_files: int
    total_downloads: int
    qualified_downloads: int
    total_views: int
    qualified_views: int
    total_revenue: float
    pending_revenue: float
    available_balance: float
    referral_earnings: float
    rpm: float # Revenue per 1000 qualified events
    recent_activity: List[Dict[str, Any]]
    daily_stats: List[Dict[str, Any]]
    top_files: List[Dict[str, Any]]

class AdminDashboardResponse(BaseModel):
    total_users: int
    active_users: int
    total_creators: int
    total_teams: int
    total_files: int
    total_storage_bytes: int
    total_downloads: int
    qualified_downloads: int
    platform_revenue: float
    creator_payouts_distributed: float
    pending_withdrawals_count: int
    pending_withdrawals_amount: float
    fraud_alerts_count: int
    recent_audit_logs: List[Dict[str, Any]]
    monetization_settings: Dict[str, Any]

# ----------------- CONTENT PURCHASE & SUBSCRIPTION -----------------
class PurchaseContentRequest(BaseModel):
    file_id: str
    payment_method: str = "simulated_gateway"

class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    tier: str
    price: float
    storage_quota_bytes: int
    max_file_size: int
    no_ads: bool
    priority_download: bool
    features: List[str]

    class Config:
        from_attributes = True

# ----------------- PASSWORD RESET & SUBSCRIPTION REQUEST SCHEMAS -----------------
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str = Field(min_length=8)

class SubscriptionRequestCreate(BaseModel):
    plan_tier: str # PRO_GAMER, CREATOR_STUDIO
    plan_name: str
    amount_inr: float
    storage_gb: int
    utr_number: str
    proof_image_data: Optional[str] = None # Base64 Data URL or storage ref

class SubscriptionRequestResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    plan_tier: str
    plan_name: str
    amount_inr: float
    storage_gb: int
    utr_number: str
    proof_image_data: Optional[str] = None
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None

    class Config:
        from_attributes = True

class SubscriptionReviewRequest(BaseModel):
    action: str # APPROVE or REJECT
    review_note: Optional[str] = None

# ----------------- OWNER METRICS & EARNINGS SCHEMAS -----------------
class OwnerUserEarning(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    plan_tier: str
    storage_used_bytes: int
    storage_limit_bytes: int
    total_files: int
    daily_earnings: float
    lifetime_earnings: float
    available_balance: float
    created_at: datetime

class OwnerStatsResponse(BaseModel):
    total_users: int
    total_files: int
    total_storage_bytes: int
    pending_subscription_count: int
    users: List[OwnerUserEarning]

