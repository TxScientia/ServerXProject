import uuid

from sqlalchemy import JSON, Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class Message(Base):
    """A character-to-character message in a chat.

    Body is Tiptap JSON (same format as posts), never HTML.
    """

    __tablename__ = "messages"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    chat_id = Column(GUID(), ForeignKey("chats.id"), nullable=False)
    from_character_id = Column(GUID(), ForeignKey("characters.id"), nullable=False)
    body = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    chat = relationship("Chat", back_populates="messages")
    from_character = relationship("Character")


class SystemMessage(Base):
    """An account-level system notification: invites, still-playing requests, plot links, or news.

    Bidirectional for requests (still_playing, invite, plot_link): from_account sends the request,
    to_account responds. One-way for news (system_news): from admin.

    Response tracks what action the receiver took (if action_required).
    """

    __tablename__ = "system_messages"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    from_account_id = Column(GUID(), ForeignKey("accounts.id"), nullable=False)
    to_account_id = Column(GUID(), ForeignKey("accounts.id"), nullable=False)
    type = Column(String, nullable=False)  # 'still_playing' | 'invite' | 'plot_link' | 'system_news'
    content = Column(String, nullable=False)  # the human-readable message
    action_required = Column(String, nullable=False, default=False, server_default="false")  # bool as string for SQLite
    data = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # request details: {location_id, plot_id, etc}
    response = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)  # {action: 'free'|'keep_occupied'|'accept'|'decline', responded_at: datetime}
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    from_account = relationship("Account", foreign_keys=[from_account_id])
    to_account = relationship("Account", foreign_keys=[to_account_id])
