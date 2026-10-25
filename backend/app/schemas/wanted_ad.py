import datetime
import uuid
from typing import Annotated, Any, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

AdTag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class WantedAdCreate(BaseModel):
    title: str
    body: dict
    tags: list[AdTag] = Field(default_factory=list, max_length=6)


class WantedAdRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scope_type: str
    space_id: Optional[uuid.UUID] = None
    title: str
    body: Any
    tags: list[str] = Field(default_factory=list)
    author_character_id: uuid.UUID
    author_name: Optional[str] = None
    created_at: datetime.datetime
