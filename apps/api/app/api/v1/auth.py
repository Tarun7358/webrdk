from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.dependencies import get_current_user, rate_limit_dependency
from app.models.schema_models import User
from app.schemas.all_schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    RefreshTokenRequest, UserSummaryResponse
)
from app.services.referral.service import ReferralService
from app.services.wallet.service import WalletService
from app.services.audit.service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"], dependencies=[Depends(rate_limit_dependency)])

@router.post("/register", response_model=TokenResponse)
async def register_user(
    req: UserRegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    # Check duplicate email
    stmt = select(User).where(User.email == req.email.lower())
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Generate unique referral code for the new creator
    ref_code = ReferralService.generate_referral_code()

    # Hash password with bcrypt
    hashed_pw = get_password_hash(req.password)

    new_user = User(
        email=req.email.lower(),
        password_hash=hashed_pw,
        full_name=req.full_name,
        role="CREATOR", # Default role
        referral_code=ref_code,
        is_active=True,
        is_verified=True
    )
    db.add(new_user)
    await db.flush()

    # Process referral if provided
    if req.referral_code:
        await ReferralService.register_referral(req.referral_code, new_user, db)

    # Automatically provision initial wallet
    await WalletService.get_or_create_wallet(new_user.id, db)

    # Log audit event
    client_ip = request.client.host if request.client else "unknown"
    await AuditService.log_action(
        action="USER_CREATED",
        session=db,
        user_id=new_user.id,
        target_type="user",
        target_id=new_user.id,
        ip_address=client_ip,
        details=f"User registered with email {new_user.email}"
    )

    await db.commit()
    await db.refresh(new_user)

    access_token = create_access_token(new_user.id, {"role": new_user.role, "email": new_user.email})
    refresh_token = create_refresh_token(new_user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserSummaryResponse.model_validate(new_user)
    )

@router.post("/login", response_model=TokenResponse)
async def login_user(
    req: UserLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == req.email.lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    client_ip = request.client.host if request.client else "unknown"

    if not user or not verify_password(req.password, user.password_hash):
        await AuditService.log_action(
            action="LOGIN_FAILED",
            session=db,
            ip_address=client_ip,
            details=f"Failed login attempt for {req.email}"
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact platform administration."
        )

    await AuditService.log_action(
        action="LOGIN",
        session=db,
        user_id=user.id,
        ip_address=client_ip,
        details=f"User {user.email} logged in successfully"
    )
    await db.commit()

    access_token = create_access_token(user.id, {"role": user.role, "email": user.email})
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserSummaryResponse.model_validate(user)
    )

@router.post("/refresh")
async def refresh_access_token(
    req: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or not found")

    new_access_token = create_access_token(user.id, {"role": user.role, "email": user.email})
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserSummaryResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return UserSummaryResponse.model_validate(current_user)
