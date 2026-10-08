import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.schema_models import Wallet, WalletTransaction

logger = logging.getLogger("rage.wallet.service")

class WalletService:
    """
    Financial ledger and wallet management service.
    Guarantees that every balance alteration is backed by an immutable WalletTransaction.
    """

    @staticmethod
    async def get_or_create_wallet(user_id: str, session: AsyncSession) -> Wallet:
        stmt = select(Wallet).where(Wallet.user_id == user_id)
        result = await session.execute(stmt)
        wallet = result.scalar_one_or_none()
        if not wallet:
            wallet = Wallet(
                user_id=user_id,
                currency="INR",
                available_balance=0.0,
                pending_balance=0.0,
                locked_balance=0.0
            )
            session.add(wallet)
            await session.flush()
        return wallet

    @staticmethod
    async def credit_balance(
        wallet_id: str,
        amount: float,
        transaction_type: str,
        description: str,
        session: AsyncSession,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None
    ) -> WalletTransaction:
        """
        Credits funds to wallet available balance and logs an immutable ledger entry.
        """
        if amount <= 0:
            raise ValueError("Credit amount must be positive.")

        stmt = select(Wallet).where(Wallet.id == wallet_id).with_for_update()
        result = await session.execute(stmt)
        wallet = result.scalar_one()

        wallet.available_balance += round(amount, 4)

        tx = WalletTransaction(
            wallet_id=wallet.id,
            type=transaction_type,
            amount=round(amount, 4),
            currency=wallet.currency,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description,
            status="COMPLETED"
        )
        session.add(tx)
        await session.flush()
        logger.info(f"Credited {amount} to wallet {wallet_id}. New available balance: {wallet.available_balance}")
        return tx

    @staticmethod
    async def debit_balance(
        wallet_id: str,
        amount: float,
        transaction_type: str,
        description: str,
        session: AsyncSession,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None
    ) -> WalletTransaction:
        """
        Debits funds from wallet available balance and logs an immutable ledger entry.
        """
        if amount <= 0:
            raise ValueError("Debit amount must be positive.")

        stmt = select(Wallet).where(Wallet.id == wallet_id).with_for_update()
        result = await session.execute(stmt)
        wallet = result.scalar_one()

        if wallet.available_balance < amount:
            raise ValueError(f"Insufficient funds: available {wallet.available_balance}, requested {amount}")

        wallet.available_balance -= round(amount, 4)

        tx = WalletTransaction(
            wallet_id=wallet.id,
            type=transaction_type,
            amount=-round(amount, 4),
            currency=wallet.currency,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description,
            status="COMPLETED"
        )
        session.add(tx)
        await session.flush()
        logger.info(f"Debited {amount} from wallet {wallet_id}. New available balance: {wallet.available_balance}")
        return tx

    @staticmethod
    async def lock_for_withdrawal(
        wallet_id: str,
        amount: float,
        session: AsyncSession
    ) -> None:
        """Moves funds from available_balance to locked_balance during withdrawal review"""
        stmt = select(Wallet).where(Wallet.id == wallet_id).with_for_update()
        result = await session.execute(stmt)
        wallet = result.scalar_one()

        if wallet.available_balance < amount:
            raise ValueError("Insufficient balance for withdrawal.")

        wallet.available_balance -= round(amount, 4)
        wallet.locked_balance += round(amount, 4)
        await session.flush()

    @staticmethod
    async def release_locked_withdrawal(
        wallet_id: str,
        amount: float,
        session: AsyncSession
    ) -> None:
        """Reverts locked funds back to available_balance if withdrawal is rejected/cancelled"""
        stmt = select(Wallet).where(Wallet.id == wallet_id).with_for_update()
        result = await session.execute(stmt)
        wallet = result.scalar_one()

        wallet.locked_balance = max(0.0, wallet.locked_balance - round(amount, 4))
        wallet.available_balance += round(amount, 4)
        await session.flush()

    @staticmethod
    async def complete_withdrawal(
        wallet_id: str,
        amount: float,
        withdrawal_id: str,
        session: AsyncSession
    ) -> WalletTransaction:
        """Permanently clears locked funds upon completed payout and creates debit transaction"""
        stmt = select(Wallet).where(Wallet.id == wallet_id).with_for_update()
        result = await session.execute(stmt)
        wallet = result.scalar_one()

        wallet.locked_balance = max(0.0, wallet.locked_balance - round(amount, 4))

        tx = WalletTransaction(
            wallet_id=wallet.id,
            type="WITHDRAWAL",
            amount=-round(amount, 4),
            currency=wallet.currency,
            reference_type="withdrawal",
            reference_id=withdrawal_id,
            description=f"Withdrawal payout completed for request #{withdrawal_id[:8]}",
            status="COMPLETED"
        )
        session.add(tx)
        await session.flush()
        return tx
