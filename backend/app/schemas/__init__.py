"""Pydantic request/response schemas, split by domain."""
from .account import AccountRead, LoginRequest
from .character import CharacterCreate
from .chat import (
    ChatRead,
    ChatWithMessages,
    CreateDirectChatRequest,
    CreateGroupChatRequest,
    MessageCreate,
    MessageRead,
    SystemMessageCreate,
    SystemMessageRead,
    SystemMessageResponse,
)
from .invite import (
    CharacterInviteAction,
    CharacterInviteCreate,
    CharacterInviteRead,
    PlotLinkAction,
    PlotLinkCreate,
    PlotLinkRead,
)
from .member import MemberRankUpdate
from .news import NewsCreate, NewsRead
from .ooc import OOCMessageCreate, OOCMessageRead
from .place import PlaceCreate, PlaceRead, PlaceReorder, PlaceUpdate
from .post import PostCreate, PostRead, PostUpdate
from .rank import RankCreate, RankRead, RankUpdate
from .scene import SceneCreate, SceneRead, SceneWithPosts
from .wanted_ad import WantedAdCreate, WantedAdRead
from .space import (
    StorybookCreate,
    StorybookRead,
    StorybookUpdate,
    StorybookWithPlaces,
)

__all__ = [
    "AccountRead",
    "LoginRequest",
    "CharacterCreate",
    "CharacterInviteAction",
    "CharacterInviteCreate",
    "CharacterInviteRead",
    "ChatRead",
    "ChatWithMessages",
    "CreateDirectChatRequest",
    "CreateGroupChatRequest",
    "MessageCreate",
    "MessageRead",
    "MemberRankUpdate",
    "PlotLinkAction",
    "PlotLinkCreate",
    "PlotLinkRead",
    "SystemMessageCreate",
    "SystemMessageRead",
    "SystemMessageResponse",
    "NewsCreate",
    "NewsRead",
    "OOCMessageCreate",
    "OOCMessageRead",
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
    "WantedAdCreate",
    "WantedAdRead",
]
