import bcrypt
from sqlalchemy.orm import Session

from ..models import Account


def create_account(db: Session, email: str, login_name: str, password: str):
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    account = Account(email=email, login_name=login_name, password_hash=password_hash)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def get_account_by_email(db: Session, email: str):
    return db.query(Account).filter(Account.email == email).first()


def get_account_by_login_name(db: Session, login_name: str):
    return db.query(Account).filter(Account.login_name == login_name).first()


def update_account_preferences(db: Session, account: Account, *, theme=None, show_unread_badge=None):
    """Apply a partial preferences update; None means 'leave unchanged'."""
    if theme is not None:
        account.theme = theme
    if show_unread_badge is not None:
        account.show_unread_badge = show_unread_badge
    db.commit()
    db.refresh(account)
    return account


def verify_password(account: Account, password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), account.password_hash.encode("utf-8"))


def set_password(db: Session, account: Account, new_password: str):
    account.password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    db.commit()
    db.refresh(account)
    return account
