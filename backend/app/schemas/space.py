import datetime
import uuid
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from .place import PlaceRead


class StorybookCreate(BaseModel):
    title: str
    description: Optional[str] = None


class StorybookUpdate(BaseModel):
    """PlotSettings — all fields optional; only provided ones are applied."""
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    biography: Optional[str] = None
    visibility: Optional[str] = None
    tags: Optional[List[str]] = None


class StorybookRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    biography: Optional[str] = None
    visibility: Optional[str] = None
    owner_character_id: uuid.UUID
    created_at: datetime.datetime
    tags: List[str] = []

    @field_validator("tags", mode="before")
    @classmethod
    def _tag_names(cls, value):
        # From the ORM relationship this is a list of Tag objects; expose their names.
        if not value:
            return []
        return [t.name if hasattr(t, "name") else t for t in value]


class StorybookWithPlaces(StorybookRead):
    places: List[PlaceRead] = []
