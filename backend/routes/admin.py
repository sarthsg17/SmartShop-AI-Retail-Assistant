from fastapi import APIRouter, Request, Depends, Form, UploadFile, File
from fastapi.responses import RedirectResponse, HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import SessionLocal, get_db
from backend.models.auth import User
from backend.models.product_click import ProductClick
from backend.models.cart import CartItem
from backend.models.wishlist import Wishlist
from backend.models.order_item import OrderItem
from datetime import datetime, timedelta
import shutil
import os

router = APIRouter()
templates = Jinja2Templates(directory="backend/templates")

UPLOAD_DIR = "static/3Dmodels"

@router.get("/admin/dashboard", response_class=HTMLResponse)
def admin_dashboard(request: Request):
    user = request.session.get("user")
    role = request.session.get("role")
    if not user or role != "admin":
        return RedirectResponse(url="/login?msg=Admin%20login%20required", status_code=303)
    return templates.TemplateResponse("admin_dashboard.html", {"request": request, "user": user})

@router.get("/admin/users", response_class=HTMLResponse)
def view_all_users(request: Request, db: Session = Depends(get_db)):
    user = request.session.get("user")
    role = request.session.get("role")
    if not user or role != "admin":
        return RedirectResponse(url="/login?msg=Admin%20login%20required", status_code=303)

    users = db.query(User).all()
    return templates.TemplateResponse("admin_users.html", {
        "request": request,
        "users": users
    })

@router.post("/admin/activate/{user_id}")
def activate_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_active = True
        db.commit()
    return RedirectResponse(url="/admin/users", status_code=303)

@router.post("/admin/deactivate/{user_id}")
def deactivate_user(user_id: int, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_active = False
        db.commit()
    return RedirectResponse(url="/admin/users", status_code=303)

@router.get("/admin/upload-model", response_class=HTMLResponse)
def upload_model_page(request: Request, msg: str = None, error: str = None):
    try:
        files = os.listdir(UPLOAD_DIR)
        glb_files = [f for f in files if f.endswith(".glb")]
    except:
        glb_files = []
    return templates.TemplateResponse("admin_upload_model.html", {
        "request": request,
        "msg": msg,
        "error": error,
        "models": glb_files
    })

@router.post("/admin/upload-model", response_class=HTMLResponse)
async def upload_model_post(
    request: Request,
    product_id: str = Form(...),
    file: UploadFile = File(...)
):
    if not file.filename.endswith(".glb"):
        return RedirectResponse(url="/admin/upload-model?error=Only%20.glb%20files%20allowed", status_code=303)

    filename = f"{product_id}.glb"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return RedirectResponse(url="/admin/upload-model?msg=Model%20uploaded%20successfully", status_code=303)
    except:
        return RedirectResponse(url="/admin/upload-model?error=Upload%20failed", status_code=303)

@router.post("/admin/delete-model", response_class=RedirectResponse)
def delete_model(filename: str = Form(...)):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return RedirectResponse(url="/admin/upload-model?msg=Model%20deleted", status_code=303)
    return RedirectResponse(url="/admin/upload-model?error=Model%20not%20found", status_code=303)

@router.get("/admin/analytics", response_class=HTMLResponse)
def analytics_dashboard(request: Request):
    user = request.session.get("user")
    role = request.session.get("role")
    if not user or role != "admin":
        return RedirectResponse(url="/login?msg=Admin%20login%20required", status_code=303)
    # Pass empty stats to avoid Jinja2 error
    return templates.TemplateResponse("admin_analytics.html", {
    "request": request,
    "stats": {}
})

@router.get("/admin/analytics/data")
def get_analytics_data(db: Session = Depends(get_db)):
    # Daily/weekly/monthly visits (approximated using ProductClick timestamps)
    now = datetime.utcnow()
    one_day_ago = now - timedelta(days=1)
    one_week_ago = now - timedelta(weeks=1)
    one_month_ago = now - timedelta(days=30)

    daily_visits = db.query(ProductClick).filter(ProductClick.timestamp >= one_day_ago).count()
    weekly_visits = db.query(ProductClick).filter(ProductClick.timestamp >= one_week_ago).count()
    monthly_visits = db.query(ProductClick).filter(ProductClick.timestamp >= one_month_ago).count()

    # Most viewed products
    product_views = (
        db.query(ProductClick.product_id, func.count().label("clicks"))
        .group_by(ProductClick.product_id)
        .order_by(func.count().desc())
        .limit(5)
        .all()
    )
    most_viewed_products = [{"product_id": pid, "clicks": clicks} for pid, clicks in product_views]

    # Sales trends (order item counts over past 7 days)
    sales_trend = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        next_day = day + timedelta(days=1)
        daily_sales = (
            db.query(OrderItem)
            .filter(OrderItem.created_at >= day, OrderItem.created_at < next_day)
            .count()
        )
        sales_trend.append({
            "date": day.strftime("%Y-%m-%d"),
            "sales": daily_sales
        })

    # Wishlist and cart data counts
    wishlist_count = db.query(Wishlist).count()
    cart_count = db.query(CartItem).count()

    return JSONResponse({
        "daily_visits": daily_visits,
        "weekly_visits": weekly_visits,
        "monthly_visits": monthly_visits,
        "most_viewed_products": most_viewed_products,
        "sales_trend": sales_trend,
        "wishlist_count": wishlist_count,
        "cart_count": cart_count
    })