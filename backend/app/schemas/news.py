import datetime
import uuid
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict

NewsKind = Literal["info", "update", "maintenance", "warning"]


class NewsCreate(BaseModel):
    title: str
    body: dict
    kind: NewsKind = "info"
    pinned: bool = False


class NewsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    scope_type: str
    space_id: Optional[uuid.UUID] = None
    title: str
    body: Any
    kind: str
    pinned: bool
    author_account_id: uuid.UUID
    author_login_name: Optional[str] = None
    author_character_id: Optional[uuid.UUID] = None
    author_character_name: Optional[str] = None
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None
