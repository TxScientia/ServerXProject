from pydantic import BaseModel


class LoginRequest(BaseModel):
    login_name: str
    password: str
