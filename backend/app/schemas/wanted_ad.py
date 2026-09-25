import datetime
import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class WantedAdCreate(BaseModel):
    title: str
    body: dict


class WantedAdRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scope_type: str
    space_id: Optional[uuid.UUID] = None
    title: str
    body: Any
    author_character_id: uuid.UUID
    author_name: Optional[str] = None
    created_at: datetime.datetime
