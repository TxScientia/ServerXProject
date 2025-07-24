from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..crud import get_account_by_email
import bcrypt

app = FastAPI()

class LoginRequest(BaseModel):
    login_name: str
    password: str

@app.post("/login")
def login(data: LoginRequest):
    db = SessionLocal()
    user = get_account_by_email(db, data.login_name)
    db.close()
    if not user or not bcrypt.checkpw(data.password.encode('utf-8'), user.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Login fehlgeschlagen")
    return {"message": "Login erfolgreich"}