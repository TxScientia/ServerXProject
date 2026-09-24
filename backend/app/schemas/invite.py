from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CharacterInviteCreate(BaseModel):
    character_id: str
    space_id: str


class CharacterInviteRead(BaseModel):
    id: str
    character_id: str
    space_id: str
    invited_by: str
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CharacterInviteAction(BaseModel):
    action: str  # 'accept' | 'decline'


class PlotLinkCreate(BaseModel):
    target_space_id: str


class PlotLinkRead(BaseModel):
    id: str
    source_space_id: str
    target_space_id: str
    status: str
    created_by: str
    created_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlotLinkAction(BaseModel):
    action: str  # 'accept' | 'decline'
