import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.schema_models import User, File, ContentPurchase
from app.schemas.all_schemas import PurchaseContentRequest
from app.services.revenue.engine import RevenueEngine

router = APIRouter(prefix="/products", tags=["Paid Content"])

@router.post("/purchase")
async def purchase_paid_file(
    req: PurchaseContentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(File).where(File.id == req.file_id, File.is_deleted == False)
    res = await db.execute(stmt)
    file = res.scalar_one_or_none()

    if not file:
        raise HTTPException(status_code=404, detail="Content not found")

    if file.visibility != "PAID":
        return {"message": "Content is free to access"}

    # Check if already purchased
    p_stmt = select(ContentPurchase).where(
        ContentPurchase.user_id == current_user.id,
        ContentPurchase.file_id == file.id
    )
    if (await db.execute(p_stmt)).scalar_one_or_none():
        return {"message": "Already purchased", "file_id": file.id}

    # Simulate payment completion & attribute revenue
    tx_ref = f"PAY_{uuid.uuid4().hex[:12].upper()}"
    purchase = ContentPurchase(
        user_id=current_user.id,
        file_id=file.id,
        amount=file.price,
        currency="INR",
        transaction_ref=tx_ref,
        status="COMPLETED"
    )
    db.add(purchase)

    # Process revenue split to creator
    await RevenueEngine.process_content_purchase_revenue(
        file=file,
        buyer_id=current_user.id,
        gross_amount=file.price,
        session=db
    )

    await db.commit()
    return {
        "status": "success",
        "message": f"Successfully purchased access to '{file.name}'",
        "transaction_ref": tx_ref
    }
