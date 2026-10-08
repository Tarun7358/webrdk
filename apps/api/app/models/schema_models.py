from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, BigInteger, Float, ForeignKey, Text, DateTime, Index
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel, utc_now

class User(BaseModel):
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="CREATOR", nullable=False) # OWNER, SUPER_ADMIN, CREATOR, TEAM_OWNER, TEAM_MEMBER, NORMAL_USER
    plan_tier = Column(String(50), default="FREE", nullable=False) # FREE, PRO_GAMER, CREATOR_STUDIO
    storage_limit_bytes = Column(BigInteger, default=10 * 1024 * 1024 * 1024, nullable=False) # Default 10GB free
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    referral_code = Column(String(50), unique=True, index=True, nullable=False)
    referred_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    # Relationships
    files = relationship("File", back_populates="owner", cascade="all, delete-orphan")
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    teams_owned = relationship("Team", back_populates="owner")
    team_memberships = relationship("TeamMember", back_populates="user")
    downloads = relationship("Download", back_populates="user")
    purchases = relationship("ContentPurchase", back_populates="user")
    withdrawal_requests = relationship("WithdrawalRequest", back_populates="user")

class Team(BaseModel):
    __tablename__ = "teams"

    name = Column(String(255), nullable=False)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    description = Column(Text, nullable=True)

    owner = relationship("User", back_populates="teams_owned")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    files = relationship("File", back_populates="team")

class TeamMember(BaseModel):
    __tablename__ = "team_members"

    team_id = Column(String(36), ForeignKey("teams.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="MEMBER", nullable=False) # OWNER, ADMIN, MEMBER
    revenue_share_percent = Column(Float, default=0.0, nullable=False) # Must sum <= 100 with team

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")

class Folder(BaseModel):
    __tablename__ = "folders"

    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    parent_id = Column(String(36), ForeignKey("folders.id"), nullable=True)
    name = Column(String(255), nullable=False)

    files = relationship("File", back_populates="folder")

class File(BaseModel):
    __tablename__ = "files"

    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)
    folder_id = Column(String(36), ForeignKey("folders.id"), nullable=True)

    google_drive_file_id = Column(String(255), nullable=True, index=True)
    storage_key = Column(String(500), nullable=True)
    storage_backend = Column(String(50), default="google_drive", nullable=False)

    name = Column(String(255), nullable=False, index=True)
    original_name = Column(String(255), nullable=False)
    mime_type = Column(String(150), nullable=False)
    extension = Column(String(20), nullable=False, index=True)
    size = Column(Integer, nullable=False) # bytes
    checksum = Column(String(64), nullable=False) # SHA-256
    visibility = Column(String(50), default="PUBLIC", nullable=False) # PUBLIC, PRIVATE, UNLISTED, PAID
    status = Column(String(50), default="ACTIVE", nullable=False) # ACTIVE, PROCESSING, QUARANTINED, DELETED
    price = Column(Float, default=0.0, nullable=False) # If PAID

    download_count = Column(Integer, default=0, nullable=False)
    view_count = Column(Integer, default=0, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)

    owner = relationship("User", back_populates="files")
    team = relationship("Team", back_populates="files")
    folder = relationship("Folder", back_populates="files")
    share_links = relationship("ShareLink", back_populates="file", cascade="all, delete-orphan")
    downloads = relationship("Download", back_populates="file", cascade="all, delete-orphan")
    video_views = relationship("VideoView", back_populates="file", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_file_visibility_status", "visibility", "status"),
    )

class ShareLink(BaseModel):
    __tablename__ = "share_links"

    file_id = Column(String(36), ForeignKey("files.id"), nullable=False)
    short_code = Column(String(64), unique=True, index=True, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    password_hash = Column(String(255), nullable=True)
    download_limit = Column(Integer, nullable=True)
    download_count = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    file = relationship("File", back_populates="share_links")

class Download(BaseModel):
    __tablename__ = "downloads"

    file_id = Column(String(36), ForeignKey("files.id"), nullable=False)
    share_link_id = Column(String(36), ForeignKey("share_links.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    ip_hash = Column(String(64), nullable=False, index=True)
    country = Column(String(10), default="XX", nullable=False)
    device = Column(String(50), default="desktop", nullable=False)
    browser = Column(String(50), default="browser", nullable=False)
    bytes_transferred = Column(Integer, default=0, nullable=False)
    completion_status = Column(Boolean, default=False, nullable=False)
    risk_score = Column(Integer, default=0, nullable=False) # 0 to 100

    file = relationship("File", back_populates="downloads")
    user = relationship("User", back_populates="downloads")
    qualified_download = relationship("QualifiedDownload", back_populates="download", uselist=False)

class QualifiedDownload(BaseModel):
    __tablename__ = "qualified_downloads"

    download_id = Column(String(36), ForeignKey("downloads.id"), nullable=False, unique=True)
    file_id = Column(String(36), ForeignKey("files.id"), nullable=False)
    creator_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    team_id = Column(String(36), ForeignKey("teams.id"), nullable=True)
    qualification_status = Column(String(50), default="QUALIFIED", nullable=False)
    fraud_score = Column(Integer, default=0, nullable=False)
    revenue_generated = Column(Float, default=0.0, nullable=False)
    creator_revenue = Column(Float, default=0.0, nullable=False)

    download = relationship("Download", back_populates="qualified_download")

class VideoView(BaseModel):
    __tablename__ = "video_views"

    file_id = Column(String(36), ForeignKey("files.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    ip_hash = Column(String(64), nullable=False, index=True)
    watch_seconds = Column(Integer, default=0, nullable=False)
    completion_percentage = Column(Float, default=0.0, nullable=False)
    is_qualified = Column(Boolean, default=False, nullable=False)
    revenue_generated = Column(Float, default=0.0, nullable=False)
    creator_revenue = Column(Float, default=0.0, nullable=False)

    file = relationship("File", back_populates="video_views")

class Wallet(BaseModel):
    __tablename__ = "wallets"

    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    available_balance = Column(Float, default=0.0, nullable=False)
    pending_balance = Column(Float, default=0.0, nullable=False)
    locked_balance = Column(Float, default=0.0, nullable=False)

    user = relationship("User", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan")
    withdrawals = relationship("WithdrawalRequest", back_populates="wallet")

class WalletTransaction(BaseModel):
    __tablename__ = "wallet_transactions"

    wallet_id = Column(String(36), ForeignKey("wallets.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False) # CREATOR_REVENUE, DOWNLOAD_REVENUE, VIDEO_REVENUE, REFERRAL_REWARD, PURCHASE, WITHDRAWAL, REFUND, ADJUSTMENT, BONUS
    amount = Column(Float, nullable=False) # positive for credit, negative for debit
    currency = Column(String(10), default="INR", nullable=False)
    reference_type = Column(String(50), nullable=True) # download, video, purchase, withdrawal, referral
    reference_id = Column(String(100), nullable=True)
    description = Column(String(500), nullable=False)
    status = Column(String(50), default="COMPLETED", nullable=False) # PENDING, COMPLETED, FAILED, CANCELLED

    wallet = relationship("Wallet", back_populates="transactions")

class WithdrawalRequest(BaseModel):
    __tablename__ = "withdrawal_requests"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    wallet_id = Column(String(36), ForeignKey("wallets.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    payout_method = Column(String(50), default="UPI", nullable=False) # UPI, BANK_TRANSFER, CRYPTO, MANUAL
    payout_details = Column(Text, nullable=False) # JSON string of account / UPI ID
    status = Column(String(50), default="PENDING", nullable=False) # PENDING, APPROVED, PROCESSING, COMPLETED, REJECTED, CANCELLED
    admin_note = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="withdrawal_requests")
    wallet = relationship("Wallet", back_populates="withdrawals")

class ReferralRecord(BaseModel):
    __tablename__ = "referrals"

    referrer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    referred_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    status = Column(String(50), default="REGISTERED", nullable=False) # REGISTERED, QUALIFIED, REWARDED
    reward_amount = Column(Float, default=0.0, nullable=False)

class SubscriptionPlan(BaseModel):
    __tablename__ = "subscription_plans"

    name = Column(String(100), nullable=False) # FREE, PRO, CREATOR_STUDIO
    tier = Column(String(50), nullable=False, unique=True)
    price = Column(Float, default=0.0, nullable=False)
    storage_quota_bytes = Column(Integer, default=10737418240, nullable=False) # 10GB default
    max_file_size = Column(Integer, default=1073741824, nullable=False) # 1GB
    no_ads = Column(Boolean, default=False, nullable=False)
    priority_download = Column(Boolean, default=False, nullable=False)
    features_json = Column(Text, nullable=True)

class UserSubscription(BaseModel):
    __tablename__ = "user_subscriptions"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    plan_id = Column(String(36), ForeignKey("subscription_plans.id"), nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)
    expires_at = Column(DateTime, nullable=True)

class ContentPurchase(BaseModel):
    __tablename__ = "content_purchases"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    file_id = Column(String(36), ForeignKey("files.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    transaction_ref = Column(String(100), nullable=False, unique=True)
    status = Column(String(50), default="COMPLETED", nullable=False)

    user = relationship("User", back_populates="purchases")

class AdPlacement(BaseModel):
    __tablename__ = "ad_placements"

    provider = Column(String(50), default="mock", nullable=False)
    placement = Column(String(100), unique=True, nullable=False) # download_top, download_middle, download_bottom, video_page, dashboard, public_file_page
    status = Column(String(50), default="ACTIVE", nullable=False)
    estimated_cpm = Column(Float, default=15.0, nullable=False) # INR CPM per 1000 impressions
    impressions = Column(Integer, default=0, nullable=False)
    clicks = Column(Integer, default=0, nullable=False)

class AdEvent(BaseModel):
    __tablename__ = "ad_events"

    placement_id = Column(String(36), ForeignKey("ad_placements.id"), nullable=False)
    ip_hash = Column(String(64), nullable=False)
    event_type = Column(String(50), default="IMPRESSION", nullable=False) # IMPRESSION, CLICK
    revenue = Column(Float, default=0.015, nullable=False)

class FraudEvent(BaseModel):
    __tablename__ = "fraud_events"

    ip_hash = Column(String(64), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    event_type = Column(String(100), nullable=False)
    risk_score = Column(Integer, default=0, nullable=False)
    details = Column(Text, nullable=True)
    flagged_at = Column(DateTime, default=utc_now, nullable=False)

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    target_type = Column(String(100), nullable=True)
    target_id = Column(String(100), nullable=True)
    ip_address = Column(String(64), nullable=True)
    details = Column(Text, nullable=True)

class SystemSetting(BaseModel):
    __tablename__ = "system_settings"

    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(500), nullable=False)
    description = Column(String(255), nullable=True)

class PasswordResetOTP(BaseModel):
    __tablename__ = "password_reset_otps"

    email = Column(String(255), index=True, nullable=False)
    otp_code = Column(String(10), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)

class SubscriptionRequest(BaseModel):
    __tablename__ = "subscription_requests"

    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    user_email = Column(String(255), nullable=False, index=True)
    plan_tier = Column(String(50), nullable=False) # PRO_GAMER, CREATOR_STUDIO
    plan_name = Column(String(100), nullable=False)
    amount_inr = Column(Float, nullable=False)
    storage_gb = Column(Integer, nullable=False)
    utr_number = Column(String(100), nullable=False, index=True)
    proof_image_data = Column(Text, nullable=True) # Data URL or Storage Reference
    status = Column(String(50), default="PENDING", nullable=False, index=True) # PENDING, APPROVED, REJECTED
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    review_note = Column(Text, nullable=True)

