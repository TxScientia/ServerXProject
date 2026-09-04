import uuid

from sqlalchemy import Column, ForeignKey, String
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
    account_id = Column(GUID(), ForeignKey("accounts.id"), nullable=False)

    account = relationship("Account", back_populates="characters")
