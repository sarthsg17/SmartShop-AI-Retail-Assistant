from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base
from backend.models.auth import User  # Make sure to import User model for relationship reference

class Wishlist(Base):
    __tablename__ = "wishlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    product_id = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    price = Column(Float, nullable=False)
    image_url = Column(String(255), nullable=False)

    user = relationship("User", backref="wishlist_items")
