import json
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.schema_models import User, SubscriptionPlan, UserSubscription

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

DEFAULT_PLANS = [
    {
        "name": "Free Tier",
        "tier": "FREE",
        "price": 0.0,
        "storage_gb": 10,
        "max_file_mb": 500,
        "no_ads": False,
        "priority": False,
        "features": ["10 GB Cloud Storage", "Standard download speeds", "Sponsored ad support", "Creator monetization"]
    },
    {
        "name": "Pro Gamer",
        "tier": "PRO",
        "price": 299.0,
        "storage_gb": 100,
        "max_file_mb": 5000,
        "no_ads": True,
        "priority": True,
        "features": ["100 GB Cloud Storage", "No advertisements", "Uncapped Turbo download speeds", "Advanced download analytics", "Priority customer support"]
    },
    {
        "name": "Creator Studio",
        "tier": "CREATOR_STUDIO",
        "price": 799.0,
        "storage_gb": 1000,
        "max_file_mb": 20000,
        "no_ads": True,
        "priority": True,
        "features": ["1 TB High-speed Cloud Storage", "Custom branded download pages", "Team collaboration & revenue splits", "Highest revenue RPM share", "Dedicated account manager"]
    }
]

@router.get("/plans")
async def get_subscription_plans(db: AsyncSession = Depends(get_db)):
    return DEFAULT_PLANS

@router.post("/subscribe/{tier}")
async def subscribe_plan(
    tier: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return {
        "status": "success",
        "message": f"Successfully activated plan: {tier.upper()}",
        "tier": tier.upper()
    }
