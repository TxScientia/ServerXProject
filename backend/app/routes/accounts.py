from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import bcrypt
import jwt
import datetime

from ..database import get_db
from ..crud import get_account_by_login_name
from ..schemas import LoginRequest
from ..security import SECRET_KEY


router = APIRouter()


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = get_account_by_login_name(db=db, login_name=data.login_name)
    if not user or not bcrypt.checkpw(
        data.password.encode("utf-8"), user.password_hash.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Login fehlgeschlagen")

    payload = {
        "user_id": str(user.id),
        "login_name": user.login_name,
        "exp": datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(hours=1),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return {"token": token}
