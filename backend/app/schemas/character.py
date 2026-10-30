from typing import Any

from pydantic import BaseModel, Field, StrictBool, field_validator

from ..images import character_images


class CharacterFavoriteUpdate(BaseModel):
    is_favorite: StrictBool


class CharacterCreate(BaseModel):
    name: str
    race: str
    spec: str
    gender: str
    editorData: dict[str, Any] = Field(default_factory=dict)

    @field_validator('editorData')
    @classmethod
    def uploaded_images_only(cls, value):
        return character_images(value, strict=True)
