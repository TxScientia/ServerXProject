import datetime
import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class OOCMessageCreate(BaseModel):
    body: dict


class OOCMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scope_type: str
    space_id: Optional[uuid.UUID] = None
    author_character_id: uuid.UUID
    author_name: Optional[str] = None
    body: Any
    created_at: datetime.datetime
    edited_at: Optional[datetime.datetime] = None
