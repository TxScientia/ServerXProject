"""Pydantic request/response schemas, split by domain."""
from .account import LoginRequest
from .character import CharacterCreate

__all__ = ["LoginRequest", "CharacterCreate"]
