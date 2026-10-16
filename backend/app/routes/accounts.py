from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import bcrypt
import jwt
import datetime

from ..auth import get_current_user
from ..database import get_db
from ..crud import (
    get_account_by_login_name,
    set_password,
    update_account_preferences,
    verify_password,
)
from ..models import Account
from ..schemas import (
    AccountPreferencesUpdate,
    AccountRead,
    LoginRequest,
    PasswordChange,
)
from ..security import SECRET_KEY

MIN_PASSWORD_LENGTH = 6

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
    return {
        "token": token,
        "is_global_admin": user.is_global_admin,
        "login_name": user.login_name,
        "theme": user.theme,
        "show_unread_badge": user.show_unread_badge,
    }


@router.get("/me", response_model=AccountRead)
def me(current_user: Account = Depends(get_current_user)):
    return current_user


@router.patch("/me/preferences", response_model=AccountRead)
def update_preferences(
    data: AccountPreferencesUpdate,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return update_account_preferences(
        db,
        current_user,
        theme=data.theme,
        show_unread_badge=data.show_unread_badge,
    )


@router.post("/me/password")
def change_password(
    data: PasswordChange,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(current_user, data.current_password):
        raise HTTPException(status_code=403, detail="Aktuelles Passwort ist falsch")
    if len(data.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=422, detail=f"Neues Passwort muss mindestens {MIN_PASSWORD_LENGTH} Zeichen lang sein"
        )
    set_password(db, current_user, data.new_password)
    return {"ok": True}
