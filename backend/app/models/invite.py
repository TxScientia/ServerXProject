import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class CharacterInvite(Base):
    """Invite a Character to join a Space (Plot)."""

    __tablename__ = "character_invites"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    character_id = Column(GUID(), ForeignKey("characters.id"), nullable=False)
    space_id = Column(GUID(), ForeignKey("spaces.id"), nullable=False)
    invited_by = Column(GUID(), ForeignKey("characters.id"), nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending | accepted | declined
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("character_id", "space_id", name="uq_character_invite_char_space"),
    )

    character = relationship("Character", foreign_keys=[character_id])
    invited_by_char = relationship("Character", foreign_keys=[invited_by])
    space = relationship("Space")


class PlotLink(Base):
    """Link two Spaces (Plots) as part of the same world."""

    __tablename__ = "plot_links"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    source_space_id = Column(GUID(), ForeignKey("spaces.id"), nullable=False)
    target_space_id = Column(GUID(), ForeignKey("spaces.id"), nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending | accepted | declined
    created_by = Column(GUID(), ForeignKey("characters.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("source_space_id", "target_space_id", name="uq_plot_link_source_target"),
    )

    source_space = relationship("Space", foreign_keys=[source_space_id])
    target_space = relationship("Space", foreign_keys=[target_space_id])
    created_by_char = relationship("Character")
