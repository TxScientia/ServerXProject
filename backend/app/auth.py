"""Authentication dependencies shared across routes."""
import uuid

import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import Account, Character
from .security import SECRET_KEY


def get_current_user(
    Authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> Account:
    """Resolve the Account behind the bearer token, or raise 401.

    Returns the Account (not just the id) so callers can check account-level state
    such as ``is_global_admin`` — the global permission layer shines through whichever
    character the user is currently playing.
    """
    try:
        token = Authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload["user_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Token ungültig")

    account = db.query(Account).filter(Account.id == user_id).first()
    if account is None:
        raise HTTPException(status_code=401, detail="Token ungültig")
    return account


def get_current_character(
    x_character_id: uuid.UUID = Header(...),
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Character:
    """Resolve the character the caller is acting as, from the X-Character-Id header.

    Verifies the character belongs to the authenticated account, so a user can only
    ever act as one of their own characters.
    """
    character = db.query(Character).filter(Character.id == x_character_id).first()
    if character is None:
        raise HTTPException(status_code=404, detail="Charakter nicht gefunden")
    if character.account_id != current_user.id:
        raise HTTPException(status_code=403, detail="Nicht dein Charakter")
    return character
