import uuid

from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import expression

from ..database import Base
from ..types import GUID


class Account(Base):
    __tablename__ = "accounts"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    login_name = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    # Global permission layer — see docs/architecture/data-model.md ("who, role, where").
    is_global_admin = Column(
        Boolean, nullable=False, default=False, server_default=expression.false()
    )

    characters = relationship(
        "Character", back_populates="account", cascade="all, delete-orphan"
    )
    system_messages_sent = relationship(
        "SystemMessage", foreign_keys="SystemMessage.from_account_id", back_populates="from_account"
    )
    system_messages_received = relationship(
        "SystemMessage", foreign_keys="SystemMessage.to_account_id", back_populates="to_account"
    )
