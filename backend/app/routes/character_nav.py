"""Right-side character nav: the acting character's plots and favourited places.

All endpoints are scoped to the acting character (X-Character-Id header).
"""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_character
from ..crud import (
    add_favorite,
    can_view_space,
    get_membership,
    get_storybook,
    list_favorites_for_character,
    list_spaces_for_character,
    remove_favorite,
)
from ..database import get_db
from ..models import Character, Place
from ..schemas import CharacterPlotRead, FavoriteCreate, FavoriteRead

router = APIRouter(prefix="/me", tags=["character-nav"])


@router.get("/plots", response_model=List[CharacterPlotRead])
def my_plots(
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    plots = list_spaces_for_character(db, character.id)
    result = []
    for space in plots:
        membership = get_membership(db, space.id, character.id)
        result.append(
            CharacterPlotRead(id=space.id, title=space.title, role=membership.role if membership else "member")
        )
    return result


@router.get("/favorites", response_model=List[FavoriteRead])
def my_favorites(
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    favorites = list_favorites_for_character(db, character.id)
    result = []
    for fav in favorites:
        place = fav.place
        if place is None:
            continue
        space = place.space
        # Hide favourites in plots the character can no longer access (e.g. left the plot).
        if space is None or not can_view_space(db, space, character.account_id):
            continue
        result.append(
            FavoriteRead(
                place_id=place.id,
                place_title=place.title,
                space_id=space.id,
                space_title=space.title,
            )
        )
    return result


@router.post("/favorites", response_model=FavoriteRead)
def add_my_favorite(
    data: FavoriteCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    place = db.query(Place).filter(Place.id == data.place_id).first()
    if place is None:
        raise HTTPException(status_code=404, detail="Ort nicht gefunden")
    space = get_storybook(db, place.space_id)
    if space is None or not can_view_space(db, space, character.account_id):
        raise HTTPException(status_code=403, detail="Kein Zugriff auf diesen Ort")
    add_favorite(db, character.id, place.id)
    return FavoriteRead(
        place_id=place.id,
        place_title=place.title,
        space_id=space.id,
        space_title=space.title,
    )


@router.delete("/favorites/{place_id}")
def remove_my_favorite(
    place_id: uuid.UUID,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    remove_favorite(db, character.id, place_id)
    return {"ok": True}
