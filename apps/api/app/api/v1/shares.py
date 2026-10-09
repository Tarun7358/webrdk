import os
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import HTMLResponse, FileResponse as StarletteFileResponse
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
    download_limit = req.download_limit if (req.download_limit and req.download_limit > 0) else None

    share_link = ShareLink(
        file_id=file.id,
        short_code=short_code,
        created_by=current_user.id,
        expires_at=expires_at,
        password_hash=pw_hash,
        download_limit=download_limit,
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
    ).where(
        ShareLink.short_code == short_code,
        ShareLink.is_active == True,
        or_(File.is_deleted == False, File.is_deleted.is_(None)),
        File.status != "DELETED"
    )

    res = await db.execute(stmt)
    row = res.first()

    if not row:
        # Check if short_code was provided as file id
        f_stmt = select(File, User).join(User, File.owner_id == User.id).where(
            File.id == short_code,
            or_(File.is_deleted == False, File.is_deleted.is_(None)),
            File.status != "DELETED"
        )
        f_res = await db.execute(f_stmt)
        f_row = f_res.first()
        if f_row:
            file_obj, creator_obj = f_row
            sl_stmt = select(ShareLink).where(
                ShareLink.file_id == file_obj.id,
                ShareLink.is_active == True
            ).order_by(ShareLink.created_at.desc())
            sl_res = await db.execute(sl_stmt)
            share_link = sl_res.scalars().first()
            if not share_link:
                sc = generate_short_code()
                share_link = ShareLink(
                    file_id=file_obj.id,
                    short_code=sc,
                    created_by=creator_obj.id,
                    expires_at=None,
                    download_limit=None,
                    is_active=True
                )
                db.add(share_link)
                await db.commit()
                await db.refresh(share_link)
            row = (share_link, file_obj, creator_obj)

    if not row:
        raise HTTPException(status_code=404, detail="Shared file not found or link deactivated")

    share_link, file, creator = row

    if share_link.expires_at and share_link.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        raise HTTPException(status_code=410, detail="This share link has expired")

    if share_link.download_limit and share_link.download_limit > 0 and share_link.download_count >= share_link.download_limit:
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
        # Fallback if file_id was supplied
        stmt_f = select(ShareLink).where(ShareLink.file_id == short_code, ShareLink.is_active == True).order_by(ShareLink.created_at.desc())
        res_f = await db.execute(stmt_f)
        link = res_f.scalars().first()

    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")

    if not link.password_hash:
        return {"unlocked": True}

    if not req.password or not verify_password(req.password, link.password_hash):
        raise HTTPException(status_code=401, detail="Invalid password for this file.")

    return {"unlocked": True, "token": f"unlocked_{link.short_code}"}

@router.get("/banner/{short_code}")
@router.get("/banner")
async def get_share_banner_image(short_code: Optional[str] = None):
    """
    Returns the rich file preview image banner (3D document with zipper on cloud background).
    """
    asset_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "assets")
    banner_path = os.path.join(asset_dir, "file_banner.jpg")
    if os.path.exists(banner_path):
        return StarletteFileResponse(
            path=banner_path,
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=86400"}
        )
    raise HTTPException(status_code=404, detail="Preview banner image not found")

@router.get("/preview/{short_code}", response_class=HTMLResponse)
async def get_share_preview_html(
    short_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Renders an HTML document containing OpenGraph and Twitter Card tags.
    When a user pastes a link into Telegram, WhatsApp, Discord, or Twitter,
    the crawler receives these tags to display the large banner preview.
    """
    stmt = select(ShareLink, File).join(
        File, ShareLink.file_id == File.id
    ).where(
        ShareLink.short_code == short_code,
        ShareLink.is_active == True,
        or_(File.is_deleted == False, File.is_deleted.is_(None)),
        File.status != "DELETED"
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        stmt_f = select(File).where(
            File.id == short_code,
            or_(File.is_deleted == False, File.is_deleted.is_(None)),
            File.status != "DELETED"
        )
        res_f = await db.execute(stmt_f)
        f_obj = res_f.scalar_one_or_none()
        if f_obj:
            sl_stmt = select(ShareLink).where(
                ShareLink.file_id == f_obj.id,
                ShareLink.is_active == True
            ).order_by(ShareLink.created_at.desc())
            sl_res = await db.execute(sl_stmt)
            sl_obj = sl_res.scalars().first()
            if sl_obj:
                row = (sl_obj, f_obj)

    if not row:
        raise HTTPException(status_code=404, detail="Shared file not found or has been deleted")

    file_name = row[1].name
    file_size_mb = f"{(row[1].size / (1024 * 1024)):.2f} MB"
    ext = row[1].extension.upper()

    base_url = str(request.base_url).rstrip("/")
    frontend_origin = "https://rdkcloudservices.netlify.app"
    frontend_url = f"{frontend_origin}/d/{short_code}"
    # Use reliable HTTPS CDN URL for the preview banner
    banner_url = f"{frontend_origin}/file_banner.jpg"
    desc_text = f"{ext} • {file_size_mb} • High-Speed Cloud Download"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{file_name}</title>
    <meta name="description" content="{desc_text}">

    <!-- Open Graph (Telegram, WhatsApp, Facebook, Discord) -->
    <meta property="og:site_name" content="RAGE Cloud">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{file_name}">
    <meta property="og:description" content="{desc_text}">
    <meta property="og:url" content="{frontend_url}">
    <meta property="og:image" content="{banner_url}">
    <meta property="og:image:secure_url" content="{banner_url}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1024">
    <meta property="og:image:height" content="1024">

    <!-- Twitter Card (Large Summary Card) -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{file_name}">
    <meta name="twitter:description" content="{desc_text}">
    <meta name="twitter:image" content="{banner_url}">

    <!-- Auto-redirect to frontend page -->
    <meta http-equiv="refresh" content="0; url={frontend_url}">
    <script>
        window.location.replace("{frontend_url}");
    </script>
</head>
<body style="background:#0b0f19;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;">
    <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:32px;max-width:440px;width:100%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <img src="{banner_url}" alt="{file_name}" style="width:140px;height:140px;border-radius:20px;margin-bottom:20px;object-fit:cover;box-shadow:0 10px 25px rgba(0,0,0,0.3);">
        <h2 style="font-size:18px;font-weight:700;color:#fff;margin:0 0 8px 0;word-break:break-word;">{file_name}</h2>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 20px 0;">Size: {file_size_mb} • Format: {ext}</p>
        <a href="{frontend_url}" style="display:inline-block;background:linear-gradient(135deg,#e11d48,#be123c);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:14px;box-shadow:0 4px 14px rgba(225,29,72,0.4);">
            Download File
        </a>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html, media_type="text/html")

