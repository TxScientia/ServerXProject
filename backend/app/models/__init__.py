"""SQLAlchemy models, split by domain.

Re-exported here so callers keep using ``from ..models import Space`` unchanged.
Importing this package registers every table on ``Base.metadata`` — required for
``create_all`` and for string-based relationships to resolve at mapper configuration.
"""
from .account import Account
from .character import Character
from .chat import Chat, ChatMember
from .invite import CharacterInvite, PlotLink
from .membership import Membership
from .member_rank import MembershipRank
from .message import Message, MessageRead, SystemMessage
from .news import NewsItem
from .news_read import NewsItemRead
from .ooc import OOCMessage
from .place import Place
from .post import Post
from .rank import Rank
from .scene import Scene
from .space import Space, StorybookDetail
from .tag import SpaceTag, Tag
from .wanted_ad import WantedAd

__all__ = [
    "Account",
    "Character",
    "CharacterInvite",
    "Chat",
    "ChatMember",
    "Membership",
    "MembershipRank",
    "Message",
    "MessageRead",
    "NewsItem",
    "NewsItemRead",
    "OOCMessage",
    "Place",
    "PlotLink",
    "Post",
    "Rank",
    "Scene",
    "Space",
    "StorybookDetail",
    "SpaceTag",
    "SystemMessage",
    "Tag",
    "WantedAd",
]
