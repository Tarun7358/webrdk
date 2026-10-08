import random
import string
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.schema_models import User, ReferralRecord, SystemSetting
from app.services.wallet.service import WalletService
from app.core.config import settings

logger = logging.getLogger("rage.referral.service")

class ReferralService:
    @staticmethod
    def generate_referral_code(prefix: str = "RAGE") -> str:
        random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f"{prefix}-{random_suffix}"

    @staticmethod
    async def register_referral(
        referral_code: str,
        new_user: User,
        session: AsyncSession
    ) -> Optional[ReferralRecord]:
        if not referral_code:
            return None

        clean_code = referral_code.strip().upper()
        stmt = select(User).where(User.referral_code == clean_code)
        res = await session.execute(stmt)
        referrer = res.scalar_one_or_none()

        if not referrer:
            logger.warning(f"Invalid referral code used: {referral_code}")
            return None

        # Anti-fraud: prevent self-referral
        if referrer.id == new_user.id or referrer.email == new_user.email:
            logger.warning("Attempted self-referral prevented.")
            return None

        new_user.referred_by_id = referrer.id

        referral_record = ReferralRecord(
            referrer_id=referrer.id,
            referred_user_id=new_user.id,
            status="REGISTERED",
            reward_amount=0.0
        )
        session.add(referral_record)
        await session.flush()
        return referral_record

    @staticmethod
    async def qualify_referral(
        user_id: str,
        session: AsyncSession
    ) -> Optional[ReferralRecord]:
        """
        Rewards referrer when referred user completes qualified platform milestone (e.g. file upload or download)
        """
        stmt = select(ReferralRecord).where(
            ReferralRecord.referred_user_id == user_id,
            ReferralRecord.status == "REGISTERED"
        )
        res = await session.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            return None

        # Fetch reward setting
        setting_stmt = select(SystemSetting).where(SystemSetting.key == "referral_reward")
        setting_res = await session.execute(setting_stmt)
        setting_rec = setting_res.scalar_one_or_none()
        reward = float(setting_rec.value) if setting_rec else settings.REFERRAL_REWARD

        record.status = "QUALIFIED"
        record.reward_amount = reward

        # Credit referrer wallet
        referrer_wallet = await WalletService.get_or_create_wallet(record.referrer_id, session)
        await WalletService.credit_balance(
            wallet_id=referrer_wallet.id,
            amount=reward,
            transaction_type="REFERRAL_REWARD",
            description=f"Referral reward for active creator #{user_id[:8]}",
            session=session,
            reference_type="referral",
            reference_id=record.id
        )

        record.status = "REWARDED"
        await session.flush()
        return record
