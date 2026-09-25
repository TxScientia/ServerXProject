import uuid

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    login_name: str
    password: str


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    login_name: str
    is_global_admin: bool
