from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from backend.database import get_db
from backend.models.product_click import ProductClick
from backend.utils.token import get_current_user_from_cookie

router = APIRouter()

@router.post("/track-click")
async def track_click(
    request: Request,
    db: Session = Depends(get_db)
):
    user_id = get_current_user_from_cookie(request)
    data = await request.json()
    product_id = data.get("product_id")
    if not product_id:
        return {"error": "Missing product_id"}

    click = ProductClick(product_id=product_id, user_id=user_id)
    db.add(click)
    db.commit()
    return {"message": "Click tracked"}

@router.get("/top-clicked")
def get_top_clicked(request: Request, db: Session = Depends(get_db)):
    try:
        user_id = get_current_user_from_cookie(request)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Authentication required to see personalized clicks")

    top_ids = (
        db.query(ProductClick.product_id)
        .filter(ProductClick.user_id == user_id)
        .group_by(ProductClick.product_id)
        .order_by(func.count().desc())
        .limit(10)
        .all()
    )
    return [pid[0] for pid in top_ids]
