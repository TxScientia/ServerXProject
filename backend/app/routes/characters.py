from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Account, Character
from ..schemas import CharacterCreate

router = APIRouter()


@router.get("/characters")
def get_characters(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chars = db.query(Character).filter_by(account_id=current_user.id).all()
    return [
        {"name": c.name, "race": c.race, "spec": c.specification, "gender": c.gender}
        for c in chars
    ]


@router.post("/characters")
def create_character_endpoint(
    char: CharacterCreate,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = Character(
        account_id=current_user.id,
        name=char.name,
        race=char.race,
        specification=char.spec,
        gender=char.gender,
    )
    db.add(character)
    db.commit()
    db.refresh(character)
    return {
        "id": str(character.id),
        "name": character.name,
        "race": character.race,
        "spec": character.specification,
        "gender": character.gender,
    }
