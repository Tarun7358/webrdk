from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.schema_models import User, SubscriptionRequest
from app.schemas.all_schemas import (
    SubscriptionRequestCreate,
    SubscriptionRequestResponse
)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

DEFAULT_PLANS = [
    {
        "name": "Free Starter",
        "tier": "FREE",
        "price": 0.0,
        "storage_gb": 10,
        "max_file_mb": 1000,
        "no_ads": False,
        "priority": False,
        "features": [
            "10 GB Free Storage Quota",
            "Monetized downloads & video views",
            "High-speed Google Drive CDN edge",
            "Direct payouts via UPI",
            "Direct cloud stream playback"
        ]
    },
    {
        "name": "Pro Gamer",
        "tier": "PRO_GAMER",
        "price": 299.0,
        "storage_gb": 20,
        "max_file_mb": 5000,
        "no_ads": True,
        "priority": True,
        "features": [
            "20 GB Cloud Storage Vault",
            "Ad-Free download experience for your audience",
            "Uncapped Turbo download speeds",
            "Advanced download analytics & logs",
            "Priority support assistance"
        ]
    },
    {
        "name": "Creator Studio",
        "tier": "CREATOR_STUDIO",
        "price": 799.0,
        "storage_gb": 50,
        "max_file_mb": 10000,
        "no_ads": True,
        "priority": True,
        "features": [
            "50 GB High-Speed Cloud Storage",
            "Custom branded download portals",
            "Maximum creator monetization splits",
            "Direct team collaboration & folder sharing",
            "VIP 24/7 dedicated creator support"
        ]
    }
]

@router.get("/plans")
async def get_subscription_plans():
    return DEFAULT_PLANS

@router.get("/payment-info")
async def get_payment_info():
    """Returns UPI ID and QR code details for manual subscription payments"""
    return {
        "upi_id": settings.UPI_ID,
        "account_name": "RAGE CLOUD Services",
        "currency": "INR",
        "support_email": settings.SMTP_FROM_EMAIL
    }

@router.post("/request", response_model=SubscriptionRequestResponse)
async def submit_subscription_request(
    req: SubscriptionRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a UPI payment proof for subscription upgrade"""
    if not req.utr_number or len(req.utr_number.strip()) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid UTR / Transaction Reference number is required."
        )

    # Check for duplicate pending request with same UTR
    dup_stmt = select(SubscriptionRequest).where(
        SubscriptionRequest.utr_number == req.utr_number.strip(),
        SubscriptionRequest.status == "PENDING"
    )
    dup_res = await db.execute(dup_stmt)
    if dup_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending subscription request with this UTR is already being processed."
        )

    sub_request = SubscriptionRequest(
        user_id=current_user.id,
        user_email=current_user.email,
        plan_tier=req.plan_tier,
        plan_name=req.plan_name,
        amount_inr=req.amount_inr,
        storage_gb=req.storage_gb,
        utr_number=req.utr_number.strip(),
        proof_image_data=req.proof_image_data,
        status="PENDING"
    )
    db.add(sub_request)
    await db.commit()
    await db.refresh(sub_request)

    return sub_request

@router.get("/my-requests", response_model=List[SubscriptionRequestResponse])
async def get_user_subscription_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(SubscriptionRequest)
        .where(SubscriptionRequest.user_id == current_user.id)
        .order_by(desc(SubscriptionRequest.created_at))
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())
