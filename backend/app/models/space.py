import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class Space(Base):
    """Unified container for StoryBooks and Houses (see data-model.md).

    Both types share every relationship (places, membership, scenes), so they share
    this table; ``type`` discriminates. StoryBook-only discovery fields live in the
    1:1 ``storybook_details`` extension.
    """

    __tablename__ = "spaces"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    type = Column(String, nullable=False)  # 'storybook' | 'house'
    owner_character_id = Column(GUID(), ForeignKey("characters.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    # Occupancy backstop; both types have scenes, so it lives on the space.
    scene_timeout_days = Column(Integer, nullable=False, default=90, server_default="90")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    owner = relationship("Character")
    storybook_detail = relationship(
        "StorybookDetail",
        back_populates="space",
        uselist=False,
        cascade="all, delete-orphan",
    )
    memberships = relationship(
        "Membership", back_populates="space", cascade="all, delete-orphan"
    )
    places = relationship("Place", back_populates="space", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="space_tags", back_populates="spaces")


class StorybookDetail(Base):
    """StoryBook-only fields. Houses simply have no row here."""

    __tablename__ = "storybook_details"
    space_id = Column(GUID(), ForeignKey("spaces.id"), primary_key=True)
    # 'generic' | 'public' | 'private_listed' | 'private_hidden'
    visibility = Column(String, nullable=False)

    space = relationship("Space", back_populates="storybook_detail")
