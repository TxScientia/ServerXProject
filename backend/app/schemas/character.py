from pydantic import BaseModel


class CharacterCreate(BaseModel):
    name: str
    race: str
    spec: str
    gender: str
