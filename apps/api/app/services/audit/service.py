import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.schema_models import AuditLog

logger = logging.getLogger("rage.audit")

class AuditService:
    @staticmethod
    async def log_action(
        action: str,
        session: AsyncSession,
        user_id: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[str] = None
    ) -> AuditLog:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            ip_address=ip_address,
            details=details
        )
        session.add(log_entry)
        try:
            await session.flush()
        except Exception as e:
            logger.error(f"Failed to record audit log: {e}")
            try:
                await session.rollback()
            except Exception:
                pass
        return log_entry
