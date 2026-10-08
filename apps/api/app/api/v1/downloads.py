import os
import time
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import rate_limit_dependency
from app.models.schema_models import File, ShareLink, Download, User
from app.services.storage.factory import get_storage_service
from app.services.fraud.detector import FraudDetector
from app.services.revenue.engine import RevenueEngine

router = APIRouter(prefix="/download", tags=["Download Flow"], dependencies=[Depends(rate_limit_dependency)])

@router.get("/{short_code}")
async def trigger_download(
    short_code: str,
    request: Request,
    password: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Downloads file through share link with fraud qualification & creator revenue attribution.
    """
    start_time = time.time()

    stmt = select(ShareLink, File).join(
        File, ShareLink.file_id == File.id
    ).where(ShareLink.short_code == short_code, ShareLink.is_active == True)

    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Download link not found")

    share_link, file = row

    # Password check
    if share_link.password_hash and not password:
        raise HTTPException(status_code=401, detail="Password required to download this file")

    # Paid check
    if file.visibility == "PAID":
        # Check purchase verification in real production; here requires purchase
        raise HTTPException(status_code=402, detail="This is paid content. Please complete purchase to download.")

    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "")
    elapsed = max(0.1, time.time() - start_time)

    # Evaluate traffic quality & bot score
    fraud_eval = await FraudDetector.evaluate_download(
        ip=client_ip,
        user_agent=user_agent,
        file_id=file.id,
        file_size=file.size,
        elapsed_seconds=elapsed,
        session=db
    )

    # Check file existence BEFORE recording download to prevent counting failed 404 requests
    local_path = None
    if file.storage_backend == "local" or not file.google_drive_file_id:
        from app.services.storage.local_storage import LocalStorage
        local_svc = LocalStorage()
        target_key = file.storage_key or file.id
        local_path = local_svc._resolve_path(target_key)
        if not local_path or not os.path.exists(local_path):
            raise HTTPException(
                status_code=404,
                detail=f"File binary '{file.name}' was not found on the local storage server (it may have been uploaded prior to a server restart). Please upload the file again."
            )

    # Prevent rapid duplicate spam from inflating counts (15 second window per IP)
    fifteen_sec_ago = (datetime.now(timezone.utc) - timedelta(seconds=15)).replace(tzinfo=None)
    recent_dup_stmt = select(Download.id).where(
        Download.ip_hash == fraud_eval["ip_hash"],
        Download.file_id == file.id,
        Download.created_at >= fifteen_sec_ago
    )
    dup_res = await db.execute(recent_dup_stmt)
    is_rapid_duplicate = dup_res.first() is not None

    if not is_rapid_duplicate:
        # Record download entry
        dl = Download(
            file_id=file.id,
            share_link_id=share_link.id,
            user_id=None,
            ip_hash=fraud_eval["ip_hash"],
            country="IN",
            device="mobile" if "mobile" in user_agent.lower() else "desktop",
            browser="chrome" if "chrome" in user_agent.lower() else "generic",
            bytes_transferred=file.size,
            completion_status=True,
            risk_score=fraud_eval["risk_score"]
        )
        db.add(dl)
        await db.flush()

        # Update download counts
        file.download_count += 1
        share_link.download_count += 1

        # Qualified Download Revenue Engine Check
        if fraud_eval["is_qualified"]:
            await RevenueEngine.process_qualified_download_revenue(
                download_id=dl.id,
                file=file,
                fraud_score=fraud_eval["risk_score"],
                session=db
            )

        await db.commit()

    # Stream file securely
    if local_path:
        from fastapi.responses import FileResponse
        return FileResponse(
            path=local_path,
            media_type=file.mime_type,
            filename=file.name,
            headers={
                "X-RAGE-Traffic-Status": "QUALIFIED" if fraud_eval["is_qualified"] else "UNQUALIFIED"
            }
        )
    else:
        storage_svc = get_storage_service()
        target_key = file.google_drive_file_id or file.storage_key or file.id

    try:
        return StreamingResponse(
            storage_svc.download_stream(target_key),
            media_type=file.mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{file.name}"',
                "Content-Length": str(file.size),
                "X-RAGE-Traffic-Status": "QUALIFIED" if fraud_eval["is_qualified"] else "UNQUALIFIED"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage streaming error: {e}")
