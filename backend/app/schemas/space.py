import datetime
import uuid
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from .place import PlaceRead


class StorybookCreate(BaseModel):
    title: str
    description: Optional[str] = None


class StorybookRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    title: str
    description: Optional[str] = None
    owner_character_id: uuid.UUID
    created_at: datetime.datetime


class StorybookWithPlaces(StorybookRead):
    places: List[PlaceRead] = []
