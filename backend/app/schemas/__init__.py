"""Pydantic request/response schemas, split by domain."""
from .account import AccountPreferencesUpdate, AccountRead, LoginRequest, PasswordChange
from .character import CharacterCreate
from .character_nav import CharacterPlotRead, FavoriteCreate, FavoriteRead
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
from .member import MemberRankUpdate, MemberRoleUpdate
from .news import NewsCreate, NewsRead
from .ooc import OOCMessageCreate, OOCMessageRead
from .place import PlaceCreate, PlaceRead, PlaceReorder, PlaceUpdate
from .post import PostCreate, PostRead, PostUpdate
from .rank import RankCreate, RankRead, RankUpdate
from .tag import TagCreate, TagRead, TagUpdate
from .scene import SceneCreate, SceneRead, SceneWithPosts
from .wanted_ad import WantedAdCreate, WantedAdRead
from .space import (
    StorybookCreate,
    StorybookRead,
    StorybookUpdate,
    StorybookWithPlaces,
)

__all__ = [
    "AccountPreferencesUpdate",
    "AccountRead",
    "LoginRequest",
    "PasswordChange",
    "CharacterCreate",
    "CharacterPlotRead",
    "FavoriteCreate",
    "FavoriteRead",
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
    "MemberRoleUpdate",
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
    "TagCreate",
    "TagRead",
    "TagUpdate",
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
