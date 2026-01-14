# backend/routes/auth.py

from fastapi import APIRouter, HTTPException, Depends, Form, Response, Cookie,Request
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from fastapi.templating import Jinja2Templates
from backend.database import SessionLocal
from backend.models.auth import User
from backend.utils.token import create_access_token
from fastapi.responses import RedirectResponse,HTMLResponse
from fastapi import status


router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
templates = Jinja2Templates(directory="backend/templates")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility: Hash password
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Utility: Verify password
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

@router.post("/register")
def register_user(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    existing_user = db.query(User).filter((User.username == username) | (User.email == email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    user = User(
        username=username,
        email=email,
        password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return RedirectResponse(url="/login?msg=Registration%20successful", status_code=status.HTTP_303_SEE_OTHER)

@router.post("/login", response_class=HTMLResponse)
def login_user(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    try:
        # ✅ Admin shortcut login
        if username == "admin" and password == "admin":
            token = create_access_token({"sub": "admin", "role": "admin"})
            request.session["user"] = "admin"
            request.session["role"] = "admin"
            redirect_response = RedirectResponse(url="/admin/dashboard", status_code=status.HTTP_303_SEE_OTHER)
            redirect_response.set_cookie(key="access_token", value=token, httponly=True)
            return redirect_response

        # 🔐 Normal user login
        user = db.query(User).filter(User.username == username).first()
        if not user or not verify_password(password, user.password):
            return templates.TemplateResponse("login.html", {
                "request": request,
                "error": "Invalid username or password"
            })

        token = create_access_token({"sub": user.username})
        request.session["user"] = user.username
        request.session["role"] = "user"
        redirect_response = RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
        redirect_response.set_cookie(key="access_token", value=token, httponly=True)
        return redirect_response

    except Exception as e:
        print("Login error:", e)
        return templates.TemplateResponse("login.html", {
            "request": request,
            "error": "An internal error occurred"
        })

@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request, msg: str = None):
    return templates.TemplateResponse("login.html", {
        "request": request,
        "msg": msg
    })

@router.get("/logout")
def logout_user(request: Request):
    request.session.clear()  # ✅ Clear session
    response = RedirectResponse(url="/login?msg=Successfully%20logged%20out", status_code=303)
    response.delete_cookie("access_token")
    return response



