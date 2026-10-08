import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.schema_models import User, Wallet, WalletTransaction, WithdrawalRequest, SystemSetting
from app.schemas.all_schemas import (
    WalletResponse, WalletTransactionResponse, WithdrawalCreateRequest, WithdrawalResponse
)
from app.services.wallet.service import WalletService
from app.services.audit.service import AuditService

router = APIRouter(prefix="/wallet", tags=["Wallet & Ledger"])

@router.get("/", response_model=WalletResponse)
async def get_my_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    wallet = await WalletService.get_or_create_wallet(current_user.id, db)
    await db.commit()
    return WalletResponse(
        id=wallet.id,
        user_id=wallet.user_id,
        currency=wallet.currency,
        available_balance=wallet.available_balance,
        pending_balance=wallet.pending_balance,
        locked_balance=wallet.locked_balance,
        total_balance=round(wallet.available_balance + wallet.pending_balance + wallet.locked_balance, 2)
    )

@router.get("/transactions", response_model=List[WalletTransactionResponse])
async def get_my_transactions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    wallet = await WalletService.get_or_create_wallet(current_user.id, db)
    stmt = select(WalletTransaction).where(
        WalletTransaction.wallet_id == wallet.id
    ).order_by(desc(WalletTransaction.created_at)).limit(100)
    res = await db.execute(stmt)
    txs = res.scalars().all()
    return [WalletTransactionResponse.model_validate(t) for t in txs]

@router.post("/withdraw", response_model=WithdrawalResponse)
async def request_withdrawal(
    req: WithdrawalCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Minimum withdrawal check
    setting_stmt = select(SystemSetting).where(SystemSetting.key == "min_withdrawal_amount")
    s_res = await db.execute(setting_stmt)
    s_rec = s_res.scalar_one_or_none()
    min_amount = float(s_rec.value) if s_rec else settings.MIN_WITHDRAWAL_AMOUNT

    if req.amount < min_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum withdrawal amount is {min_amount} INR."
        )

    wallet = await WalletService.get_or_create_wallet(current_user.id, db)
    if wallet.available_balance < req.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient available balance (Available: {wallet.available_balance} INR)"
        )

    # Lock funds atomically
    await WalletService.lock_for_withdrawal(wallet.id, req.amount, db)

    withdrawal = WithdrawalRequest(
        user_id=current_user.id,
        wallet_id=wallet.id,
        amount=req.amount,
        currency=wallet.currency,
        payout_method=req.payout_method.upper(),
        payout_details=json.dumps(req.payout_details),
        status="PENDING"
    )
    db.add(withdrawal)
    await db.flush()

    client_ip = request.client.host if request.client else "unknown"
    await AuditService.log_action(
        action="WITHDRAWAL_REQUESTED",
        session=db,
        user_id=current_user.id,
        target_type="withdrawal",
        target_id=withdrawal.id,
        ip_address=client_ip,
        details=f"Requested withdrawal of {req.amount} INR via {req.payout_method}"
    )

    await db.commit()
    await db.refresh(withdrawal)

    return WithdrawalResponse.model_validate(withdrawal)

@router.get("/withdrawals", response_model=List[WithdrawalResponse])
async def list_my_withdrawals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WithdrawalRequest).where(
        WithdrawalRequest.user_id == current_user.id
    ).order_by(desc(WithdrawalRequest.created_at))
    res = await db.execute(stmt)
    withdrawals = res.scalars().all()
    return [WithdrawalResponse.model_validate(w) for w in withdrawals]
