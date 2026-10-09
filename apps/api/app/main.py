import time
import uuid
import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy import select, text, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal, get_db
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

async def run_db_migrations(conn):
    """Safely apply schema migrations for both PostgreSQL and SQLite"""
    try:
        dialect_name = conn.dialect.name
        logger.info(f"Checking database schema for dialect: {dialect_name}")

        if dialect_name == "postgresql":
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(50) DEFAULT 'FREE';"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT DEFAULT 10737418240;"))
            logger.info("PostgreSQL schema migration completed.")
            # Instagram Auto-DM (Option A session-based) columns
            await conn.execute(text("ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS session_cookie TEXT;"))
            await conn.execute(text("ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);"))
            await conn.execute(text("ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS connection_type VARCHAR(20) DEFAULT 'SESSION' NOT NULL;"))
            await conn.execute(text("ALTER TABLE instagram_accounts ALTER COLUMN access_token DROP NOT NULL;"))
            await conn.execute(text("ALTER TABLE instagram_accounts ALTER COLUMN instagram_business_id DROP NOT NULL;"))
            await conn.execute(text("ALTER TABLE instagram_campaigns ADD COLUMN IF NOT EXISTS post_url VARCHAR(500);"))
            await conn.execute(text("ALTER TABLE instagram_campaigns ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMP;"))
            await conn.execute(text("ALTER TABLE instagram_campaigns ADD COLUMN IF NOT EXISTS target_mode VARCHAR(20) DEFAULT 'SPECIFIC' NOT NULL;"))
            logger.info("PostgreSQL Instagram schema migration completed.")
        else:
            res = await conn.execute(text("PRAGMA table_info(users)"))
            cols = [row[1] for row in res.fetchall()]
            if "plan_tier" not in cols:
                await conn.execute(text("ALTER TABLE users ADD COLUMN plan_tier VARCHAR(50) DEFAULT 'FREE'"))
                logger.info("Added plan_tier column to SQLite users table.")
            if "storage_limit_bytes" not in cols:
                await conn.execute(text("ALTER TABLE users ADD COLUMN storage_limit_bytes BIGINT DEFAULT 10737418240"))
                logger.info("Added storage_limit_bytes column to SQLite users table.")
            for table, col, ddl in [
                ("instagram_accounts", "session_cookie", "TEXT"),
                ("instagram_accounts", "profile_picture_url", "VARCHAR(500)"),
                ("instagram_accounts", "connection_type", "VARCHAR(20) DEFAULT 'SESSION' NOT NULL"),
                ("instagram_campaigns", "post_url", "VARCHAR(500)"),
                ("instagram_campaigns", "last_scanned_at", "DATETIME"),
                ("instagram_campaigns", "target_mode", "VARCHAR(20) DEFAULT 'SPECIFIC' NOT NULL"),
            ]:
                info = await conn.execute(text(f"PRAGMA table_info({table})"))
                existing = [row[1] for row in info.fetchall()]
                if existing and col not in existing:
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}"))
    except Exception as e:
        logger.warning(f"Database schema auto-migration notice: {e}")

async def seed_initial_super_admin():
    """Seeds default super admin and owner for platform access"""
    async with AsyncSessionLocal() as session:
        # 1. Platform Owner (rdxyzprvt@gmail.com)
        owner_email = "rdxyzprvt@gmail.com"
        stmt_owner = select(User).where(func.lower(User.email) == owner_email.lower())
        res_owner = await session.execute(stmt_owner)
        owner = res_owner.scalar_one_or_none()
        if not owner:
            owner = User(
                email=owner_email,
                password_hash=get_password_hash("clasher@2026"),
                full_name="RAGE Platform Owner",
                role="OWNER",
                plan_tier="CREATOR_STUDIO",
                storage_limit_bytes=536870912000,
                is_active=True,
                is_verified=True,
                referral_code=ReferralService.generate_referral_code("OWNER")
            )
            session.add(owner)
            await session.flush()
            owner_wallet = Wallet(
                user_id=owner.id,
                currency="INR",
                available_balance=0.0,
                pending_balance=0.0,
                locked_balance=0.0
            )
            session.add(owner_wallet)
            logger.info("Owner account created: rdxyzprvt@gmail.com with role OWNER")
        else:
            owner.role = "OWNER"
            owner.password_hash = get_password_hash("clasher@2026")
            owner.plan_tier = "CREATOR_STUDIO"
            owner.storage_limit_bytes = 536870912000
            owner.is_active = True
            owner.is_verified = True
            logger.info("Existing account updated to role OWNER: rdxyzprvt@gmail.com")

        # 2. Default Super Admin
        admin_email = "admin@ragecloud.io"
        stmt = select(User).where(func.lower(User.email) == admin_email.lower())
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
            logger.info("Default Super Admin created: admin@ragecloud.io / RageAdmin2026!")

        await session.commit()

async def cleanup_test_accounts():
    """Removes automated test accounts (@test.com) from database on startup"""
    try:
        from app.api.v1.owner import delete_user_data
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(
                or_(
                    User.email.ilike("%@test.com"),
                    User.email.ilike("test_%@test.com")
                )
            )
            res = await session.execute(stmt)
            test_users = list(res.scalars().all())
            to_delete = [u for u in test_users if u.role != "OWNER" and u.email.lower() != "rdxyzprvt@gmail.com"]
            if to_delete:
                logger.info(f"Purging {len(to_delete)} testing accounts from database: {[u.email for u in to_delete]}")
                for u in to_delete:
                    await delete_user_data(session, u.id)
                await session.commit()
                logger.info("Test accounts successfully purged from database.")
    except Exception as e:
        logger.warning(f"Test accounts cleanup notice: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine, AsyncSessionLocal
    # Startup: Ensure tables exist
    db_ready = False
    try:
        async with asyncio.timeout(10):
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await run_db_migrations(conn)
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
                await run_db_migrations(conn)
            logger.info("Local SQLite schemas initialized successfully.")
            db_ready = True
        except Exception as sqlite_err:
            logger.error(f"Fallback SQLite schema initialization failed: {sqlite_err}")

    # Seed Admin & Ad placements if database is ready
    if db_ready:
        try:
            await seed_initial_super_admin()
            await cleanup_test_accounts()
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

    # Launch real-time Instagram comment scanner (auto-DM)
    from app.services.instagram.service import InstagramAutoDmService
    ig_scanner_task = asyncio.create_task(InstagramAutoDmService.run_live_scanner(lambda: AsyncSessionLocal(), 90))

    yield

    # Shutdown
    worker_task.cancel()
    ig_scanner_task.cancel()
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

@app.get("/d/{short_code}", tags=["Shares"])
async def root_share_preview(
    short_code: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from app.api.v1.shares import get_share_preview_html
    return await get_share_preview_html(short_code=short_code, request=request, db=db)

@app.get("/ads.txt", response_class=PlainTextResponse, tags=["Monetization"])
async def get_ads_txt():
    return PlainTextResponse(
        content="google.com, pub-7741649380959948, DIRECT, f08c47fec0942fa0\n",
        media_type="text/plain",
        headers={"Cache-Control": "public, max-age=3600"}
    )



