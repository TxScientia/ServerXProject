import uuid

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.orm import relationship

from ..database import Base
from ..types import GUID


class Tag(Base):
    __tablename__ = "tags"
    id = Column(GUID(), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    name = Column(String, unique=True, nullable=False)

    spaces = relationship("Space", secondary="space_tags", back_populates="tags")


class SpaceTag(Base):
    __tablename__ = "space_tags"
    space_id = Column(GUID(), ForeignKey("spaces.id"), primary_key=True)
    tag_id = Column(GUID(), ForeignKey("tags.id"), primary_key=True)
