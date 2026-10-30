import uuid

from pydantic import BaseModel, ConfigDict


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str
