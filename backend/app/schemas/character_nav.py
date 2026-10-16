import uuid

from pydantic import BaseModel


class CharacterPlotRead(BaseModel):
    """A plot the acting character belongs to (right-side 'Plots' nav)."""
    id: uuid.UUID        # space id
    title: str
    role: str


class FavoriteCreate(BaseModel):
    place_id: uuid.UUID


class FavoriteRead(BaseModel):
    """A favourited place plus the context needed to quick-travel to it."""
    place_id: uuid.UUID
    place_title: str
    space_id: uuid.UUID
    space_title: str
