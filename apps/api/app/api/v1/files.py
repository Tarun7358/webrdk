import os
import io
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastApiFile, Form, Request
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, rate_limit_dependency
from app.models.schema_models import User, File, ShareLink
from app.schemas.all_schemas import FileResponse, FileUpdateRequest
from app.services.storage.factory import get_storage_service
from app.services.referral.service import ReferralService
from app.services.audit.service import AuditService

router = APIRouter(prefix="/files", tags=["Files"], dependencies=[Depends(rate_limit_dependency)])

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    request: Request,
    file: UploadFile = FastApiFile(...),
    visibility: str = Form("PUBLIC"), # PUBLIC, PRIVATE, UNLISTED, PAID
    price: float = Form(0.0),
    team_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate extension
    filename = file.filename or "unnamed_file"
    parts = filename.rsplit(".", 1)
    extension = parts[-1].lower() if len(parts) > 1 else ""

    if extension not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '.{extension}' is not permitted on RAGE Cloud."
        )

    # Read content into memory / buffer
    contents = await file.read()
    file_size = len(contents)

    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum limit of {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB."
        )

    # Enforce Storage Quota (Free: 10GB, Pro Gamer: 20GB, Creator Studio: 50GB)
    storage_limit = getattr(current_user, "storage_limit_bytes", 10 * 1024 * 1024 * 1024) or (10 * 1024 * 1024 * 1024)
    stmt_usage = select(func.sum(File.size)).where(File.owner_id == current_user.id, File.is_deleted == False)
    res_usage = await db.execute(stmt_usage)
    current_used = res_usage.scalar() or 0
    if current_used + file_size > storage_limit:
        storage_limit_gb = round(storage_limit / (1024 * 1024 * 1024), 1)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Storage quota exceeded! Your current vault limit is {storage_limit_gb} GB. Please upgrade your plan to upload more files."
        )

    # Compute SHA-256 Checksum
    checksum = hashlib.sha256(contents).hexdigest()

    # Determine storage category folder
    folder_category = "public"
    if visibility.upper() == "PRIVATE":
        folder_category = "private"
    elif visibility.upper() == "PAID":
        folder_category = "paid"

    # Upload via StorageService abstraction (Google Drive or LocalStorage fallback)
    storage_svc = get_storage_service()
    bio = io.BytesIO(contents)
    upload_result = await storage_svc.upload(
        file_obj=bio,
        filename=filename,
        mime_type=file.content_type or "application/octet-stream",
        folder_category=folder_category,
        metadata={"owner_id": current_user.id, "checksum": checksum}
    )

    new_file = File(
        owner_id=current_user.id,
        team_id=team_id,
        google_drive_file_id=upload_result.get("file_id") if upload_result.get("storage_backend") == "google_drive" else None,
        storage_key=upload_result.get("storage_key"),
        storage_backend=upload_result.get("storage_backend", "google_drive"),
        name=filename,
        original_name=filename,
        mime_type=file.content_type or "application/octet-stream",
        extension=extension,
        size=file_size,
        checksum=checksum,
        visibility=visibility.upper(),
        status="ACTIVE",
        price=price if visibility.upper() == "PAID" else 0.0,
        download_count=0,
        view_count=0
    )
    db.add(new_file)
    await db.flush()

    # Qualify referral if creator's milestone reached
    await ReferralService.qualify_referral(current_user.id, db)

    # Audit log
    client_ip = request.client.host if request.client else "unknown"
    await AuditService.log_action(
        action="FILE_UPLOADED",
        session=db,
        user_id=current_user.id,
        target_type="file",
        target_id=new_file.id,
        ip_address=client_ip,
        details=f"Uploaded '{new_file.name}' ({file_size} bytes)"
    )

    await db.commit()
    await db.refresh(new_file)

    return FileResponse.model_validate(new_file)

@router.get("/", response_model=List[FileResponse])
async def list_my_files(
    search: Optional[str] = None,
    visibility: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(File).where(
        File.owner_id == current_user.id,
        or_(File.is_deleted == False, File.is_deleted.is_(None)),
        File.status != "DELETED"
    )

    if search:
        query = query.where(or_(File.name.ilike(f"%{search}%"), File.extension.ilike(f"%{search}%")))
    if visibility:
        query = query.where(File.visibility == visibility.upper())

    query = query.order_by(File.created_at.desc())
    res = await db.execute(query)
    files = res.scalars().all()
    return [FileResponse.model_validate(f) for f in files]

@router.get("/usage/summary")
async def get_storage_usage_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(func.coalesce(func.sum(File.size), 0)).where(
        File.owner_id == current_user.id,
        or_(File.is_deleted == False, File.is_deleted.is_(None)),
        File.status != "DELETED"
    )
    res = await db.execute(stmt)
    used = res.scalar() or 0
    limit = getattr(current_user, "storage_limit_bytes", 10 * 1024 * 1024 * 1024) or (10 * 1024 * 1024 * 1024)
    return {
        "storage_used_bytes": int(used),
        "storage_limit_bytes": int(limit),
        "plan_tier": getattr(current_user, "plan_tier", "FREE"),
        "role": current_user.role
    }

@router.get("/{file_id}", response_model=FileResponse)
async def get_file_metadata(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(File).where(File.id == file_id, File.is_deleted == False)
    res = await db.execute(stmt)
    file = res.scalar_one_or_none()

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if file.owner_id != current_user.id and current_user.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Permission denied")

    return FileResponse.model_validate(file)

@router.patch("/{file_id}", response_model=FileResponse)
async def update_file(
    file_id: str,
    req: FileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(File).where(File.id == file_id, File.is_deleted == False)
    res = await db.execute(stmt)
    file = res.scalar_one_or_none()

    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    if file.owner_id != current_user.id and current_user.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Permission denied")

    if req.name is not None:
        file.name = req.name
    if req.visibility is not None:
        file.visibility = req.visibility.upper()
    if req.price is not None:
        file.price = max(0.0, req.price)

    await db.commit()
    await db.refresh(file)
    return FileResponse.model_validate(file)

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(File).where(File.id == file_id)
    res = await db.execute(stmt)
    file = res.scalar_one_or_none()

    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    if file.owner_id != current_user.id and current_user.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Permission denied")

    file.is_deleted = True
    file.status = "DELETED"

    # Call storage provider deletion
    storage_svc = get_storage_service()
    target_key = file.google_drive_file_id or file.storage_key
    if target_key:
        await storage_svc.delete(target_key)

    client_ip = request.client.host if request.client else "unknown"
    await AuditService.log_action(
        action="FILE_DELETED",
        session=db,
        user_id=current_user.id,
        target_type="file",
        target_id=file.id,
        ip_address=client_ip,
        details=f"Deleted file '{file.name}'"
    )

    await db.commit()
    return {"message": "File deleted successfully"}

@router.get("/stream/{file_id}")
async def stream_file(
    file_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Streams file directly from storage provider without exposing credentials or internal URLs
    """
    stmt = select(File).where(File.id == file_id, File.is_deleted == False)
    res = await db.execute(stmt)
    file = res.scalar_one_or_none()

    if not file:
        # Fallback to local storage identifier search
        from app.services.storage.local_storage import LocalStorage
        local_svc = LocalStorage()
        path = local_svc._resolve_path(file_id)
        if path and os.path.exists(path):
            return FileResponse(path=path, media_type="application/octet-stream")
        raise HTTPException(status_code=404, detail="File content not found")

    if file.storage_backend == "local" or not file.google_drive_file_id:
        from app.services.storage.local_storage import LocalStorage
        local_svc = LocalStorage()
        target_key = file.storage_key or file.id
        path = local_svc._resolve_path(target_key)
        if path and os.path.exists(path):
            return FileResponse(
                path=path,
                media_type=file.mime_type,
                filename=file.name
            )
        storage_svc = local_svc
    else:
        storage_svc = get_storage_service()
        target_key = file.google_drive_file_id or file.storage_key or file.id

    try:
        return StreamingResponse(
            storage_svc.download_stream(target_key),
            media_type=file.mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{file.name}"',
                "Content-Length": str(file.size)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stream file from storage: {e}")
