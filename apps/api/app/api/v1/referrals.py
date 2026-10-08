from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.schema_models import User, ReferralRecord

router = APIRouter(prefix="/referrals", tags=["Referrals"])

@router.get("/stats")
async def get_referral_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ReferralRecord, User).join(
        User, ReferralRecord.referred_user_id == User.id
    ).where(ReferralRecord.referrer_id == current_user.id)
    res = await db.execute(stmt)
    records = res.all()

    referred_list = [
        {
            "id": r[0].id,
            "referred_user_name": r[1].full_name,
            "status": r[0].status,
            "reward_amount": r[0].reward_amount,
            "date": r[0].created_at.strftime("%Y-%m-%d")
        }
        for r in records
    ]

    total_rewards = sum(r[0].reward_amount for r in records if r[0].status == "REWARDED")

    return {
        "referral_code": current_user.referral_code,
        "referral_link": f"/register?ref={current_user.referral_code}",
        "total_referrals": len(records),
        "total_rewards_earned": total_rewards,
        "referred_users": referred_list
    }
