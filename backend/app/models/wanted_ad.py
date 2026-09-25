import uuid

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class WantedAd(Base):
    """Scoped wanted ad / RP search (global or space/plot)."""

    __tablename__ = "wanted_ads"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    scope_type = Column(String, nullable=False)  # 'global' | 'space'
    space_id = Column(GUID(), ForeignKey("spaces.id"), nullable=True)
    title = Column(String, nullable=False)
    body = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    author_character_id = Column(GUID(), ForeignKey("characters.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    space = relationship("Space", back_populates="wanted_ads")
    author_character = relationship("Character")
