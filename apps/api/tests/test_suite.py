import pytest
import pytest_asyncio
import io
import hashlib
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models.base import Base
from app.models.schema_models import User, File, ShareLink, Wallet, WalletTransaction
from app.core.security import get_password_hash, verify_password, create_access_token, decode_token
from app.services.wallet.service import WalletService
from app.services.revenue.engine import RevenueEngine
from app.services.fraud.detector import FraudDetector
from app.services.storage.local_storage import LocalStorage

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def async_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_maker() as session:
        yield session
    await engine.dispose()

def test_password_hashing():
    raw = "SuperSecretGamer123!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_creation():
    user_id = "test-user-123"
    token = create_access_token(user_id, {"role": "CREATOR"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["role"] == "CREATOR"
    assert payload["type"] == "access"

@pytest.mark.asyncio
async def test_wallet_ledger_atomic_operations(async_session: AsyncSession):
    # 1. Create wallet
    wallet = await WalletService.get_or_create_wallet("test-creator-uuid", async_session)
    await async_session.commit()
    assert wallet.available_balance == 0.0

    # 2. Credit balance
    tx1 = await WalletService.credit_balance(
        wallet_id=wallet.id,
        amount=150.0,
        transaction_type="CREATOR_REVENUE",
        description="Qualified download revenue",
        session=async_session
    )
    await async_session.commit()
    assert tx1.amount == 150.0
    assert wallet.available_balance == 150.0

    # 3. Lock for withdrawal
    await WalletService.lock_for_withdrawal(wallet.id, 50.0, async_session)
    await async_session.commit()
    assert wallet.available_balance == 100.0
    assert wallet.locked_balance == 50.0

    # 4. Finalize withdrawal payout
    tx2 = await WalletService.complete_withdrawal(wallet.id, 50.0, "req-999", async_session)
    await async_session.commit()
    assert wallet.locked_balance == 0.0
    assert wallet.available_balance == 100.0
    assert tx2.type == "WITHDRAWAL"

@pytest.mark.asyncio
async def test_fraud_detector_rule_engine(async_session: AsyncSession):
    # Bot user agent check
    eval_bot = await FraudDetector.evaluate_download(
        ip="192.168.1.100",
        user_agent="python-requests/2.31.0",
        file_id="sample-file",
        file_size=1024*1024,
        elapsed_seconds=0.1,
        session=async_session
    )
    assert eval_bot["risk_score"] >= 55
    assert eval_bot["is_qualified"] is False
    assert any("bot" in s.lower() or "python" in s.lower() for s in eval_bot["signals"])

    # Legitimate user agent check
    eval_legit = await FraudDetector.evaluate_download(
        ip="192.168.1.101",
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        file_id="sample-file-2",
        file_size=1024*1024,
        elapsed_seconds=3.5,
        session=async_session
    )
    assert eval_legit["risk_score"] <= 30
    assert eval_legit["is_qualified"] is True

@pytest.mark.asyncio
async def test_storage_service_abstraction():
    storage = LocalStorage(base_dir="./test_tmp_storage")
    fake_content = b"RAGE CLOUD ELITE FILE CONTENT FOR TESTING 2026"
    bio = io.BytesIO(fake_content)

    upload_res = await storage.upload(
        file_obj=bio,
        filename="test_modpack.zip",
        mime_type="application/zip",
        folder_category="public"
    )
    assert upload_res["file_id"] is not None
    assert upload_res["size"] == len(fake_content)

    # Download stream verification
    stream_chunks = []
    async for chunk in storage.download_stream(upload_res["file_id"]):
        stream_chunks.append(chunk)
    assert b"".join(stream_chunks) == fake_content

    # Clean up
    await storage.delete(upload_res["file_id"])

@pytest.mark.asyncio
async def test_file_unlimited_share_and_reset(async_session: AsyncSession):
    from app.api.v1.files import get_or_create_file_share, serialize_file_response
    from app.schemas.all_schemas import FileUpdateRequest
    from app.api.v1.shares import generate_short_code

    # 1. Create a User and a File in the test session
    user = User(
        email="creator@rage.in",
        password_hash="hash",
        full_name="Vault Creator",
        role="CREATOR",
        referral_code="VAULT101"
    )
    async_session.add(user)
    await async_session.flush()

    file = File(
        owner_id=user.id,
        name="game_patch.zip",
        original_name="game_patch.zip",
        mime_type="application/zip",
        extension="zip",
        size=1048576,
        checksum="abcd1234efgh5678",
        visibility="PUBLIC",
        status="ACTIVE"
    )
    async_session.add(file)
    await async_session.flush()

    # 2. Verify get_or_create_file_share creates an UNLIMITED share link
    share = await get_or_create_file_share(file, async_session, user.id)
    await async_session.commit()

    assert share is not None
    assert share.short_code is not None
    assert share.expires_at is None  # UNLIMITED (Never expires)
    assert share.download_limit is None  # UNLIMITED (No download limit)

    # 3. Test serialize_file_response
    resp = serialize_file_response(file, share)
    assert resp.short_code == share.short_code
    assert resp.share_url == f"/d/{share.short_code}"
    assert resp.expires_at is None
    assert resp.download_limit is None

    # 4. Test link reset (generate new short code)
    old_code = share.short_code
    new_code = generate_short_code()
    share.short_code = new_code
    share.download_count = 0
    await async_session.commit()
    await async_session.refresh(share)

    assert share.short_code != old_code
    assert share.download_count == 0
    assert share.expires_at is None  # Remains unlimited
    assert share.download_limit is None  # Remains unlimited

