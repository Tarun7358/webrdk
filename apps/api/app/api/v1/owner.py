from datetime import datetime, timedelta
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, case
from app.core.database import get_db
from app.core.dependencies import require_roles, get_current_user
from app.models.schema_models import (
    User, File, Wallet, WalletTransaction, QualifiedDownload, VideoView,
    SubscriptionRequest
)
from app.schemas.all_schemas import (
    OwnerStatsResponse, OwnerUserEarning,
    SubscriptionRequestResponse, SubscriptionReviewRequest
)
from app.services.email_service import EmailService

router = APIRouter(prefix="/owner", tags=["Owner Administration"], dependencies=[Depends(require_roles(["OWNER"]))])

@router.get("/stats", response_model=OwnerStatsResponse)
async def get_owner_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns platform overview, user stats, and daily/lifetime earnings for every user"""
    # 1. Total users
    res_users_count = await db.execute(select(func.count(User.id)))
    total_users = res_users_count.scalar() or 0

    # 2. Total files & storage
    res_files = await db.execute(
        select(
            func.count(File.id),
            func.coalesce(func.sum(File.size), 0)
        ).where(File.is_deleted == False)
    )
    total_files_row = res_files.fetchone()
    total_files = total_files_row[0] if total_files_row else 0
    total_storage_bytes = total_files_row[1] if total_files_row else 0

    # 3. Pending subscription count
    res_sub_count = await db.execute(
        select(func.count(SubscriptionRequest.id)).where(SubscriptionRequest.status == "PENDING")
    )
    pending_subscription_count = res_sub_count.scalar() or 0

    # 4. Fetch all users
    user_stmt = select(User).order_by(desc(User.created_at))
    users_res = await db.execute(user_stmt)
    all_users = list(users_res.scalars().all())

    # Calculate earnings & storage per user
    now = datetime.utcnow()
    one_day_ago = now - timedelta(days=1)

    earnings_list: List[OwnerUserEarning] = []

    for u in all_users:
        # User storage usage & files count
        res_u_files = await db.execute(
            select(
                func.count(File.id),
                func.coalesce(func.sum(File.size), 0)
            ).where(File.owner_id == u.id, File.is_deleted == False)
        )
        u_files_row = res_u_files.fetchone()
        u_file_count = u_files_row[0] if u_files_row else 0
        u_storage_used = u_files_row[1] if u_files_row else 0

        # User wallet
        res_wallet = await db.execute(select(Wallet).where(Wallet.user_id == u.id))
        wallet = res_wallet.scalar_one_or_none()
        available_bal = wallet.available_balance if wallet else 0.0

        # Daily earnings (qualified downloads & video views in the last 24h)
        res_daily_dl = await db.execute(
            select(func.coalesce(func.sum(QualifiedDownload.creator_revenue), 0.0))
            .where(
                QualifiedDownload.creator_id == u.id,
                QualifiedDownload.created_at >= one_day_ago
            )
        )
        daily_dl_rev = res_daily_dl.scalar() or 0.0

        res_daily_vid = await db.execute(
            select(func.coalesce(func.sum(VideoView.creator_revenue), 0.0))
            .join(File, VideoView.file_id == File.id)
            .where(
                File.owner_id == u.id,
                VideoView.created_at >= one_day_ago
            )
        )
        daily_vid_rev = res_daily_vid.scalar() or 0.0
        daily_earnings = round(float(daily_dl_rev + daily_vid_rev), 2)

        # Lifetime earnings
        if wallet:
            res_life = await db.execute(
                select(func.coalesce(func.sum(WalletTransaction.amount), 0.0))
                .where(
                    WalletTransaction.wallet_id == wallet.id,
                    WalletTransaction.amount > 0,
                    WalletTransaction.status == "COMPLETED"
                )
            )
            lifetime_earnings = round(float(res_life.scalar() or 0.0), 2)
        else:
            lifetime_earnings = 0.0

        earnings_list.append(
            OwnerUserEarning(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                role=u.role,
                plan_tier=getattr(u, "plan_tier", "FREE") or "FREE",
                storage_used_bytes=u_storage_used,
                storage_limit_bytes=getattr(u, "storage_limit_bytes", 10 * 1024 * 1024 * 1024) or (10 * 1024 * 1024 * 1024),
                total_files=u_file_count,
                daily_earnings=daily_earnings,
                lifetime_earnings=lifetime_earnings,
                available_balance=available_bal,
                created_at=u.created_at
            )
        )

    return OwnerStatsResponse(
        total_users=total_users,
        total_files=total_files,
        total_storage_bytes=total_storage_bytes,
        pending_subscription_count=pending_subscription_count,
        users=earnings_list
    )

@router.get("/subscriptions", response_model=List[SubscriptionRequestResponse])
async def list_subscription_requests(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List subscription payment requests for Owner approval"""
    query = select(SubscriptionRequest)
    if status_filter:
        query = query.where(SubscriptionRequest.status == status_filter.upper())
    query = query.order_by(
        case((SubscriptionRequest.status == "PENDING", 0), else_=1),
        desc(SubscriptionRequest.created_at)
    )
    res = await db.execute(query)
    return list(res.scalars().all())

@router.post("/subscriptions/{request_id}/review", response_model=SubscriptionRequestResponse)
async def review_subscription_request(
    request_id: str,
    review_req: SubscriptionReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Approve or Reject a subscription payment request"""
    stmt = select(SubscriptionRequest).where(SubscriptionRequest.id == request_id)
    res = await db.execute(stmt)
    sub_request = res.scalar_one_or_none()

    if not sub_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription request not found."
        )

    # Fetch targeted user
    user_stmt = select(User).where(User.id == sub_request.user_id)
    user_res = await db.execute(user_stmt)
    target_user = user_res.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user account not found."
        )

    action = review_req.action.upper()
    sub_request.reviewed_at = datetime.utcnow()
    sub_request.reviewer_id = current_user.id
    sub_request.review_note = review_req.review_note

    if action == "APPROVE":
        sub_request.status = "APPROVED"
        # Upgrade user plan and storage limit
        target_user.plan_tier = sub_request.plan_tier
        target_user.storage_limit_bytes = sub_request.storage_gb * 1024 * 1024 * 1024
        await db.commit()
        await db.refresh(sub_request)

        # Send approval email notification via GoDaddy SMTP
        asyncio.create_task(
            EmailService.send_subscription_approved_email(
                to_email=target_user.email,
                user_name=target_user.full_name,
                plan_name=sub_request.plan_name,
                storage_gb=sub_request.storage_gb
            )
        )
    elif action == "REJECT":
        sub_request.status = "REJECTED"
        await db.commit()
        await db.refresh(sub_request)

        # Send rejection email notification via GoDaddy SMTP
        asyncio.create_task(
            EmailService.send_subscription_rejected_email(
                to_email=target_user.email,
                user_name=target_user.full_name,
                plan_name=sub_request.plan_name,
                reason=review_req.review_note or "Transaction could not be verified."
            )
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'APPROVE' or 'REJECT'."
        )

    return sub_request
