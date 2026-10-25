import uuid
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    login_name: str
    password: str


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    login_name: str
    is_global_admin: bool
    theme: str
    show_unread_badge: bool


class AccountPreferencesUpdate(BaseModel):
    """Partial update of user preferences; omitted fields stay unchanged."""
    theme: Optional[Literal["light", "dark", "parchment"]] = None
    show_unread_badge: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
