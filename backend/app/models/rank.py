import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class Rank(Base):
    """Configurable character/member rank inside a Space.

    Lower weight means stronger/higher priority; 1 is the strongest rank.
    """

    __tablename__ = "ranks"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    space_id = Column(GUID(), ForeignKey("spaces.id"), nullable=False)
    name = Column(String, nullable=False)
    weight = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    space = relationship("Space", back_populates="ranks")
