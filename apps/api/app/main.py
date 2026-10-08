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
    global engine, AsyncSessionLocal
    # Startup: Ensure tables exist
    db_ready = False
    try:
        async with asyncio.timeout(10):
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        logger.info("Primary database schemas initialized successfully.")
        db_ready = True
    except Exception as e:
        logger.error(f"Failed to connect to primary database ({e}). Reverting to persistent local SQLite.")
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        sqlite_url = "sqlite+aiosqlite:///./rage_cloud.db"
        engine = create_async_engine(sqlite_url, connect_args={"check_same_thread": False})
        AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Local SQLite schemas initialized successfully.")
            db_ready = True
        except Exception as sqlite_err:
            logger.error(f"Fallback SQLite schema initialization failed: {sqlite_err}")

    # Seed Admin & Ad placements if database is ready
    if db_ready:
        try:
            await seed_initial_super_admin()
            async with AsyncSessionLocal() as session:
                await AdService.seed_default_placements(session)
                await session.commit()
        except Exception as seed_err:
            logger.warning(f"Seeding skipped or already initialized: {seed_err}")

    # Connect Redis (optional)
    try:
        await redis_manager.connect()
    except Exception as redis_err:
        logger.warning(f"Redis connection skipped: {redis_err}")

    # Initialize storage provider
    storage = get_storage_service()
    logger.info(f"Storage service ready: {storage.__class__.__name__}")

    # Launch background worker
    worker_task = asyncio.create_task(background_worker_loop())

    yield

    # Shutdown
    worker_task.cancel()
    try:
        await redis_manager.disconnect()
    except Exception:
        pass
    logger.info("RAGE Cloud API shutdown complete.")

app = FastAPI(
    title="RAGE Cloud API",
    description="Creator-focused file sharing and monetization platform backend.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - supports custom domains (ragefps.in, netlify.app, etc.) and credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://rdkcloudservices.netlify.app",
        "https://ragecloudservices.ragefps.in",
        "https://cloudservices.ragefps.in",
        "https://ragefps.in",
        "https://www.ragefps.in",
    ],
    allow_origin_regex=r"https://.*|http://localhost:\d+|http://127\.0\.0\.1:\d+",
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

import traceback

# Global exception handler to capture and log any unhandled runtime errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.method} {request.url}: {exc}\n{traceback.format_exc()}")
    origin = request.headers.get("origin") or "*"
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc), "type": exc.__class__.__name__},
        headers=headers
    )

# Mount APIs
app.include_router(api_v1_router)

@app.get("/", tags=["Root"])
async def root():
    return {
        "app": "RAGE Cloud Services API",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "app": "RAGE Cloud",
        "version": "1.0.0",
        "storage_provider": get_storage_service().__class__.__name__,
        "redis_connected": redis_manager.client is not None,
        "database": "postgresql" if "postgresql" in str(engine.url) else "sqlite"
    }
