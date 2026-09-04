import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class Place(Base):
    """Self-referencing tree of locations inside a Space."""

    __tablename__ = "places"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    space_id = Column(GUID(), ForeignKey("spaces.id"), nullable=False)
    parent_place_id = Column(GUID(), ForeignKey("places.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    space = relationship("Space", back_populates="places")
    parent = relationship("Place", remote_side=[id], back_populates="children")
    children = relationship(
        "Place", back_populates="parent", cascade="all, delete-orphan"
    )
