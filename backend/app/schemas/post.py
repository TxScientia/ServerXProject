import datetime
import uuid
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict

# The rich-text body is a Tiptap/ProseMirror JSON document (a dict). Its structure
# is validated against the whitelist at the route layer, not here.


class PostCreate(BaseModel):
    body: dict


class PostUpdate(BaseModel):
    """Edit a post. ``title`` is only honoured for the scene's first post."""
    body: dict
    title: Optional[str] = None


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author_character_id: uuid.UUID
    author_name: Optional[str] = None
    body: Any
    created_at: datetime.datetime
    edited_at: Optional[datetime.datetime] = None
