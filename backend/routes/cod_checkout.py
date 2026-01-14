from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from datetime import datetime

from backend.database import get_db
from backend.models.order import Order
from backend.models.order_item import OrderItem
from backend.models.cart import CartItem
from backend.utils.token import get_current_user_from_cookie

router = APIRouter()

@router.post("/cod-checkout")
def place_cod_order(
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_from_cookie)
):
    order = Order(user_id=user_id, status="Placed", payment_mode="COD")
    db.add(order)
    db.commit()
    db.refresh(order)

    cart_items = db.query(CartItem).filter_by(user_id=user_id).all()
    for item in cart_items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            title=item.title,
            price=item.price,
            image=item.image,
            created_at=datetime.utcnow()
        )
        db.add(order_item)

    db.query(CartItem).filter_by(user_id=user_id).delete()
    db.commit()

    return RedirectResponse(url="/orders", status_code=302)
