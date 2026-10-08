from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.config import settings
from app.models.schema_models import File, VideoView
from app.services.fraud.detector import FraudDetector
from app.services.revenue.engine import RevenueEngine
from app.services.wallet.service import WalletService

router = APIRouter(prefix="/videos", tags=["Video Views"])

class VideoProgressRequest(BaseModel):
    file_id: str
    watch_seconds: int
    total_duration_seconds: int

@router.post("/track")
async def track_video_view(
    req: VideoProgressRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(File).where(File.id == req.file_id, File.is_deleted == False)
    res = await db.execute(stmt)
    file = res.scalar_one_or_none()

    if not file:
        raise HTTPException(status_code=404, detail="Video file not found")

    client_ip = request.client.host if request.client else "127.0.0.1"
    ip_h = FraudDetector.hash_ip(client_ip)

    completion_pct = 0.0
    if req.total_duration_seconds > 0:
        completion_pct = min(100.0, (req.watch_seconds / req.total_duration_seconds) * 100.0)

    # Qualified if watched for at least 10 seconds (configurable)
    is_qualified = req.watch_seconds >= settings.QUALIFIED_VIDEO_MIN_WATCH_SECONDS

    # Estimated revenue for qualified video view
    revenue_gen = 0.25 if is_qualified else 0.0
    creator_rev = revenue_gen * (settings.CREATOR_REVENUE_PERCENT / 100.0) if is_qualified else 0.0

    view = VideoView(
        file_id=file.id,
        user_id=None,
        ip_hash=ip_h,
        watch_seconds=req.watch_seconds,
        completion_percentage=round(completion_pct, 2),
        is_qualified=is_qualified,
        revenue_generated=round(revenue_gen, 4),
        creator_revenue=round(creator_rev, 4)
    )
    db.add(view)
    file.view_count += 1

    if is_qualified and creator_rev > 0:
        creator_wallet = await WalletService.get_or_create_wallet(file.owner_id, db)
        await WalletService.credit_balance(
            wallet_id=creator_wallet.id,
            amount=creator_rev,
            transaction_type="VIDEO_REVENUE",
            description=f"Qualified video view on '{file.name}' ({req.watch_seconds}s)",
            session=db,
            reference_type="video",
            reference_id=file.id
        )

    await db.commit()
    return {
        "status": "success",
        "is_qualified": is_qualified,
        "views": file.view_count
    }
