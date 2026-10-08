from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.files import router as files_router
from app.api.v1.shares import router as shares_router
from app.api.v1.downloads import router as downloads_router
from app.api.v1.videos import router as videos_router
from app.api.v1.creators import router as creators_router
from app.api.v1.wallet import router as wallet_router
from app.api.v1.teams import router as teams_router
from app.api.v1.referrals import router as referrals_router
from app.api.v1.products import router as products_router
from app.api.v1.subscriptions import router as subscriptions_router
from app.api.v1.ads import router as ads_router
from app.api.v1.admin import router as admin_router
from app.api.v1.owner import router as owner_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(files_router)
api_v1_router.include_router(shares_router)
api_v1_router.include_router(downloads_router)
api_v1_router.include_router(videos_router)
api_v1_router.include_router(creators_router)
api_v1_router.include_router(wallet_router)
api_v1_router.include_router(teams_router)
api_v1_router.include_router(referrals_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(subscriptions_router)
api_v1_router.include_router(ads_router)
api_v1_router.include_router(admin_router)
api_v1_router.include_router(owner_router)

