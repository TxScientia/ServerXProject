import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PlaceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    parent_place_id: Optional[uuid.UUID] = None
    image_url: Optional[str] = None
    sort_order: int = 0


class PlaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int
    parent_place_id: Optional[uuid.UUID] = None
    created_at: datetime.datetime
