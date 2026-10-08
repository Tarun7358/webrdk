import re
import hashlib
from typing import Dict, Any, List
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.schema_models import Download

BOT_USER_AGENTS = [
    r"bot", r"spider", r"crawl", r"python", r"curl", r"wget",
    r"headless", r"selenium", r"puppeteer", r"playwright",
    r"phantomjs", r"httpclient", r"java/", r"go-http-client",
    r"postman", r"axios", r"aiohttp"
]

class FraudDetector:
    """
    Rule-based fraud and traffic quality engine.
    Calculates a risk score from 0 (clean traffic) to 100 (critical/bot fraud).
    Traffic is only eligible for creator revenue when qualified.
    """

    @staticmethod
    def hash_ip(ip: str) -> str:
        """Privacy-preserving salted SHA-256 IP hash"""
        salt = "rage-cloud-privacy-salt-2026"
        return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()

    @staticmethod
    async def evaluate_download(
        ip: str,
        user_agent: str,
        file_id: str,
        file_size: int,
        elapsed_seconds: float,
        session: AsyncSession
    ) -> Dict[str, Any]:
        risk_score = 0
        signals: List[str] = []
        ip_h = FraudDetector.hash_ip(ip)

        # 1. User Agent Evaluation
        ua_lower = (user_agent or "").lower()
        if not user_agent or len(user_agent) < 10:
            risk_score += 45
            signals.append("Missing or suspiciously brief User-Agent")

        for pattern in BOT_USER_AGENTS:
            if re.search(pattern, ua_lower):
                risk_score += 55
                signals.append(f"Automated tool or bot pattern detected: {pattern}")
                break

        # 2. IP Velocity Check (Downloads in past hour)
        one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).replace(tzinfo=None)
        velocity_stmt = select(func.count(Download.id)).where(
            Download.ip_hash == ip_h,
            Download.created_at >= one_hour_ago
        )
        res = await session.execute(velocity_stmt)
        recent_ip_downloads = res.scalar() or 0

        if recent_ip_downloads > 20:
            risk_score += 40
            signals.append(f"High IP download velocity ({recent_ip_downloads} in 1h)")
        elif recent_ip_downloads > 8:
            risk_score += 20
            signals.append(f"Moderate IP download velocity ({recent_ip_downloads} in 1h)")

        # 3. Repeat Download of identical file from same IP
        repeat_stmt = select(func.count(Download.id)).where(
            Download.ip_hash == ip_h,
            Download.file_id == file_id,
            Download.created_at >= one_hour_ago
        )
        res_repeat = await session.execute(repeat_stmt)
        repeat_count = res_repeat.scalar() or 0

        if repeat_count > 3:
            risk_score += 35
            signals.append(f"Repeated downloads of identical file ({repeat_count} times)")

        # 4. Unrealistic transfer speed / instantaneous session
        if file_size > 5 * 1024 * 1024 and elapsed_seconds < 0.5:
            risk_score += 30
            signals.append(f"Instantaneous download time ({elapsed_seconds}s for {file_size} bytes)")

        # Cap at 100
        final_risk = min(100, max(0, risk_score))

        # Qualified threshold: Low risk (<= 30) qualifies for monetization
        is_qualified = final_risk <= 30

        return {
            "risk_score": final_risk,
            "is_qualified": is_qualified,
            "signals": signals,
            "ip_hash": ip_h
        }
