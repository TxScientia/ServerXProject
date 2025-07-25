import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from .database import Base

class Account(Base):
    __tablename__ = "accounts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    login_name = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)