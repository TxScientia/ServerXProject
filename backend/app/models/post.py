import uuid

from sqlalchemy import JSON, Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class Post(Base):
    """One turn in a Scene.

    ``body`` stores the rich-text document as Tiptap/ProseMirror JSON — never HTML.
    Generic ``JSON`` on SQLite, native ``JSONB`` on PostgreSQL (chosen automatically
    by dialect), so Python always reads/writes a dict. The structure is validated
    against the same whitelist as the editor before it is stored (see routes).
    """

    __tablename__ = "posts"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    scene_id = Column(GUID(), ForeignKey("scenes.id"), nullable=False)
    author_character_id = Column(GUID(), ForeignKey("characters.id"), nullable=False)
    body = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    edited_at = Column(DateTime(timezone=True), nullable=True)  # set when the author edits

    scene = relationship("Scene", back_populates="posts")
    author = relationship("Character")

    @property
    def author_name(self):
        """Convenience for PostRead's byline (resolves the author character's name)."""
        return self.author.name if self.author is not None else None
