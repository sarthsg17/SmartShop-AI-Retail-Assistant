# backend/models/cart.py

from sqlalchemy import Column, Integer, String, Float
from backend.database import Base

class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    product_id = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    image = Column(String, nullable=False)
