import uuid

from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class Favorite(Base):
    """A character's favourited place — surfaced in the right-side nav for quick-travel."""

    __tablename__ = "favorites"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    character_id = Column(GUID(), ForeignKey("characters.id"), nullable=False)
    place_id = Column(GUID(), ForeignKey("places.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("character_id", "place_id", name="uq_favorite_character_place"),
    )

    place = relationship("Place")
