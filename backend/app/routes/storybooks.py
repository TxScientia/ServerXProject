import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_character, get_current_user
from ..crud import (
    create_place,
    create_storybook,
    get_membership,
    get_storybook,
    list_places,
    list_storybooks,
)
from ..database import get_db
from ..models import Account, Character
from ..schemas import (
    PlaceCreate,
    PlaceRead,
    StorybookCreate,
    StorybookRead,
    StorybookWithPlaces,
)

router = APIRouter(prefix="/storybooks", tags=["storybooks"])


@router.post("", response_model=StorybookRead)
def create_storybook_endpoint(
    data: StorybookCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    return create_storybook(db, character, data.title, data.description)


@router.get("", response_model=List[StorybookRead])
def list_storybooks_endpoint(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_storybooks(db)


@router.get("/{storybook_id}", response_model=StorybookWithPlaces)
def get_storybook_endpoint(
    storybook_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    return space


@router.get("/{storybook_id}/places", response_model=List[PlaceRead])
def list_places_endpoint(
    storybook_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    return list_places(db, space.id)


@router.post("/{storybook_id}/places", response_model=PlaceRead)
def create_place_endpoint(
    storybook_id: uuid.UUID,
    data: PlaceCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")

    membership = get_membership(db, space.id, character.id)
    if membership is None or membership.role != "admin":
        raise HTTPException(
            status_code=403, detail="Nur Admins dieses StoryBooks dürfen Orte anlegen"
        )

    return create_place(
        db,
        space.id,
        data.title,
        data.description,
        data.parent_place_id,
        data.image_url,
        data.sort_order,
    )
