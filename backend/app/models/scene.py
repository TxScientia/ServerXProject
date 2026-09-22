import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base
from ..types import GUID


class Scene(Base):
    """One RP thread inside a Place.

    Status (active | inactive | finished) and participants are DERIVED, never
    stored (see crud/scene.py): status from ``finished_at`` + ``last_post_at`` vs.
    the space's ``scene_timeout_days``; participants from the distinct post authors.
    ``last_post_at`` is the source of truth for occupancy and is bumped on every post.
    """

    __tablename__ = "scenes"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    place_id = Column(GUID(), ForeignKey("places.id"), nullable=False)
    title = Column(String, nullable=False)  # = the first post's title (the RP name)
    last_post_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)  # set by scene-lifecycle later
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    place = relationship("Place", back_populates="scenes")
    posts = relationship(
        "Post",
        back_populates="scene",
        cascade="all, delete-orphan",
        order_by="Post.created_at",
    )
