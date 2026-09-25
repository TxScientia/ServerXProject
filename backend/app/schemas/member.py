import uuid
from typing import Optional

from pydantic import BaseModel


class MemberRankUpdate(BaseModel):
    rank_id: Optional[uuid.UUID] = None
