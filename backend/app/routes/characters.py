import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Account, Character
from ..schemas import CharacterCreate

router = APIRouter()


def character_to_response(character: Character):
    editor_data: dict[str, Any] = {}
    if character.editor_data:
        try:
            editor_data = json.loads(character.editor_data)
        except json.JSONDecodeError:
            editor_data = {}
    return {
        "id": str(character.id),
        "name": character.name,
        "race": character.race,
        "spec": character.specification,
        "gender": character.gender,
        "editorData": editor_data,
    }


@router.get("/characters")
def get_characters(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chars = db.query(Character).filter_by(account_id=current_user.id).all()
    return [character_to_response(c) for c in chars]


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
        editor_data=json.dumps(char.editorData),
    )
    db.add(character)
    db.commit()
    db.refresh(character)
    return character_to_response(character)


@router.put("/characters/{character_id}")
def update_character_endpoint(
    character_id: UUID,
    char: CharacterCreate,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = db.query(Character).filter_by(id=character_id, account_id=current_user.id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Charakter nicht gefunden")

    character.name = char.name
    character.race = char.race
    character.specification = char.spec
    character.gender = char.gender
    character.editor_data = json.dumps(char.editorData)
    db.commit()
    db.refresh(character)
    return character_to_response(character)
