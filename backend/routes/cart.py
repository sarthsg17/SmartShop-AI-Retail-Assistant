from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.utils.token import get_current_user_from_cookie
from backend.models.cart import CartItem

router = APIRouter()

@router.post("/add-to-cart/{product_id}")
def add_to_cart(
    product_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_from_cookie)
):
    query = request.query_params
    title = query.get("title")
    price = query.get("price")
    image = query.get("image")

    if not (title and price and image):
        raise HTTPException(status_code=400, detail="Missing query parameters")

    # Check if already in cart
    exists = db.query(CartItem).filter_by(user_id=user_id, product_id=product_id).first()
    if exists:
        return {"message": "Already in cart"}

    item = CartItem(
        user_id=user_id,
        product_id=product_id,
        title=title,
        price=float(price),
        image=image
    )
    db.add(item)
    db.commit()
    return {"message": "✅ Added to cart!"}


@router.post("/cart/remove/{item_id}")
def remove_from_cart(
    item_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_from_cookie)
):
    item = db.query(CartItem).filter_by(id=item_id, user_id=user_id).first()
    if item:
        db.delete(item)
        db.commit()
    return RedirectResponse("/cart", status_code=303)
