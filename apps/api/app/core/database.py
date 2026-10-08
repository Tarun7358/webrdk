import os
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

logger = logging.getLogger("rage.database")

def resolve_database_url() -> str:
    url = (
        os.environ.get("DATABASE_URL")
        or os.environ.get("DATABASE_URI")
        or os.environ.get("DATABASE_PUBLIC_URL")
        or getattr(settings, "DATABASE_URL", None)
        or getattr(settings, "DATABASE_URI", None)
    )
    # Check if empty, invalid, or an unrendered variable like ${{Postgres.DATABASE_URL}}
    if not url or not isinstance(url, str) or not url.strip() or url.strip().lower() in ("none", "null") or url.strip().startswith("${{"):
        logger.warning("DATABASE_URL/DATABASE_URI is missing, unrendered, or invalid. Falling back to SQLite.")
        return "sqlite+aiosqlite:///./rage_cloud.db"
    
    clean_url = url.strip()
    if clean_url.startswith("postgres://"):
        clean_url = "postgresql+asyncpg://" + clean_url[len("postgres://"):]
    elif clean_url.startswith("postgresql://") and not clean_url.startswith("postgresql+asyncpg://"):
        clean_url = "postgresql+asyncpg://" + clean_url[len("postgresql://"):]

    if "sslmode=" in clean_url:
        clean_url = clean_url.replace("sslmode=require", "ssl=require").replace("sslmode=prefer", "ssl=prefer").replace("sslmode=disable", "ssl=disable")

    return clean_url

db_url = resolve_database_url()
logger.info(f"Database dialect initialized with: {db_url.split('@')[0] if '@' in db_url else db_url}")

# Create async engine with failover safety
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
elif "postgresql+asyncpg" in db_url:
    connect_args["timeout"] = 10
    connect_args["command_timeout"] = 15

try:
    engine = create_async_engine(
        db_url,
        echo=False,
        future=True,
        connect_args=connect_args
    )
except Exception as e:
    logger.error(f"Failed to initialize database engine for {db_url}: {e}. Safe fallback to SQLite.")
    db_url = "sqlite+aiosqlite:///./rage_cloud.db"
    connect_args = {"check_same_thread": False}
    engine = create_async_engine(
        db_url,
        echo=False,
        future=True,
        connect_args=connect_args
    )

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing database sessions per request"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
