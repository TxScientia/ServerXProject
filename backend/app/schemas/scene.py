import datetime
import uuid
from typing import List, Optional

from pydantic import BaseModel

from .post import PostRead


class SceneCreate(BaseModel):
    """Start a scene: its title (the RP name) + the first post's body, in one call."""
    title: str
    body: dict


class SceneRead(BaseModel):
    id: uuid.UUID
    place_id: uuid.UUID
    title: str
    status: str  # derived: 'active' | 'inactive' | 'finished'
    last_post_at: datetime.datetime
    finished_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    participant_ids: List[uuid.UUID]
    post_count: int


class SceneWithPosts(SceneRead):
    posts: List[PostRead]
