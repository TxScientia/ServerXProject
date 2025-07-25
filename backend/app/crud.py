from sqlalchemy.orm import Session
from .models import Account
import bcrypt

def create_account(db: Session, email: str, login_name: str, password: str):
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    account = Account(email=email, login_name=login_name, password_hash=password_hash)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account

def get_account_by_email(db: Session, email: str):
    return db.query(Account).filter(Account.email == email).first()

def get_account_by_login_name(db: Session, login_name: str):
    return db.query(Account).filter(Account.login_name == login_name).first()