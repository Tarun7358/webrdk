from datetime import datetime, timedelta
import secrets
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.core.database import get_db

logger = logging.getLogger("rage.auth")
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.dependencies import get_current_user, rate_limit_dependency
from app.models.schema_models import User, PasswordResetOTP
from app.schemas.all_schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    RefreshTokenRequest, UserSummaryResponse,
    ForgotPasswordRequest, ResetPasswordRequest
)
from app.services.referral.service import ReferralService
from app.services.wallet.service import WalletService
from app.services.audit.service import AuditService
from app.services.email_service import EmailService

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
        plan_tier="FREE",
        storage_limit_bytes=10 * 1024 * 1024 * 1024, # 10 GB Free starter
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

    # Trigger welcome email in background task
    asyncio.create_task(EmailService.send_welcome_email(new_user.email, new_user.full_name))

    access_token = create_access_token(new_user.id, {"role": new_user.role, "email": new_user.email})
    refresh_token = create_refresh_token(new_user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserSummaryResponse.model_validate(new_user)
    )

@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == req.email.lower())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if user and user.is_active:
        otp_code = f"{secrets.randbelow(900000) + 100000}"
        otp_record = PasswordResetOTP(
            email=user.email,
            otp_code=otp_code,
            expires_at=datetime.utcnow() + timedelta(minutes=15),
            is_used=False
        )
        db.add(otp_record)
        await db.commit()

        # Dispatch OTP verification email via GoDaddy SMTP
        asyncio.create_task(EmailService.send_otp_email(user.email, otp_code))

    return {
        "status": "success",
        "message": "If an account exists with this email address, a 6-digit password reset code has been sent."
    }

@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(PasswordResetOTP)
        .where(
            PasswordResetOTP.email == req.email.lower(),
            PasswordResetOTP.otp_code == req.otp_code.strip(),
            PasswordResetOTP.is_used == False,
            PasswordResetOTP.expires_at > datetime.utcnow()
        )
        .order_by(desc(PasswordResetOTP.created_at))
    )
    res = await db.execute(stmt)
    otp_record = res.scalar_one_or_none()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code. Please request a new one."
        )

    # Find the user
    user_stmt = select(User).where(User.email == req.email.lower())
    user_res = await db.execute(user_stmt)
    user = user_res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    # Mark OTP used and update password
    otp_record.is_used = True
    user.password_hash = get_password_hash(req.new_password)
    await db.commit()

    return {
        "status": "success",
        "message": "Password successfully reset! You can now log in with your new password."
    }


@router.post("/login", response_model=TokenResponse)
async def login_user(
    req: UserLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    try:
        clean_email = req.email.lower().strip()
        stmt = select(User).where(func.lower(User.email) == clean_email)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        client_ip = request.client.host if request.client else "unknown"

        if not user or not verify_password(req.password, user.password_hash):
            try:
                await AuditService.log_action(
                    action="LOGIN_FAILED",
                    session=db,
                    ip_address=client_ip,
                    details=f"Failed login attempt for {req.email}"
                )
                await db.commit()
            except Exception:
                pass
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been suspended. Please contact platform administration."
            )

        try:
            await AuditService.log_action(
                action="LOGIN",
                session=db,
                user_id=user.id,
                ip_address=client_ip,
                details=f"User {user.email} logged in successfully"
            )
            await db.commit()
        except Exception:
            pass

        access_token = create_access_token(user.id, {"role": user.role, "email": user.email})
        refresh_token = create_refresh_token(user.id)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserSummaryResponse.model_validate(user)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in login_user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
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
