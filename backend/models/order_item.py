from sqlalchemy import Column, Integer, ForeignKey, String, DateTime
from datetime import datetime
from backend.database import Base

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer)
    title = Column(String)
    price = Column(Integer)
    image = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
