from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

class ConnectInstagramRequest(BaseModel):
    instagram_business_id: Optional[str] = None
    facebook_page_id: Optional[str] = None
    username: str
    access_token: Optional[str] = None
    hourly_limit: Optional[int] = 20
    daily_limit: Optional[int] = 60

class ConnectInstagramSessionRequest(BaseModel):
    session_id: str
    username: Optional[str] = None
    hourly_limit: Optional[int] = 20
    daily_limit: Optional[int] = 60

class ConnectInstagramLoginRequest(BaseModel):
    username: str
    password: str
    two_factor_code: Optional[str] = None
    two_factor_identifier: Optional[str] = None
    hourly_limit: Optional[int] = 20
    daily_limit: Optional[int] = 60

class InstagramAccountResponse(BaseModel):
    id: str
    username: str
    instagram_business_id: Optional[str] = None
    facebook_page_id: Optional[str] = None
    profile_picture_url: Optional[str] = None
    connection_type: str = "SESSION"
    is_active: bool
    hourly_limit: int
    daily_limit: int
    dms_sent_today: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InstagramCampaignCreate(BaseModel):
    file_id: str
    title: str
    post_url: Optional[str] = None # Optional Reel or Post URL
    target_mode: str = "SPECIFIC" # SPECIFIC, ANY, NEXT
    trigger_keywords: str # e.g. "ob55, apk, download, link"
    dm_templates: List[str] # List of spintax variations
    reply_comments: Optional[List[str]] = None # List of public comment replies
    send_comment_reply: bool = True

class InstagramCampaignUpdate(BaseModel):
    title: Optional[str] = None
    post_url: Optional[str] = None
    target_mode: Optional[str] = None
    trigger_keywords: Optional[str] = None
    dm_templates: Optional[List[str]] = None
    reply_comments: Optional[List[str]] = None
    send_comment_reply: Optional[bool] = None
    is_active: Optional[bool] = None

class InstagramCampaignResponse(BaseModel):
    id: str
    file_id: str
    file_name: Optional[str] = None
    title: str
    post_url: Optional[str] = None
    target_mode: str = "SPECIFIC"
    trigger_keywords: str
    dm_templates: List[str]
    reply_comments: List[str]
    send_comment_reply: bool
    is_active: bool
    total_dms_sent: int
    last_scanned_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InstagramDmLogResponse(BaseModel):
    id: str
    campaign_id: str
    recipient_ig_id: str
    recipient_username: Optional[str] = None
    comment_text: Optional[str] = None
    dm_text_sent: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
