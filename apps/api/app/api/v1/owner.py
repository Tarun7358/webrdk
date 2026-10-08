from datetime import datetime, timedelta
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, case, delete, update
from app.core.database import get_db
from app.core.dependencies import require_roles, get_current_user
from app.models.schema_models import (
    User, File, Wallet, WalletTransaction, QualifiedDownload, VideoView,
    SubscriptionRequest, ReferralRecord, Download, ShareLink, ContentPurchase,
    WithdrawalRequest, TeamMember, Team, Folder, UserSubscription, AuditLog, FraudEvent
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


async def delete_user_data(db: AsyncSession, user_id: str):
    """Safely cascades deletion of all user resources, uploads, links, and transactions"""
    # 1. Unlink referrals where this user was the referrer
    await db.execute(update(User).where(User.referred_by_id == user_id).values(referred_by_id=None))

    # 2. Get all file IDs owned by this user
    files_res = await db.execute(select(File.id).where(File.owner_id == user_id))
    user_file_ids = [r[0] for r in files_res.fetchall()]

    if user_file_ids:
        await db.execute(delete(QualifiedDownload).where(QualifiedDownload.file_id.in_(user_file_ids)))
        await db.execute(delete(Download).where(Download.file_id.in_(user_file_ids)))
        await db.execute(delete(VideoView).where(VideoView.file_id.in_(user_file_ids)))
        await db.execute(delete(ShareLink).where(ShareLink.file_id.in_(user_file_ids)))
        await db.execute(delete(ContentPurchase).where(ContentPurchase.file_id.in_(user_file_ids)))
        await db.execute(delete(File).where(File.id.in_(user_file_ids)))

    # 3. Clean up records created by this user
    await db.execute(delete(QualifiedDownload).where(QualifiedDownload.creator_id == user_id))
    await db.execute(delete(Download).where(Download.user_id == user_id))
    await db.execute(delete(VideoView).where(VideoView.user_id == user_id))
    await db.execute(delete(ShareLink).where(ShareLink.created_by == user_id))
    await db.execute(delete(ReferralRecord).where(or_(ReferralRecord.referrer_id == user_id, ReferralRecord.referred_user_id == user_id)))
    await db.execute(delete(SubscriptionRequest).where(or_(SubscriptionRequest.user_id == user_id, SubscriptionRequest.reviewer_id == user_id)))
    await db.execute(delete(UserSubscription).where(UserSubscription.user_id == user_id))
    await db.execute(delete(ContentPurchase).where(ContentPurchase.user_id == user_id))
    await db.execute(delete(WithdrawalRequest).where(WithdrawalRequest.user_id == user_id))

    # 4. Clean up wallets and transactions
    wallets_res = await db.execute(select(Wallet.id).where(Wallet.user_id == user_id))
    wallet_ids = [r[0] for r in wallets_res.fetchall()]
    if wallet_ids:
        await db.execute(delete(WalletTransaction).where(WalletTransaction.wallet_id.in_(wallet_ids)))
        await db.execute(delete(Wallet).where(Wallet.id.in_(wallet_ids)))

    # 5. Clean up teams, folders, audit logs, and fraud logs
    await db.execute(delete(TeamMember).where(TeamMember.user_id == user_id))
    await db.execute(delete(Team).where(Team.owner_id == user_id))
    await db.execute(delete(Folder).where(Folder.owner_id == user_id))
    await db.execute(delete(AuditLog).where(AuditLog.user_id == user_id))
    await db.execute(delete(FraudEvent).where(FraudEvent.user_id == user_id))

    # 6. Delete user
    await db.execute(delete(User).where(User.id == user_id))


@router.post("/purge-test-users")
async def purge_test_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Purges all testing accounts (@test.com) from database"""
    stmt = select(User).where(
        or_(
            User.email.ilike("%@test.com"),
            User.email.ilike("test_%@test.com")
        )
    )
    res = await db.execute(stmt)
    test_users = list(res.scalars().all())

    # Protect owner and real accounts
    to_delete = [u for u in test_users if u.role != "OWNER" and u.email.lower() != "rdxyzprvt@gmail.com"]
    deleted_emails = [u.email for u in to_delete]

    for u in to_delete:
        await delete_user_data(db, u.id)

    await db.commit()
    return {
        "message": f"Successfully purged {len(deleted_emails)} test account(s).",
        "purged_count": len(deleted_emails),
        "purged_emails": deleted_emails
    }


@router.delete("/users/{user_id}")
async def delete_user_by_id(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows platform owner to delete any user account from the roster"""
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    target = res.scalar_one_or_none()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    if target.role == "OWNER" or target.email.lower() == "rdxyzprvt@gmail.com":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the Platform Owner account."
        )

    if target.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own logged-in account."
        )

    deleted_email = target.email
    await delete_user_data(db, user_id)
    await db.commit()

    return {
        "message": f"User {deleted_email} deleted successfully.",
        "deleted_email": deleted_email
    }

