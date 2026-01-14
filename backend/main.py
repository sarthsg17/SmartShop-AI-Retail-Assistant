from fastapi import FastAPI, Request, Depends, Query, Form
from fastapi.responses import HTMLResponse, PlainTextResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from backend.database import Base, engine,get_db
from backend.routes import auth, product_clicks, cart,wishlist,cod_checkout, admin
from backend.utils.token import get_current_user_from_cookie
from backend.models.auth import User
from backend.models.cart import CartItem
from sqlalchemy.orm import Session
from backend.models.wishlist import Wishlist
from backend.routes.tdmodels import model_router
from backend.models.order import Order
from backend.models.order_item import OrderItem
from dotenv import load_dotenv
import os
from groq import Groq
import asyncio
from concurrent.futures import ThreadPoolExecutor

# --------- Load Environment ---------
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# --------- Initialize Groq ---------
groq_client = Groq(api_key=GROQ_API_KEY)
executor = ThreadPoolExecutor()

# --------- FastAPI App ---------
app = FastAPI(debug=True)

# --------- Middleware ---------
app.add_middleware(SessionMiddleware, secret_key="your-secret", https_only=True)

# --------- DB Tables ---------
Base.metadata.create_all(bind=engine)

# --------- Templates & Static ---------
templates = Jinja2Templates(directory="backend/templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# --------- Routers ---------
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(product_clicks.router)
app.include_router(cart.router)
app.include_router(wishlist.router)
app.include_router(model_router)
app.include_router(cod_checkout.router)
app.include_router(admin.router)
# --------- Routes ---------

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
def login_form(request: Request, msg: str = Query(default=None)):
    return templates.TemplateResponse("login.html", {"request": request, "msg": msg})

@app.get("/register", response_class=HTMLResponse)
def register_form(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_from_cookie)):
    user = db.query(User).filter(User.id == user_id).first()
    Order_count = db.query(Order).filter(Order.user_id == user_id).count()
    wishlist_count = db.query(Wishlist).filter(Wishlist.user_id == user_id).count()
    cart_count = db.query(CartItem).filter(CartItem.user_id == user_id).count()

    recent_orders_raw = db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).limit(5).all()

    recent_orders = []
    for order in recent_orders_raw:
        order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        total_price = int(sum(item.price*85 for item in order_items))  # ✅ in INR, integer
        recent_orders.append({
            "id": order.id,
            "date": order.created_at.strftime("%Y-%m-%d"),
            "status": order.status,
            "total": total_price
        })

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "username": user.username if user else "User",
        "total_orders":Order_count,
        "wishlist_count": wishlist_count,
        "cart_count": cart_count,
        "account_type": user.account_type if hasattr(user, 'account_type') else "Standard",
        "recent_orders": recent_orders,
        "reply": None
    })

@app.get("/products", response_class=HTMLResponse)
def products_page(request: Request, user: str = Depends(get_current_user_from_cookie), reply: str = None):
    return templates.TemplateResponse("products.html", {"request": request, "user": user, "reply": reply})

@app.get("/wishlist", response_class=HTMLResponse)
def view_wishlist(request: Request, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_from_cookie)):
    wishlist_items = db.query(Wishlist).filter_by(user_id=user_id).all()

    # Serialize Wishlist objects
    serialized_wishlist = [
        {
            "id": item.id,
            "product_id": item.product_id,
            "title": item.title,
            "price": item.price,
            "image_url": item.image_url
        }
        for item in wishlist_items
    ]

    return templates.TemplateResponse("wishlist.html", {
        "request": request,
        "wishlist": serialized_wishlist
    })

@app.get("/cart", response_class=HTMLResponse)
def view_cart_page(
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_from_cookie)
):
    user_cart = db.query(CartItem).filter_by(user_id=user_id).all()

    # Convert to list of dicts
    cart_data = [
        {
            "id": item.id,
            "product_id": item.product_id,
            "title": item.title,
            "price": item.price,
            "image": item.image
        }
        for item in user_cart
    ]

    return templates.TemplateResponse("cart.html", {
        "request": request,
        "user": user_id,
        "cart": cart_data  # Now serializable
    })

@app.get("/orders", response_class=HTMLResponse)
def view_orders(
    request: Request,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_from_cookie)
):
    orders_raw = db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).all()

    orders = []
    for order in orders_raw:
        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        total = sum(item.price for item in items)
        orders.append({
            "id": order.id,
            "created_at": order.created_at,
            "status": order.status,
            "payment_mode": order.payment_mode,
            "order_items": items,
            "total": total
        })

    return templates.TemplateResponse("orders.html", {"request": request, "orders": orders})

# --------- Groq AI Assistant for /products only ---------

def ask_groq_sync(user_input):
    response = groq_client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {"role": "system", "content": "You're a helpful shopping assistant."},
            {"role": "user", "content": user_input}
        ]
    )
    return response.choices[0].message.content.strip()

@app.post("/ask", response_class=HTMLResponse)
async def ask_ai(
    request: Request,
    user: str = Depends(get_current_user_from_cookie),
    from_page: str = Query(default="products")  # Force AI only on /products
):
    form = await request.form()
    user_input = form.get("message")

    if not user_input:
        return templates.TemplateResponse(f"{from_page}.html", {
            "request": request,
            "user": user,
            "reply": "Please enter a question."
        })

    try:
        reply_raw = await asyncio.get_event_loop().run_in_executor(
            executor, ask_groq_sync, user_input
        )

        reply = f"""
        <table border="1" style="width:100%; border-collapse: collapse; margin-top: 10px;">
            <tr><th style='padding:8px;'>AI Response</th></tr>
            <tr><td style='padding:8px;'>{reply_raw}</td></tr>
        </table>
        """
    except Exception as e:
        print("Groq API error:", e)
        reply = "Sorry, something went wrong. Please try again."

    return templates.TemplateResponse(f"{from_page}.html", {
        "request": request,
        "user": user,
        "reply": reply
    })

@app.post("/api/ask")
async def api_ask_ai(request: Request, user: str = Depends(get_current_user_from_cookie), from_page: str = Query(default="products")):
    form = await request.form()
    user_input = form.get("message")
    if not user_input:
        return JSONResponse({"reply": "Please enter a question."})
    try:
        reply_raw = await asyncio.get_event_loop().run_in_executor(
            executor, ask_groq_sync, user_input
        )
    except Exception as e:
        print("Groq API error:", e)
        reply_raw = "Sorry, something went wrong. Please try again."
    return JSONResponse({"reply": reply_raw})

# --------- Error Handler ---------

@app.exception_handler(404)
async def not_found(request: Request, exc):
    return PlainTextResponse("Page not found", status_code=404)

@app.get("/api/products")
def get_products():
    import requests
    response = requests.get("https://dummyjson.com/products?limit=20")
    return response.json()["products"]



@app.get("/vr-store", response_class=HTMLResponse)
def vr_store_page(request: Request):
    return templates.TemplateResponse("vr_store.html", {"request": request})

# Usage:
# Send a POST request to /add-to-cart/{product_id}?title=PRODUCT_TITLE&price=PRODUCT_PRICE&image=PRODUCT_IMAGE_URL
# Example (JavaScript):
# fetch(`/add-to-cart/123?title=Shoes&price=499&image=https://example.com/shoes.jpg`, { method: 'POST' })
#   .then(response => response.json())
#   .then(data => { if (data.success) alert('✅ Added to cart!'); });
@app.post("/add-to-cart/{product_id}")
def add_to_cart(product_id: int, title: str = Query(...), price: float = Query(...), image: str = Query(...), db: Session = Depends(get_db), user_id: int = Depends(get_current_user_from_cookie)):
    # Add product to user's cart in DB
    cart_item = CartItem(
        user_id=user_id,
        product_id=product_id,
        title=title,
        price=price,
        image=image
    )
    db.add(cart_item)
    db.commit()
    return {"success": True, "message": "Added to cart"}