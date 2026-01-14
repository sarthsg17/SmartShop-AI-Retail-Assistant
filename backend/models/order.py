from sqlalchemy import Column, Integer, String, DateTime
from backend.database import Base
from datetime import datetime

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    status = Column(String, default="Placed")
    payment_mode = Column(String, default="COD")
    created_at = Column(DateTime, default=datetime.utcnow)
