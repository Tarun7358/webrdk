import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash
from app.core.dependencies import get_current_user, rate_limit_dependency
from app.models.schema_models import User, File, ShareLink, ContentPurchase
from app.schemas.all_schemas import (
    ShareLinkCreateRequest, ShareLinkResponse, PublicDownloadPageResponse,
    DownloadUnlockRequest
)
from app.services.ad.service import AdService
from app.services.audit.service import AuditService

router = APIRouter(prefix="/shares", tags=["Share Links"], dependencies=[Depends(rate_limit_dependency)])

def generate_short_code(length: int = 8) -> str:
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

@router.post("/", response_model=ShareLinkResponse)
async def create_share_link(
    req: ShareLinkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(File).where(
        File.id == req.file_id,
        or_(File.is_deleted == False, File.is_deleted.is_(None)),
        File.status != "DELETED"
    )
    res = await db.execute(stmt)
    file = res.scalar_one_or_none()

    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    if file.owner_id != current_user.id and current_user.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Permission denied")

    short_code = generate_short_code()
    # Ensure uniqueness
    while True:
        c_stmt = select(ShareLink).where(ShareLink.short_code == short_code)
        c_res = await db.execute(c_stmt)
        if not c_res.scalar_one_or_none():
            break
        short_code = generate_short_code()

    # None or 0 means UNLIMITED (never expires)
    expires_at = None
    if req.expires_in_hours and req.expires_in_hours > 0:
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=req.expires_in_hours)).replace(tzinfo=None)

    pw_hash = get_password_hash(req.password) if req.password else None

    share_link = ShareLink(
        file_id=file.id,
        short_code=short_code,
        created_by=current_user.id,
        expires_at=expires_at,
        password_hash=pw_hash,
        download_limit=req.download_limit,
        is_active=True
    )
    db.add(share_link)
    await db.commit()
    await db.refresh(share_link)

    return ShareLinkResponse(
        id=share_link.id,
        file_id=file.id,
        short_code=short_code,
        is_password_protected=pw_hash is not None,
        expires_at=share_link.expires_at,
        download_limit=share_link.download_limit,
        download_count=share_link.download_count,
        is_active=share_link.is_active,
        created_at=share_link.created_at,
        share_url=f"/d/{short_code}"
    )

@router.get("/d/{short_code}", response_model=PublicDownloadPageResponse)
async def get_public_download_page_data(
    short_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Public landing page metadata for a share link.
    Returns file details and ad placements while keeping storage credentials hidden.
    """
    stmt = select(ShareLink, File, User).join(
        File, ShareLink.file_id == File.id
    ).join(
        User, File.owner_id == User.id
    ).where(ShareLink.short_code == short_code, ShareLink.is_active == True)

    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Shared file not found or link deactivated")

    share_link, file, creator = row

    if share_link.expires_at and share_link.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(status_code=410, detail="This share link has expired")

    if share_link.download_limit and share_link.download_count >= share_link.download_limit:
        raise HTTPException(status_code=410, detail="This share link has reached its maximum download limit")

    is_video = file.mime_type.startswith("video/") or file.extension in ["mp4", "webm", "mov", "mkv"]
    ads = await AdService.get_active_placements_for_page("download", db)

    return PublicDownloadPageResponse(
        short_code=short_code,
        file_id=file.id,
        file_name=file.name,
        size=file.size,
        mime_type=file.mime_type,
        extension=file.extension,
        upload_date=file.created_at,
        creator_name=creator.full_name,
        is_password_protected=share_link.password_hash is not None,
        is_paid=file.visibility == "PAID",
        price=file.price,
        is_video=is_video,
        download_count=file.download_count,
        ad_placements=ads
    )

@router.post("/d/{short_code}/verify")
async def verify_share_password(
    short_code: str,
    req: DownloadUnlockRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ShareLink).where(ShareLink.short_code == short_code, ShareLink.is_active == True)
    res = await db.execute(stmt)
    link = res.scalar_one_or_none()

    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    if not link.password_hash:
        return {"unlocked": True}

    if not req.password or not verify_password(req.password, link.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password for this file.")

    return {"unlocked": True, "token": f"unlocked_{link.short_code}"}
