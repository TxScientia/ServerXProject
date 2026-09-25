from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class NewsItemRead(Base):
    """Per-account read receipt for global news items."""

    __tablename__ = "news_item_reads"

    news_item_id = Column(GUID(), ForeignKey("news_items.id"), primary_key=True)
    account_id = Column(GUID(), ForeignKey("accounts.id"), primary_key=True)
    read_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    news_item = relationship("NewsItem", back_populates="reads")
    account = relationship("Account")
