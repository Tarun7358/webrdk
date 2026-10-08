from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import require_roles
from app.models.schema_models import (
    User, File, Download, QualifiedDownload, Wallet, WithdrawalRequest,
    AuditLog, FraudEvent, SystemSetting
)
from app.schemas.all_schemas import (
    AdminDashboardResponse, WithdrawalResponse, WithdrawalAdminActionRequest
)
from app.services.wallet.service import WalletService
from app.services.audit.service import AuditService

router = APIRouter(prefix="/admin", tags=["Super Admin"], dependencies=[Depends(require_roles(["SUPER_ADMIN"]))])

class SettingUpdateRequest(BaseModel):
    settings: Dict[str, str]

class UserStatusUpdateRequest(BaseModel):
    is_active: bool
    role: Optional[str] = None

@router.get("/stats", response_model=AdminDashboardResponse)
async def get_admin_dashboard_stats(db: AsyncSession = Depends(get_db)):
    # Total Users & Active
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar() or 0
    creators_count = (await db.execute(select(func.count(User.id)).where(User.role == "CREATOR"))).scalar() or 0

    # Total Files & Storage
    f_res = await db.execute(select(
        func.count(File.id),
        func.coalesce(func.sum(File.size), 0)
    ).where(File.is_deleted == False))
    total_files, total_storage = f_res.first()

    # Total Downloads & Qualified
    total_dl = (await db.execute(select(func.count(Download.id)))).scalar() or 0
    qd_res = await db.execute(select(
        func.count(QualifiedDownload.id),
        func.coalesce(func.sum(QualifiedDownload.revenue_generated), 0.0),
        func.coalesce(func.sum(QualifiedDownload.creator_revenue), 0.0)
    ))
    qual_dl, gross_rev, creator_payouts = qd_res.first()
    platform_revenue = round(gross_rev - creator_payouts, 2)

    # Withdrawals
    w_res = await db.execute(select(
        func.count(WithdrawalRequest.id),
        func.coalesce(func.sum(WithdrawalRequest.amount), 0.0)
    ).where(WithdrawalRequest.status == "PENDING"))
    pending_w_count, pending_w_amount = w_res.first()

    # Fraud Alerts
    fraud_count = (await db.execute(select(func.count(FraudEvent.id)))).scalar() or 0

    # Audit Logs
    audit_stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).limit(8)
    audit_rows = (await db.execute(audit_stmt)).scalars().all()
    recent_logs = [
        {
            "id": l.id,
            "action": l.action,
            "target_type": l.target_type,
            "ip_address": l.ip_address,
            "details": l.details,
            "created_at": l.created_at.strftime("%Y-%m-%d %H:%M")
        }
        for l in audit_rows
    ]

    # Settings
    s_rows = (await db.execute(select(SystemSetting))).scalars().all()
    monetization = {s.key: s.value for s in s_rows}
    if not monetization:
        monetization = {
            "creator_revenue_percent": str(settings.CREATOR_REVENUE_PERCENT),
            "platform_revenue_percent": str(settings.PLATFORM_REVENUE_PERCENT),
            "min_withdrawal_amount": str(settings.MIN_WITHDRAWAL_AMOUNT),
            "referral_reward": str(settings.REFERRAL_REWARD),
        }

    return AdminDashboardResponse(
        total_users=total_users,
        active_users=active_users,
        total_creators=creators_count,
        total_teams=0,
        total_files=total_files,
        total_storage_bytes=total_storage,
        total_downloads=total_dl,
        qualified_downloads=qual_dl,
        platform_revenue=platform_revenue,
        creator_payouts_distributed=round(creator_payouts, 2),
        pending_withdrawals_count=pending_w_count,
        pending_withdrawals_amount=round(pending_w_amount, 2),
        fraud_alerts_count=fraud_count,
        recent_audit_logs=recent_logs,
        monetization_settings=monetization
    )

@router.get("/users")
async def list_users(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).order_by(desc(User.created_at)).offset(skip).limit(limit)
    users = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "referral_code": u.referral_code,
            "created_at": u.created_at
        }
        for u in users
    ]

@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    req: UserStatusUpdateRequest,
    request: Request,
    current_admin: User = Depends(require_roles(["SUPER_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.id == user_id)
    user = (await db.execute(stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = req.is_active
    if req.role:
        user.role = req.role

    await AuditService.log_action(
        action="ADMIN_USER_UPDATED",
        session=db,
        user_id=current_admin.id,
        target_type="user",
        target_id=user.id,
        details=f"Admin updated active={req.is_active}, role={req.role}"
    )
    await db.commit()
    return {"message": "User status updated", "user_id": user_id}

@router.get("/withdrawals", response_model=List[WithdrawalResponse])
async def list_withdrawals(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WithdrawalRequest)
    if status_filter:
        stmt = stmt.where(WithdrawalRequest.status == status_filter.upper())
    stmt = stmt.order_by(desc(WithdrawalRequest.created_at))
    rows = (await db.execute(stmt)).scalars().all()
    return [WithdrawalResponse.model_validate(w) for w in rows]

@router.post("/withdrawals/{withdrawal_id}/action")
async def process_withdrawal_action(
    withdrawal_id: str,
    req: WithdrawalAdminActionRequest,
    current_admin: User = Depends(require_roles(["SUPER_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WithdrawalRequest).where(WithdrawalRequest.id == withdrawal_id)
    w = (await db.execute(stmt)).scalar_one_or_none()
    if not w:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")

    action = req.action.upper()
    if action == "APPROVE":
        w.status = "APPROVED"
        w.admin_note = req.admin_note or "Approved by admin for payout processing"
    elif action == "REJECT":
        w.status = "REJECTED"
        w.admin_note = req.admin_note or "Rejected by admin"
        # Release locked funds back to creator
        await WalletService.release_locked_withdrawal(w.wallet_id, w.amount, db)
    elif action == "COMPLETE":
        w.status = "COMPLETED"
        w.admin_note = req.admin_note or "Manual payout fulfilled"
        # Finalize ledger deduction
        await WalletService.complete_withdrawal(w.wallet_id, w.amount, w.id, db)
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await AuditService.log_action(
        action=f"WITHDRAWAL_{action}",
        session=db,
        user_id=current_admin.id,
        target_type="withdrawal",
        target_id=w.id,
        details=f"Withdrawal {w.id} changed to {action}: {req.admin_note}"
    )

    await db.commit()
    return {"status": "success", "new_status": w.status}

@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(SystemSetting))).scalars().all()
    return {r.key: r.value for r in rows}

@router.put("/settings")
async def update_settings(
    req: SettingUpdateRequest,
    current_admin: User = Depends(require_roles(["SUPER_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    for k, v in req.settings.items():
        stmt = select(SystemSetting).where(SystemSetting.key == k)
        record = (await db.execute(stmt)).scalar_one_or_none()
        if record:
            record.value = str(v)
        else:
            db.add(SystemSetting(key=k, value=str(v), description="Platform setting"))

    await AuditService.log_action(
        action="ADMIN_SETTINGS_UPDATED",
        session=db,
        user_id=current_admin.id,
        details=f"Admin updated settings: {list(req.settings.keys())}"
    )
    await db.commit()
    return {"status": "success", "message": "Settings updated"}

@router.get("/fraud-alerts")
async def list_fraud_alerts(db: AsyncSession = Depends(get_db)):
    stmt = select(FraudEvent).order_by(desc(FraudEvent.flagged_at)).limit(50)
    alerts = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": a.id,
            "ip_hash": a.ip_hash[:16] + "...",
            "event_type": a.event_type,
            "risk_score": a.risk_score,
            "details": a.details,
            "flagged_at": a.flagged_at
        }
        for a in alerts
    ]

@router.get("/audit-logs")
async def list_audit_logs(db: AsyncSession = Depends(get_db)):
    stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).limit(100)
    logs = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "ip_address": l.ip_address,
            "details": l.details,
            "created_at": l.created_at
        }
        for l in logs
    ]

@router.get("/storage-status")
async def get_storage_status():
    from app.services.storage.factory import get_storage_service
    from app.services.storage.google_drive import GoogleDriveStorage

    storage = get_storage_service()
    backend_name = settings.STORAGE_BACKEND
    is_drive = isinstance(storage, GoogleDriveStorage)

    if is_drive and storage.is_configured():
        quota = storage.get_storage_quota()
        return {
            "backend": "google_drive",
            "status": "connected",
            "is_configured": True,
            "account_email": quota.get("email"),
            "account_name": quota.get("display_name"),
            "total_bytes": quota.get("total_bytes"),
            "used_bytes": quota.get("used_bytes"),
            "free_bytes": quota.get("free_bytes"),
            "total_gb": quota.get("total_gb"),
            "used_gb": quota.get("used_gb"),
            "is_5tb": quota.get("is_5tb"),
            "root_folder_id": storage.root_folder_id
        }
    elif backend_name == "google_drive":
        return {
            "backend": "google_drive",
            "status": "pending_oauth",
            "is_configured": False,
            "message": "Google Drive OAuth authentication required. Run setup_google_drive.py or authenticate your account.",
            "client_secrets_found": bool(settings.GOOGLE_OAUTH_CLIENT_SECRETS_FILE)
        }
    else:
        return {
            "backend": backend_name,
            "status": "active",
            "is_configured": True
        }

