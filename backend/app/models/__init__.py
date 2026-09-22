"""SQLAlchemy models, split by domain.

Re-exported here so callers keep using ``from ..models import Space`` unchanged.
Importing this package registers every table on ``Base.metadata`` — required for
``create_all`` and for string-based relationships to resolve at mapper configuration.
"""
from .account import Account
from .character import Character
from .membership import Membership
from .place import Place
from .post import Post
from .rank import Rank
from .scene import Scene
from .space import Space, StorybookDetail
from .tag import SpaceTag, Tag

__all__ = [
    "Account",
    "Character",
    "Membership",
    "Place",
    "Post",
    "Rank",
    "Scene",
    "Space",
    "StorybookDetail",
    "SpaceTag",
    "Tag",
]
