from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Character
import jwt
from ..routes.accounts import SECRET_KEY

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/characters")
def get_characters(Authorization: str = Header(...), db: Session = Depends(get_db)):
    try:
        token = Authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload["user_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Token ungültig")

    chars = db.query(Character).filter_by(account_id=user_id).all()
    return [
        {
            "name": c.name,
            "race": c.race,
            "spec": c.specification,
            "gender": c.gender
        }
        for c in chars
    ]

class CharacterCreate(BaseModel):
    name: str
    race: str
    spec: str
    gender: str

@router.post("/characters")
def create_character_endpoint(
    char: CharacterCreate,
    Authorization: str = Header(...),
    db: Session = Depends(get_db)
):
    try:
        token = Authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload["user_id"]
    except Exception:
        raise HTTPException(status_code=401, detail="Token ungültig")

    character = Character(
        account_id=user_id,
        name=char.name,
        race=char.race,
        specification=char.spec,
        gender=char.gender
    )
    db.add(character)
    db.commit()
    db.refresh(character)
    return {
        "id": str(character.id),
        "name": character.name,
        "race": character.race,
        "spec": character.specification,
        "gender": character.gender
    }