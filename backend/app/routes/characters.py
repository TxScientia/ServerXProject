import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..images import character_images
from ..models import Account, Character, Space
from ..schemas import CharacterCreate
from ..schemas.character import CharacterFavoriteUpdate

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
        "editorData": character_images(editor_data, strict=False),
    }


@router.get("/characters")
def get_characters(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chars = db.query(Character).filter_by(account_id=current_user.id, is_deleted=False).all()
    return [{**character_to_response(c), "isFavorite": c.is_favorite} for c in chars]


@router.get("/characters/{character_id}")
def get_character(
    character_id: UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = db.query(Character).filter_by(id=character_id, is_deleted=False).first()
    if not character:
        raise HTTPException(status_code=404, detail="Charakter nicht gefunden")
    return character_to_response(character)


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
    character = db.query(Character).filter_by(id=character_id, account_id=current_user.id, is_deleted=False).first()
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


@router.patch("/characters/{character_id}/favorite")
def favorite_character_endpoint(
    character_id: UUID,
    preference: CharacterFavoriteUpdate,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = db.query(Character).filter_by(
        id=character_id, account_id=current_user.id, is_deleted=False,
    ).first()
    if not character:
        raise HTTPException(status_code=404, detail="Charakter nicht gefunden")
    character.is_favorite = preference.is_favorite
    db.commit()
    db.refresh(character)
    return {"id": str(character.id), "isFavorite": character.is_favorite}


@router.delete("/characters/{character_id}")
def delete_character_endpoint(
    character_id: UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = db.query(Character).filter_by(
        id=character_id, account_id=current_user.id, is_deleted=False,
    ).first()
    if not character:
        raise HTTPException(status_code=404, detail="Charakter nicht gefunden")
    # Never orphan or silently delete shared plots along with a character.
    if db.query(Space.id).filter_by(owner_character_id=character.id).first():
        raise HTTPException(status_code=409, detail="Bitte zuerst die eigenen Plots übertragen oder löschen.")
    character.is_deleted = True
    character.is_favorite = False
    db.commit()
    return {"deleted": True}
