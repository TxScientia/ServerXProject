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
    description = Column(Text, nullable=True)  # short summary (Kurzbeschreibung, shown on the card)
    image_url = Column(String, nullable=True)  # plot image
    # World "biography" shown in the detail center. Stores the RAW BBCode source
    # (rendered to HTML on display); plain text in Phase 1, BBCode from Phase 3.
    biography = Column(Text, nullable=True)
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
    ranks = relationship("Rank", back_populates="space", cascade="all, delete-orphan")
    news_items = relationship("NewsItem", back_populates="space", cascade="all, delete-orphan")
    ooc_messages = relationship("OOCMessage", back_populates="space", cascade="all, delete-orphan")
    wanted_ads = relationship("WantedAd", back_populates="space", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="space_tags", back_populates="spaces")

    @property
    def visibility(self):
        """StoryBook visibility (from the 1:1 detail row), or None for houses."""
        return self.storybook_detail.visibility if self.storybook_detail else None


class StorybookDetail(Base):
    """StoryBook-only fields. Houses simply have no row here."""

    __tablename__ = "storybook_details"
    space_id = Column(GUID(), ForeignKey("spaces.id"), primary_key=True)
    # 'generic' | 'public' | 'private_listed' | 'private_hidden'
    visibility = Column(String, nullable=False)

    space = relationship("Space", back_populates="storybook_detail")
