from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.ad.service import AdService
from app.services.fraud.detector import FraudDetector

router = APIRouter(prefix="/ads", tags=["Advertisements"])

class AdEventRequest(BaseModel):
    placement_id: str
    event_type: str # IMPRESSION, CLICK

@router.get("/placements/{page}")
async def get_placements(page: str, db: AsyncSession = Depends(get_db)):
    return await AdService.get_active_placements_for_page(page, db)

@router.post("/event")
async def record_ad_event(
    req: AdEventRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    ip_h = FraudDetector.hash_ip(client_ip)
    event = await AdService.record_event(
        placement_id=req.placement_id,
        event_type=req.event_type.upper(),
        ip_hash=ip_h,
        session=db
    )
    await db.commit()
    return {"status": "recorded", "id": event.id if event else None}
