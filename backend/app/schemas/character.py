from typing import Any

from pydantic import BaseModel, Field


class CharacterCreate(BaseModel):
    name: str
    race: str
    spec: str
    gender: str
    editorData: dict[str, Any] = Field(default_factory=dict)
