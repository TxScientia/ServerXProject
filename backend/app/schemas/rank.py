import datetime
import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RankCreate(BaseModel):
    name: str
    weight: int = Field(ge=1)


class RankUpdate(BaseModel):
    name: Optional[str] = None
    weight: Optional[int] = Field(default=None, ge=1)


class RankRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    space_id: uuid.UUID
    name: str
    weight: int
    created_at: datetime.datetime
