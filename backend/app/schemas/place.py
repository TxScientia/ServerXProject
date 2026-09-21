import datetime
import uuid
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class PlaceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    parent_place_id: Optional[uuid.UUID] = None
    image_url: Optional[str] = None
    sort_order: int = 0


class PlaceUpdate(BaseModel):
    """Edit a place — all fields optional; only provided ones are applied."""
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_place_id: Optional[uuid.UUID] = None
    sort_order: Optional[int] = None


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
