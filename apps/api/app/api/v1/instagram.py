import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.schema_models import User, InstagramAccount, InstagramCampaign, InstagramDmLog, File
from app.schemas.instagram_schemas import (
    ConnectInstagramRequest, InstagramAccountResponse,
    InstagramCampaignCreate, InstagramCampaignUpdate, InstagramCampaignResponse,
    InstagramDmLogResponse
)
from app.services.instagram.service import InstagramAutoDmService

logger = logging.getLogger("rage.api.instagram")

router = APIRouter(prefix="/integrations/instagram", tags=["Instagram Auto-DM"])

VERIFY_TOKEN = "rage_cloud_meta_webhook_secret_2026"

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
        trigger_keywords=camp.trigger_keywords,
        dm_templates=dm_templates,
        reply_comments=reply_comments,
        send_comment_reply=camp.send_comment_reply,
        is_active=camp.is_active,
        total_dms_sent=camp.total_dms_sent,
        created_at=camp.created_at
    )

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
