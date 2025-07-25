from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..crud import get_account_by_login_name
import bcrypt
import jwt
import datetime

SECRET_KEY = "dein_geheimer_schluessel"  # In .env auslagern!

class LoginRequest(BaseModel):
    login_name: str
    password: str

router = APIRouter()

@router.post("/login")
def login(data: LoginRequest):
    db = SessionLocal()
    user = get_account_by_login_name(db=db, login_name=data.login_name)
    db.close()
    if not user or not bcrypt.checkpw(data.password.encode('utf-8'), user.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Login fehlgeschlagen")

    # Token erzeugen
    payload = {
        "user_id": str(user.id),
        "login_name": user.login_name,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return {"token": token}