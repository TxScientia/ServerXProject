import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_character, get_current_user
from ..crud import (
    can_edit_space,
    create_place,
    create_rank,
    create_storybook,
    delete_place,
    delete_rank,
    get_place,
    get_rank,
    get_storybook,
    list_places,
    list_ranks,
    list_storybooks,
    reorder_places,
    update_place,
    update_rank,
    update_storybook,
)
from ..database import get_db
from ..models import Account, Character
from ..schemas import (
    PlaceCreate,
    PlaceRead,
    PlaceReorder,
    PlaceUpdate,
    RankCreate,
    RankRead,
    RankUpdate,
    StorybookCreate,
    StorybookRead,
    StorybookUpdate,
    StorybookWithPlaces,
)

router = APIRouter(prefix="/storybooks", tags=["storybooks"])

MAX_TAGS = 6


def _get_editable_space(db: Session, storybook_id, character: Character):
    """Fetch the StoryBook and require the acting character to be creator/editor."""
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    if not can_edit_space(db, space.id, character.id):
        raise HTTPException(
            status_code=403, detail="Keine Berechtigung, dieses StoryBook zu bearbeiten"
        )
    return space


def _get_place_in_space(db: Session, space_id, place_id):
    place = get_place(db, place_id)
    if place is None or place.space_id != space_id:
        raise HTTPException(status_code=404, detail="Ort nicht gefunden")
    return place


def _get_rank_in_space(db: Session, space_id, rank_id):
    rank = get_rank(db, rank_id)
    if rank is None or rank.space_id != space_id:
        raise HTTPException(status_code=404, detail="Rang nicht gefunden")
    return rank


# --- StoryBook CRUD -------------------------------------------------------

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


@router.patch("/{storybook_id}", response_model=StorybookRead)
def update_storybook_endpoint(
    storybook_id: uuid.UUID,
    data: StorybookUpdate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    if data.tags is not None and len(data.tags) > MAX_TAGS:
        raise HTTPException(status_code=400, detail=f"Maximal {MAX_TAGS} Tags erlaubt")
    return update_storybook(
        db,
        space,
        title=data.title,
        description=data.description,
        image_url=data.image_url,
        biography=data.biography,
        visibility=data.visibility,
        tags=data.tags,
    )


# --- Ranks ----------------------------------------------------------------

@router.get("/{storybook_id}/ranks", response_model=List[RankRead])
def list_ranks_endpoint(
    storybook_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    return list_ranks(db, space.id)


@router.post("/{storybook_id}/ranks", response_model=RankRead)
def create_rank_endpoint(
    storybook_id: uuid.UUID,
    data: RankCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    return create_rank(db, space.id, data.name, data.weight)


@router.patch("/{storybook_id}/ranks/{rank_id}", response_model=RankRead)
def update_rank_endpoint(
    storybook_id: uuid.UUID,
    rank_id: uuid.UUID,
    data: RankUpdate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    rank = _get_rank_in_space(db, space.id, rank_id)
    fields = data.model_dump(exclude_unset=True)
    return update_rank(db, rank, **fields)


@router.delete("/{storybook_id}/ranks/{rank_id}")
def delete_rank_endpoint(
    storybook_id: uuid.UUID,
    rank_id: uuid.UUID,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    rank = _get_rank_in_space(db, space.id, rank_id)
    delete_rank(db, rank)
    return {"ok": True}


# --- Places ---------------------------------------------------------------

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
    space = _get_editable_space(db, storybook_id, character)
    return create_place(
        db,
        space.id,
        data.title,
        data.description,
        data.parent_place_id,
        data.image_url,
        data.sort_order,
    )


@router.post("/{storybook_id}/places/reorder")
def reorder_places_endpoint(
    storybook_id: uuid.UUID,
    data: PlaceReorder,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    reorder_places(db, space.id, data.ordered_ids)
    return {"ok": True}


@router.patch("/{storybook_id}/places/{place_id}", response_model=PlaceRead)
def update_place_endpoint(
    storybook_id: uuid.UUID,
    place_id: uuid.UUID,
    data: PlaceUpdate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    place = _get_place_in_space(db, space.id, place_id)
    fields = data.model_dump(exclude_unset=True)
    return update_place(db, place, **fields)


@router.delete("/{storybook_id}/places/{place_id}")
def delete_place_endpoint(
    storybook_id: uuid.UUID,
    place_id: uuid.UUID,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    place = _get_place_in_space(db, space.id, place_id)
    delete_place(db, place)
    return {"ok": True}
