import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class Chat(Base):
    """A conversation thread: 1:1 (direct) or group chat between characters.

    Type discriminator: 'direct' (exactly 2 members) or 'group' (N members, optional admin roles).
    """

    __tablename__ = "chats"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    type = Column(String, nullable=False)  # 'direct' | 'group'
    name = Column(String, nullable=True)  # group name; null for direct chats
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    members = relationship(
        "ChatMember", back_populates="chat", cascade="all, delete-orphan"
    )
    messages = relationship(
        "Message", back_populates="chat", cascade="all, delete-orphan", order_by="Message.created_at"
    )


class ChatMember(Base):
    """A character's membership in a chat with an optional role (admin for groups)."""

    __tablename__ = "chat_members"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    chat_id = Column(GUID(), ForeignKey("chats.id"), nullable=False)
    character_id = Column(GUID(), ForeignKey("characters.id"), nullable=False)
    role = Column(String, nullable=False, default="member", server_default="member")  # 'member' | 'admin'
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    chat = relationship("Chat", back_populates="members")
    character = relationship("Character")
