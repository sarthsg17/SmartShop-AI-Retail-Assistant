from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.order import Order
from backend.utils.token import get_current_user_from_cookie

router = APIRouter()

@router.get("/orders", response_class=HTMLResponse)
def view_orders(request: Request, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_from_cookie)):
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    return request.app.templates.TemplateResponse("orders.html", {"request": request, "orders": orders})
