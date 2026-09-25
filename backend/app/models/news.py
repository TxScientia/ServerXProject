import uuid

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import expression, func

from ..database import Base
from ..types import GUID


class NewsItem(Base):
    """Reusable news item for global system news and space-scoped plot news."""

    __tablename__ = "news_items"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    scope_type = Column(String, nullable=False)  # 'global' | 'space'
    space_id = Column(GUID(), ForeignKey("spaces.id"), nullable=True)
    title = Column(String, nullable=False)
    body = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    kind = Column(String, nullable=False, default="info", server_default="info")
    pinned = Column(Boolean, nullable=False, default=False, server_default=expression.false())
    author_account_id = Column(GUID(), ForeignKey("accounts.id"), nullable=False)
    author_character_id = Column(GUID(), ForeignKey("characters.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)

    space = relationship("Space", back_populates="news_items")
    author_account = relationship("Account", foreign_keys=[author_account_id])
    author_character = relationship("Character", foreign_keys=[author_character_id])
    reads = relationship("NewsItemRead", back_populates="news_item", cascade="all, delete-orphan")
