import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class Membership(Base):
    """Character × Space link carrying the per-space role (creator | editor | member)."""

    __tablename__ = "memberships"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    space_id = Column(GUID(), ForeignKey("spaces.id"), nullable=False)
    character_id = Column(GUID(), ForeignKey("characters.id"), nullable=False)
    role = Column(String, nullable=False)  # 'creator' | 'editor' | 'member'
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("space_id", "character_id", name="uq_membership_space_character"),
    )

    space = relationship("Space", back_populates="memberships")
    character = relationship("Character")
