import json
import base64
import logging
from typing import List, Optional
from urllib.parse import quote
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.schema_models import User, InstagramAccount, InstagramCampaign, InstagramDmLog, File
from app.schemas.instagram_schemas import (
    ConnectInstagramRequest, ConnectInstagramSessionRequest, ConnectInstagramLoginRequest,
    InstagramAccountResponse, InstagramCampaignCreate, InstagramCampaignUpdate,
    InstagramCampaignResponse, InstagramDmLogResponse
)
from app.services.instagram.service import InstagramAutoDmService

logger = logging.getLogger("rage.api.instagram")

router = APIRouter(prefix="/integrations/instagram", tags=["Instagram Auto-DM"])

VERIFY_TOKEN = "rage_cloud_meta_webhook_secret_2026"

# ----------------- Meta 1-Click OAuth Handlers (Superprofile Flow) -----------------

@router.get("/oauth/login-url")
async def get_instagram_oauth_login_url(
    return_to: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """
    Generates Meta OAuth dialog URL for 1-Click Instagram connection like Superprofile.
    """
    if not settings.META_APP_ID:
        raise HTTPException(
            status_code=400,
            detail="Meta App ID is not configured on the server. Please set META_APP_ID and META_APP_SECRET in Railway environment variables."
        )

    redirect_uri = settings.META_REDIRECT_URI or "https://rdkwebsite-production.up.railway.app/api/v1/integrations/instagram/oauth/callback"
    
    payload = json.dumps({
        "user_id": current_user.id,
        "return_to": return_to or "https://rdkwebsite.netlify.app/instagram"
    })
    state_b64 = base64.urlsafe_b64encode(payload.encode()).decode()

    scope = "instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_read_engagement,pages_manage_metadata"

    login_url = (
        f"https://www.facebook.com/v19.0/dialog/oauth?"
        f"client_id={settings.META_APP_ID}&"
        f"redirect_uri={quote(redirect_uri, safe='')}&"
        f"scope={scope}&"
        f"response_type=code&"
        f"state={state_b64}"
    )

    return {"login_url": login_url, "meta_app_id": settings.META_APP_ID}


@router.get("/oauth/callback")
async def instagram_oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Receives authorization code from Meta, exchanges for 60-day long-lived token,
    extracts Instagram Business Account, and connects it automatically.
    """
    return_to = "https://rdkwebsite.netlify.app/instagram"
    user_id = None

    if state:
        try:
            decoded = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
            user_id = decoded.get("user_id")
            return_to = decoded.get("return_to", return_to)
        except Exception as e:
            logger.error(f"Error decoding OAuth state: {e}")

    if error or not code:
        err_msg = error_description or error or "Authentication was cancelled by user."
        return RedirectResponse(f"{return_to}?error={quote(err_msg)}")

    if not user_id:
        return RedirectResponse(f"{return_to}?error={quote('Invalid or expired state session.')}")

    redirect_uri = settings.META_REDIRECT_URI or "https://rdkwebsite-production.up.railway.app/api/v1/integrations/instagram/oauth/callback"

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            token_resp = await client.get(
                "https://graph.facebook.com/v19.0/oauth/access_token",
                params={
                    "client_id": settings.META_APP_ID,
                    "client_secret": settings.META_APP_SECRET,
                    "redirect_uri": redirect_uri,
                    "code": code
                }
            )
            token_json = token_resp.json()
            short_token = token_json.get("access_token")

            if not short_token:
                err = token_json.get("error", {}).get("message", "Failed to obtain access token from Meta.")
                return RedirectResponse(f"{return_to}?error={quote(err)}")

            long_resp = await client.get(
                "https://graph.facebook.com/v19.0/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": settings.META_APP_ID,
                    "client_secret": settings.META_APP_SECRET,
                    "fb_exchange_token": short_token
                }
            )
            long_json = long_resp.json()
            user_access_token = long_json.get("access_token") or short_token

            accounts_resp = await client.get(
                "https://graph.facebook.com/v19.0/me/accounts",
                params={
                    "fields": "id,name,access_token,instagram_business_account{id,username,name}",
                    "access_token": user_access_token
                }
            )
            accounts_json = accounts_resp.json()
            pages = accounts_json.get("data", [])

            target_ig = None
            target_page_id = None
            target_token = user_access_token

            for p in pages:
                ig_data = p.get("instagram_business_account")
                if ig_data and ig_data.get("id"):
                    target_ig = ig_data
                    target_page_id = p.get("id")
                    target_token = p.get("access_token") or user_access_token
                    
                    try:
                        await client.post(
                            f"https://graph.facebook.com/v19.0/{target_page_id}/subscribed_apps",
                            params={
                                "subscribed_fields": "comments,messages",
                                "access_token": target_token
                            }
                        )
                    except Exception:
                        pass
                    break

            if not target_ig:
                err_msg = "No Instagram Business or Creator account found on your Facebook Pages. Please switch your Instagram to a Professional account and link a Facebook Page in Instagram Settings."
                return RedirectResponse(f"{return_to}?error={quote(err_msg)}")

            ig_business_id = target_ig["id"]
            ig_username = target_ig.get("username", "creator")

            stmt = select(InstagramAccount).where(InstagramAccount.user_id == user_id)
            res = await db.execute(stmt)
            account = res.scalar_one_or_none()

            if account:
                account.instagram_business_id = ig_business_id
                account.facebook_page_id = target_page_id
                account.username = ig_username
                account.access_token = target_token
                account.is_active = True
            else:
                account = InstagramAccount(
                    user_id=user_id,
                    instagram_business_id=ig_business_id,
                    facebook_page_id=target_page_id,
                    username=ig_username,
                    access_token=target_token,
                    hourly_limit=30,
                    daily_limit=100,
                    is_active=True
                )
                db.add(account)

            await db.commit()
            return RedirectResponse(f"{return_to}?connected=true&handle={quote(ig_username)}")

    except Exception as e:
        logger.error(f"Error in Instagram OAuth Callback: {e}")
        return RedirectResponse(f"{return_to}?error={quote(str(e))}")

# ----------------- Meta Webhook Handlers -----------------

@router.get("/webhook")
async def verify_webhook(request: Request):
    """
    Meta Webhook Verification endpoint.
    Meta sends: hub.mode, hub.challenge, hub.verify_token.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        logger.info("Meta Webhook verified successfully!")
        return Response(content=challenge, media_type="text/plain")
    
    raise HTTPException(status_code=403, detail="Verification token mismatch")

@router.post("/webhook")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Ingests live Instagram comment webhooks from Meta and executes Auto-DM dispatch.
    """
    try:
        body = await request.json()
        logger.info(f"Received Meta Webhook event: {json.dumps(body)[:250]}")

        # Process entries
        entries = body.get("entry", [])
        for entry in entries:
            ig_business_id = entry.get("id")
            changes = entry.get("changes", [])
            for change in changes:
                field = change.get("field")
                value = change.get("value", {})
                
                # We listen for comments
                if field == "comments":
                    comment_id = value.get("id")
                    comment_text = value.get("text", "")
                    sender = value.get("from", {})
                    sender_id = sender.get("id")
                    sender_username = sender.get("username", "user")

                    # Do not reply to self
                    if sender_id and sender_id != ig_business_id and comment_text:
                        await InstagramAutoDmService.process_comment_event(
                            ig_business_id=ig_business_id,
                            comment_id=comment_id,
                            comment_text=comment_text,
                            sender_ig_id=sender_id,
                            sender_username=sender_username,
                            session=db
                        )

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error handling Meta Webhook: {e}")
        return {"status": "error", "message": str(e)}

# ----------------- Creator Account Management -----------------

@router.get("/account", response_model=Optional[InstagramAccountResponse])
async def get_instagram_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InstagramAccount).where(InstagramAccount.user_id == current_user.id)
    res = await db.execute(stmt)
    account = res.scalar_one_or_none()
    return account

@router.post("/connect", response_model=InstagramAccountResponse)
async def connect_instagram_account(
    payload: ConnectInstagramRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InstagramAccount).where(InstagramAccount.user_id == current_user.id)
    res = await db.execute(stmt)
    account = res.scalar_one_or_none()

    if account:
        account.instagram_business_id = payload.instagram_business_id
        account.facebook_page_id = payload.facebook_page_id
        account.username = payload.username
        account.access_token = payload.access_token
        if payload.hourly_limit:
            account.hourly_limit = payload.hourly_limit
        if payload.daily_limit:
            account.daily_limit = payload.daily_limit
        account.is_active = True
    else:
        account = InstagramAccount(
            user_id=current_user.id,
            instagram_business_id=payload.instagram_business_id,
            facebook_page_id=payload.facebook_page_id,
            username=payload.username,
            access_token=payload.access_token,
            hourly_limit=payload.hourly_limit or 30,
            daily_limit=payload.daily_limit or 100,
            is_active=True
        )
        db.add(account)

    await db.commit()
    await db.refresh(account)
    return account

@router.post("/connect-session", response_model=InstagramAccountResponse)
async def connect_instagram_session(
    payload: ConnectInstagramSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Option A: Connects Instagram directly via authenticated web sessionid cookie.
    Zero Meta Developer App, zero Facebook Page required.
    """
    is_valid, user_data, error_msg = await InstagramAutoDmService.validate_session_cookie(payload.session_id)
    if not is_valid or not user_data:
        raise HTTPException(status_code=400, detail=error_msg or "Failed to validate Instagram session.")

    username = user_data.get("username")
    pk = user_data.get("pk")
    pic_url = user_data.get("profile_pic_url")
    clean_cookie = user_data.get("session_cookie")

    stmt = select(InstagramAccount).where(InstagramAccount.user_id == current_user.id)
    res = await db.execute(stmt)
    account = res.scalar_one_or_none()

    if account:
        account.username = username
        account.instagram_business_id = pk
        account.session_cookie = clean_cookie
        account.profile_picture_url = pic_url
        account.connection_type = "SESSION"
        if payload.hourly_limit:
            account.hourly_limit = payload.hourly_limit
        if payload.daily_limit:
            account.daily_limit = payload.daily_limit
        account.is_active = True
    else:
        account = InstagramAccount(
            user_id=current_user.id,
            username=username,
            instagram_business_id=pk,
            session_cookie=clean_cookie,
            profile_picture_url=pic_url,
            connection_type="SESSION",
            hourly_limit=payload.hourly_limit or 20,
            daily_limit=payload.daily_limit or 60,
            is_active=True
        )
        db.add(account)

    await db.commit()
    await db.refresh(account)
    return account

@router.post("/login-credentials")
async def login_instagram_credentials(
    payload: ConnectInstagramLoginRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Direct in-app Instagram Login with username & password (and optional 2FA).
    Logs in directly on Instagram Web, captures session, and connects account.
    """
    login_result = await InstagramAutoDmService.login_with_credentials(
        username=payload.username,
        password=payload.password,
        two_factor_code=payload.two_factor_code,
        two_factor_identifier=payload.two_factor_identifier
    )

    if not login_result.get("success"):
        if login_result.get("two_factor_required"):
            return {
                "status": "TWO_FACTOR_REQUIRED",
                "two_factor_identifier": login_result.get("two_factor_identifier"),
                "message": login_result.get("message")
            }
        raise HTTPException(
            status_code=400,
            detail=login_result.get("error") or "Failed to log in to Instagram."
        )

    session_cookie = login_result.get("session_cookie")
    user_id = login_result.get("user_id")
    username = login_result.get("username")

    stmt = select(InstagramAccount).where(InstagramAccount.user_id == current_user.id)
    res = await db.execute(stmt)
    account = res.scalar_one_or_none()

    if account:
        account.username = username
        account.instagram_business_id = user_id
        account.session_cookie = session_cookie
        account.connection_type = "SESSION"
        if payload.hourly_limit:
            account.hourly_limit = payload.hourly_limit
        if payload.daily_limit:
            account.daily_limit = payload.daily_limit
        account.is_active = True
    else:
        account = InstagramAccount(
            user_id=current_user.id,
            username=username,
            instagram_business_id=user_id,
            session_cookie=session_cookie,
            connection_type="SESSION",
            hourly_limit=payload.hourly_limit or 20,
            daily_limit=payload.daily_limit or 60,
            is_active=True
        )
        db.add(account)

    await db.commit()
    await db.refresh(account)
    return {
        "status": "CONNECTED",
        "username": account.username,
        "account": InstagramAccountResponse.model_validate(account)
    }

@router.post("/disconnect")
async def disconnect_instagram_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InstagramAccount).where(InstagramAccount.user_id == current_user.id)
    res = await db.execute(stmt)
    account = res.scalar_one_or_none()
    if account:
        account.is_active = False
        await db.commit()
    return {"status": "disconnected"}

# ----------------- Campaign Management -----------------

@router.get("/campaigns", response_model=List[InstagramCampaignResponse])
async def list_campaigns(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InstagramCampaign, File.name).outerjoin(
        File, InstagramCampaign.file_id == File.id
    ).where(InstagramCampaign.user_id == current_user.id).order_by(InstagramCampaign.created_at.desc())
    res = await db.execute(stmt)
    
    output = []
    for camp, f_name in res.all():
        try:
            dm_templates = json.loads(camp.dm_templates_json) if camp.dm_templates_json else []
        except Exception:
            dm_templates = [camp.dm_templates_json]
        try:
            reply_comments = json.loads(camp.reply_comments_json) if camp.reply_comments_json else []
        except Exception:
            reply_comments = [camp.reply_comments_json] if camp.reply_comments_json else []

        output.append(InstagramCampaignResponse(
            id=camp.id,
            file_id=camp.file_id,
            file_name=f_name or "Untitled File",
            title=camp.title,
            post_url=camp.post_url,
            target_mode=camp.target_mode or "SPECIFIC",
            last_scanned_at=camp.last_scanned_at,
            trigger_keywords=camp.trigger_keywords,
            dm_templates=dm_templates,
            reply_comments=reply_comments,
            send_comment_reply=camp.send_comment_reply,
            is_active=camp.is_active,
            total_dms_sent=camp.total_dms_sent,
            created_at=camp.created_at
        ))
    return output

@router.post("/campaigns", response_model=InstagramCampaignResponse)
async def create_campaign(
    payload: InstagramCampaignCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify account exists
    acc_stmt = select(InstagramAccount).where(InstagramAccount.user_id == current_user.id, InstagramAccount.is_active == True)
    acc_res = await db.execute(acc_stmt)
    account = acc_res.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=400, detail="Please connect your Instagram account first.")

    # Verify file ownership
    f_stmt = select(File).where(File.id == payload.file_id, File.owner_id == current_user.id, File.is_deleted == False)
    f_res = await db.execute(f_stmt)
    file_obj = f_res.scalar_one_or_none()
    if not file_obj:
        raise HTTPException(status_code=404, detail="File not found in your vault.")

    campaign = InstagramCampaign(
        user_id=current_user.id,
        instagram_account_id=account.id,
        file_id=payload.file_id,
        title=payload.title,
        post_url=payload.post_url,
        target_mode=(payload.target_mode or "SPECIFIC").upper() if (payload.target_mode or "SPECIFIC").upper() in ("SPECIFIC", "ANY", "NEXT") else "SPECIFIC",
        trigger_keywords=payload.trigger_keywords,
        dm_templates_json=json.dumps(payload.dm_templates),
        reply_comments_json=json.dumps(payload.reply_comments or ["Sent to your DM! 📩", "Check your message requests! 🚀"]),
        send_comment_reply=payload.send_comment_reply,
        is_active=True,
        total_dms_sent=0
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)

    return InstagramCampaignResponse(
        id=campaign.id,
        file_id=campaign.file_id,
        file_name=file_obj.name,
        title=campaign.title,
        post_url=campaign.post_url,
        target_mode=campaign.target_mode or "SPECIFIC",
        last_scanned_at=campaign.last_scanned_at,
        trigger_keywords=campaign.trigger_keywords,
        dm_templates=payload.dm_templates,
        reply_comments=payload.reply_comments or [],
        send_comment_reply=campaign.send_comment_reply,
        is_active=campaign.is_active,
        total_dms_sent=0,
        created_at=campaign.created_at
    )

@router.put("/campaigns/{campaign_id}", response_model=InstagramCampaignResponse)
async def update_campaign(
    campaign_id: str,
    payload: InstagramCampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InstagramCampaign, File.name).outerjoin(
        File, InstagramCampaign.file_id == File.id
    ).where(InstagramCampaign.id == campaign_id, InstagramCampaign.user_id == current_user.id)
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Campaign not found")

    camp, f_name = row
    if payload.title is not None:
        camp.title = payload.title
    if payload.post_url is not None:
        camp.post_url = payload.post_url
    if payload.target_mode is not None and payload.target_mode.upper() in ("SPECIFIC", "ANY", "NEXT"):
        camp.target_mode = payload.target_mode.upper()
    if payload.trigger_keywords is not None:
        camp.trigger_keywords = payload.trigger_keywords
    if payload.dm_templates is not None:
        camp.dm_templates_json = json.dumps(payload.dm_templates)
    if payload.reply_comments is not None:
        camp.reply_comments_json = json.dumps(payload.reply_comments)
    if payload.send_comment_reply is not None:
        camp.send_comment_reply = payload.send_comment_reply
    if payload.is_active is not None:
        camp.is_active = payload.is_active

    await db.commit()
    await db.refresh(camp)

    dm_templates = json.loads(camp.dm_templates_json) if camp.dm_templates_json else []
    reply_comments = json.loads(camp.reply_comments_json) if camp.reply_comments_json else []

    return InstagramCampaignResponse(
        id=camp.id,
        file_id=camp.file_id,
        file_name=f_name or "Untitled File",
        title=camp.title,
        post_url=camp.post_url,
        target_mode=camp.target_mode or "SPECIFIC",
        last_scanned_at=camp.last_scanned_at,
        trigger_keywords=camp.trigger_keywords,
        dm_templates=dm_templates,
        reply_comments=reply_comments,
        send_comment_reply=camp.send_comment_reply,
        is_active=camp.is_active,
        total_dms_sent=camp.total_dms_sent,
        created_at=camp.created_at
    )

@router.post("/campaigns/{campaign_id}/scan")
async def scan_campaign_comments(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Immediately scans the campaign's Reel for new trigger comments and auto-dispatches DMs.
    """
    # Verify campaign ownership
    stmt = select(InstagramCampaign).where(InstagramCampaign.id == campaign_id, InstagramCampaign.user_id == current_user.id)
    res = await db.execute(stmt)
    camp = res.scalar_one_or_none()
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")

    result = await InstagramAutoDmService.scan_and_execute_campaign(campaign_id, db)
    return result

@router.get("/media")
async def list_my_instagram_media(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Recent posts/reels of the connected account, for the post picker grid."""
    stmt = select(InstagramAccount).where(InstagramAccount.user_id == current_user.id, InstagramAccount.is_active == True)
    account = (await db.execute(stmt)).scalar_one_or_none()
    if not account or not account.session_cookie:
        raise HTTPException(status_code=400, detail="Connect your Instagram account first.")
    media = await InstagramAutoDmService.fetch_user_media(account.session_cookie, account.instagram_business_id or "")
    return {"username": account.username, "profile_picture_url": account.profile_picture_url, "media": media}

@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InstagramCampaign).where(InstagramCampaign.id == campaign_id, InstagramCampaign.user_id == current_user.id)
    res = await db.execute(stmt)
    camp = res.scalar_one_or_none()
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")

    await db.delete(camp)
    await db.commit()
    return {"status": "deleted"}

@router.get("/logs", response_model=List[InstagramDmLogResponse])
async def list_campaign_logs(
    campaign_id: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InstagramDmLog).join(
        InstagramCampaign, InstagramDmLog.campaign_id == InstagramCampaign.id
    ).where(InstagramCampaign.user_id == current_user.id)

    if campaign_id:
        stmt = stmt.where(InstagramDmLog.campaign_id == campaign_id)

    stmt = stmt.order_by(InstagramDmLog.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return logs
