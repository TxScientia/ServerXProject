import uuid
from typing import Literal, Optional

from pydantic import BaseModel


class MemberRankUpdate(BaseModel):
    rank_id: Optional[uuid.UUID] = None


class MemberRoleUpdate(BaseModel):
    role: Literal["member", "editor"]
