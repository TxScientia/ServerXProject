import datetime
import uuid
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from ..images import local_image, validate_image_reference


class PlaceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    parent_place_id: Optional[uuid.UUID] = None
    image_url: Optional[str] = None
    sort_order: int = 0

    _uploaded_image = field_validator('image_url')(validate_image_reference)


class PlaceUpdate(BaseModel):
    """Edit a place — all fields optional; only provided ones are applied."""
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_place_id: Optional[uuid.UUID] = None
    sort_order: Optional[int] = None

    _uploaded_image = field_validator('image_url')(validate_image_reference)


class PlaceReorder(BaseModel):
    ordered_ids: List[uuid.UUID]


class PlaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int
    parent_place_id: Optional[uuid.UUID] = None
    created_at: datetime.datetime

    @field_validator('image_url', mode='before')
    @classmethod
    def _local_image(cls, value):
        return local_image(value) or None
