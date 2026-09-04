"""Authentication dependencies shared across routes."""
import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import Account
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
