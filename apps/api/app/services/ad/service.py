import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.schema_models import AdPlacement, AdEvent

logger = logging.getLogger("rage.ad.service")

class AdService:
    DEFAULT_PLACEMENTS = [
        {"placement": "download_top", "cpm": 18.0},
        {"placement": "download_middle", "cpm": 22.0},
        {"placement": "download_bottom", "cpm": 15.0},
        {"placement": "video_page", "cpm": 30.0},
        {"placement": "dashboard", "cpm": 10.0},
        {"placement": "public_file_page", "cpm": 14.0},
    ]

    @classmethod
    async def seed_default_placements(cls, session: AsyncSession):
        for item in cls.DEFAULT_PLACEMENTS:
            stmt = select(AdPlacement).where(AdPlacement.placement == item["placement"])
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                placement = AdPlacement(
                    provider="rage_display_network",
                    placement=item["placement"],
                    status="ACTIVE",
                    estimated_cpm=item["cpm"]
                )
                session.add(placement)
        await session.flush()

    @classmethod
    async def get_active_placements_for_page(cls, page_type: str, session: AsyncSession) -> List[Dict[str, Any]]:
        stmt = select(AdPlacement).where(
            AdPlacement.placement.like(f"%{page_type}%"),
            AdPlacement.status == "ACTIVE"
        )
        res = await session.execute(stmt)
        placements = res.scalars().all()

        return [
            {
                "id": p.id,
                "placement": p.placement,
                "provider": p.provider,
                "banner_title": "RAGE Cloud Sponsor: Elite Game Servers & Cloud VPS",
                "banner_desc": "Deploy low-ping gaming nodes instantly with DDoS shielding.",
                "banner_image": "/assets/ads/gamer_ad.webp",
                "cta_text": "Claim 40% Off",
                "cta_url": "https://ragecloud.io/partners/promo"
            }
            for p in placements
        ]

    @classmethod
    async def record_event(
        cls,
        placement_id: str,
        event_type: str,
        ip_hash: str,
        session: AsyncSession
    ) -> Optional[AdEvent]:
        stmt = select(AdPlacement).where(AdPlacement.id == placement_id)
        res = await session.execute(stmt)
        placement = res.scalar_one_or_none()
        if not placement:
            return None

        if event_type == "IMPRESSION":
            placement.impressions += 1
            rev = placement.estimated_cpm / 1000.0
        else:
            placement.clicks += 1
            rev = 0.50

        event = AdEvent(
            placement_id=placement.id,
            ip_hash=ip_hash,
            event_type=event_type,
            revenue=rev
        )
        session.add(event)
        await session.flush()
        return event
