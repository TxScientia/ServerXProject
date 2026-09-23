import datetime
import uuid
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chat_id: uuid.UUID
    from_character_id: uuid.UUID
    from_character_name: Optional[str] = None
    body: Any  # Tiptap JSON
    created_at: datetime.datetime


class ChatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str  # 'direct' | 'group'
    name: Optional[str] = None
    created_at: datetime.datetime
    member_count: int = 0
    member_names: List[str] = []  # Names of all members
    unread_count: int = 0  # Unread messages in this chat


class ChatWithMessages(ChatRead):
    messages: List[MessageRead] = []


class MessageCreate(BaseModel):
    body: dict  # Tiptap JSON


class CreateDirectChatRequest(BaseModel):
    character_id: uuid.UUID


class CreateGroupChatRequest(BaseModel):
    name: str
    character_ids: List[uuid.UUID]


class SystemMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    from_account_id: uuid.UUID
    to_account_id: uuid.UUID
    type: str  # 'still_playing' | 'invite' | 'plot_link' | 'system_news'
    content: str
    action_required: bool
    data: Optional[dict] = None
    response: Optional[dict] = None
    created_at: datetime.datetime


class SystemMessageCreate(BaseModel):
    type: str
    content: str
    data: Optional[dict] = None
    action_required: bool = False


class SystemMessageResponse(BaseModel):
    action: str  # 'accept' | 'decline' | 'free' | 'keep_occupied'
