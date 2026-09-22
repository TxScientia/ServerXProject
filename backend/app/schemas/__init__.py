"""Pydantic request/response schemas, split by domain."""
from .account import LoginRequest
from .character import CharacterCreate
from .place import PlaceCreate, PlaceRead, PlaceReorder, PlaceUpdate
from .post import PostCreate, PostRead, PostUpdate
from .rank import RankCreate, RankRead, RankUpdate
from .scene import SceneCreate, SceneRead, SceneWithPosts
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
    "PostCreate",
    "PostRead",
    "PostUpdate",
    "RankCreate",
    "RankRead",
    "RankUpdate",
    "SceneCreate",
    "SceneRead",
    "SceneWithPosts",
    "StorybookCreate",
    "StorybookRead",
    "StorybookUpdate",
    "StorybookWithPlaces",
]
