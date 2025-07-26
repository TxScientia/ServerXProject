import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base

class Account(Base):
    __tablename__ = "accounts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    login_name = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)

class Character(Base):
    __tablename__ = "characters"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    name = Column(String, nullable=False)
    race = Column(String, nullable=False)
    specification = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False)

    account = relationship(argument="Account", back_populates="characters")

Account.characters = relationship(argument="Character", back_populates="account", cascade="all, delete-orphan")