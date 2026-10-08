import time
import uuid
import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.redis import redis_manager
from app.core.security import get_password_hash
from app.models.schema_models import User, Wallet
from app.services.ad.service import AdService
from app.services.referral.service import ReferralService
from app.services.storage.factory import get_storage_service
from app.workers.tasks import background_worker_loop
from app.api.v1 import api_v1_router

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("rage.api")

async def seed_initial_super_admin():
    """Seeds default super admin for initial deployment access"""
    async with AsyncSessionLocal() as session:
        admin_email = "admin@ragecloud.io"
        stmt = select(User).where(User.email == admin_email)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            admin = User(
                email=admin_email,
                password_hash=get_password_hash("RageAdmin2026!"),
                full_name="RAGE Super Administrator",
                role="SUPER_ADMIN",
                is_active=True,
                is_verified=True,
                referral_code=ReferralService.generate_referral_code("ADMIN")
            )
            session.add(admin)
            await session.flush()

            # Provision admin wallet
            admin_wallet = Wallet(
                user_id=admin.id,
                currency="INR",
                available_balance=0.0,
                pending_balance=0.0,
                locked_balance=0.0
            )
            session.add(admin_wallet)
            await session.commit()
            logger.info("Default Super Admin created: admin@ragecloud.io / RageAdmin2026!")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schemas initialized.")

    # Seed Admin & Ad placements
    await seed_initial_super_admin()
    async with AsyncSessionLocal() as session:
        await AdService.seed_default_placements(session)
        await session.commit()

    # Connect Redis
    await redis_manager.connect()

    # Initialize storage provider
    storage = get_storage_service()
    logger.info(f"Storage service ready: {storage.__class__.__name__}")

    # Launch background worker
    worker_task = asyncio.create_task(background_worker_loop())

    yield

    # Shutdown
    worker_task.cancel()
    await redis_manager.disconnect()
    logger.info("RAGE Cloud API shutdown complete.")

app = FastAPI(
    title="RAGE Cloud API",
    description="Creator-focused file sharing and monetization platform backend.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Structured request logging middleware
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    req_id = str(uuid.uuid4())[:8]
    start = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start) * 1000, 2)
    logger.info(f"[{req_id}] {request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)")
    response.headers["X-Request-ID"] = req_id
    return response

# Mount APIs
app.include_router(api_v1_router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "app": "RAGE Cloud",
        "version": "1.0.0",
        "storage_provider": get_storage_service().__class__.__name__,
        "redis_connected": redis_manager.client is not None
    }
