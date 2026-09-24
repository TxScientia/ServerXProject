from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class CharacterInviteCreate(BaseModel):
    character_id: str
    space_id: str


class CharacterInviteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    character_id: str
    space_id: str
    invited_by: str
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None

    @field_validator("id", "character_id", "space_id", "invited_by", mode="before")
    @classmethod
    def _coerce_uuid(cls, value):
        return str(value) if value is not None else value


class CharacterInviteAction(BaseModel):
    action: str  # 'accept' | 'decline'


class PlotLinkCreate(BaseModel):
    target_space_id: str


class PlotLinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_space_id: str
    target_space_id: str
    status: str
    created_by: str
    created_at: datetime
    responded_at: Optional[datetime] = None

    @field_validator("id", "source_space_id", "target_space_id", "created_by", mode="before")
    @classmethod
    def _coerce_uuid(cls, value):
        return str(value) if value is not None else value


class PlotLinkAction(BaseModel):
    action: str  # 'accept' | 'decline'
