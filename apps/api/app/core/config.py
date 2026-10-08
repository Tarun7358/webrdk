import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    APP_NAME: str = "RAGE Cloud"
    APP_ENV: str = Field(default="development")
    SECRET_KEY: str = Field(default="rage-cloud-production-secret-key-32chars-min")
    HOST: str = "0.0.0.0"
    PORT: int = Field(default_factory=lambda: int(os.environ.get("PORT", 8000)))
    DEBUG: bool = Field(default_factory=lambda: os.environ.get("DEBUG", "false").lower() == "true")
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    # Database
    DATABASE_URL: str = Field(
        default_factory=lambda: (
            os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./rage_cloud.db")
            .replace("postgres://", "postgresql+asyncpg://")
            .replace("postgresql://", "postgresql+asyncpg://")
            if "postgresql+asyncpg" not in os.environ.get("DATABASE_URL", "") and "sqlite" not in os.environ.get("DATABASE_URL", "")
            else os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./rage_cloud.db")
        )
    )

    # Redis
    REDIS_URL: Optional[str] = Field(default="redis://localhost:6379/0")

    # Google Cloud & Drive Storage
    GOOGLE_CLIENT_ID: Optional[str] = Field(default_factory=lambda: os.environ.get("GOOGLE_CLIENT_ID"))
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default_factory=lambda: os.environ.get("GOOGLE_CLIENT_SECRET"))
    GOOGLE_PROJECT_ID: Optional[str] = Field(default_factory=lambda: os.environ.get("GOOGLE_PROJECT_ID"))
    GOOGLE_DRIVE_FOLDER_ID: Optional[str] = Field(default_factory=lambda: os.environ.get("GOOGLE_DRIVE_FOLDER_ID"))
    GOOGLE_SERVICE_ACCOUNT_JSON: Optional[str] = None
    GOOGLE_OAUTH_CLIENT_SECRETS_FILE: Optional[str] = Field(default_factory=lambda: os.environ.get("GOOGLE_OAUTH_CLIENT_SECRETS_FILE"))
    GOOGLE_TOKEN_FILE: Optional[str] = "./google_token.json"
    GOOGLE_TOKEN_JSON: Optional[str] = None # Direct JSON string for cloud environments (Railway, Render)
    STORAGE_BACKEND: str = Field(default="google_drive") # google_drive, local, s3
    LOCAL_STORAGE_DIR: str = "./storage_uploads"

    # JWT Authentication
    JWT_SECRET: str = Field(default="rage-jwt-access-secret-minimum-32-chars-long")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    # File limits
    MAX_UPLOAD_SIZE: int = 1024 * 1024 * 1024 # 1GB
    ALLOWED_EXTENSIONS: List[str] = [
        "jpg", "jpeg", "png", "gif", "webp", "svg",
        "mp4", "webm", "mov", "mkv", "avi", "mp3", "wav",
        "zip", "rar", "7z", "tar", "gz",
        "pdf", "docx", "xlsx", "pptx", "txt", "md",
        "iso", "apk", "exe", "bin"
    ]

    # Revenue Engine Defaults
    CREATOR_REVENUE_PERCENT: float = 60.0
    PLATFORM_REVENUE_PERCENT: float = 40.0
    TEAM_DEFAULT_SPLIT_PERCENT: float = 30.0
    REFERRAL_REWARD: float = 50.0
    MIN_WITHDRAWAL_AMOUNT: float = 100.0

    # Ad Network
    AD_PROVIDER: str = "mock" # mock, adsense, ad_manager
    AD_NETWORK_PUBLISHER_ID: str = "ca-pub-rage-network"

    # Anti-Fraud & Quality
    QUALIFIED_DOWNLOAD_MIN_SECONDS: int = 3
    QUALIFIED_VIDEO_MIN_WATCH_SECONDS: int = 10
    MAX_DOWNLOADS_PER_IP_PER_HOUR: int = 25
    BOT_DETECTION_STRICT_MODE: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
