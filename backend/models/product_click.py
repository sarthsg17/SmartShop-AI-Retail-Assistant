from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend.database import Base

class ProductClick(Base):
    __tablename__ = "product_clicks"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
