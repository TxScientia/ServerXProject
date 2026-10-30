import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String, Text, false
from sqlalchemy.orm import relationship

from ..database import Base
from ..types import GUID


class Character(Base):
    __tablename__ = "characters"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    name = Column(String, nullable=False)
    race = Column(String, nullable=False)
    specification = Column(String, nullable=False)
    gender = Column(String, nullable=False)
    editor_data = Column(Text, nullable=True)
    is_favorite = Column(Boolean, nullable=False, default=False, server_default=false())
    # Preserve authored posts/messages and their foreign keys when removing a character.
    is_deleted = Column(Boolean, nullable=False, default=False, server_default=false())
    account_id = Column(GUID(), ForeignKey("accounts.id"), nullable=False)

    account = relationship("Account", back_populates="characters")
