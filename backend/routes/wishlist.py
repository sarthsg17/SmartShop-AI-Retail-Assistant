from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.utils.token import get_current_user_from_cookie
from backend.models.wishlist import Wishlist
# from backend.models.auth import User
# from fastapi.templating import Jinja2Templates

router = APIRouter()

@router.post("/add-to-wishlist/{product_id}")
def add_to_wishlist(
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

    # Check if item already exists
    exists = db.query(Wishlist).filter_by(user_id=user_id, product_id=product_id).first()
    if exists:
        return {"message": "Already in wishlist"}

    item = Wishlist(
        user_id=user_id,
        product_id=product_id,
        title=title,
        price=float(price),
        image_url=image
    )
    db.add(item)
    db.commit()
    return {"message": "✅ Added to wishlist!"}

# POST /wishlist/remove/{item_id}
@router.post("/wishlist/remove/{item_id}")
def remove_from_wishlist(item_id: int, db: Session = Depends(get_db), user: int = Depends(get_current_user_from_cookie)):
    wishlist_item = db.query(Wishlist).filter_by(id=item_id, user_id=user).first()
    if wishlist_item:
        db.delete(wishlist_item)
        db.commit()
    return {"status": "removed"}

