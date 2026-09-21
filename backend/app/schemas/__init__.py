"""Pydantic request/response schemas, split by domain."""
from .account import LoginRequest
from .character import CharacterCreate
from .place import PlaceCreate, PlaceRead, PlaceReorder, PlaceUpdate
from .rank import RankCreate, RankRead, RankUpdate
from .space import (
    StorybookCreate,
    StorybookRead,
    StorybookUpdate,
    StorybookWithPlaces,
)

__all__ = [
    "LoginRequest",
    "CharacterCreate",
    "PlaceCreate",
    "PlaceRead",
    "PlaceReorder",
    "PlaceUpdate",
    "RankCreate",
    "RankRead",
    "RankUpdate",
    "StorybookCreate",
    "StorybookRead",
    "StorybookUpdate",
    "StorybookWithPlaces",
]
