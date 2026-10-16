from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_character, get_current_user
from ..richtext import validate_rich_text
from ..crud import (
    can_edit_space,
    can_post_in_space,
    can_view_space,
    create_global_wanted_ad,
    create_space_wanted_ad,
    delete_wanted_ad,
    get_storybook,
    get_wanted_ad,
    list_global_wanted_ads,
    list_space_wanted_ads,
)
from ..database import get_db
from ..models import Account, Character
from ..schemas import WantedAdCreate, WantedAdRead

router = APIRouter(tags=["wanted-ads"])

# Wanted-ad bodies store Tiptap JSON, validated against the shared whitelist in richtext.py.
MAX_WANTED_AD_CHARS = 50_000


def _validate_body(body) -> None:
    validate_rich_text(body, max_chars=MAX_WANTED_AD_CHARS, label="Gesuch")


def _serialize(item):
    return WantedAdRead(
        id=item.id,
        scope_type=item.scope_type,
        space_id=item.space_id,
        title=item.title,
        body=item.body,
        author_character_id=item.author_character_id,
        author_name=item.author_character.name if item.author_character else None,
        created_at=item.created_at,
    )


def _require_storybook(db: Session, storybook_id: uuid.UUID):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    return space


@router.get("/wanted-ads", response_model=List[WantedAdRead])
def list_global_wanted_ads_endpoint(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [_serialize(item) for item in list_global_wanted_ads(db)]


@router.post("/wanted-ads", response_model=WantedAdRead)
def create_global_wanted_ad_endpoint(
    data: WantedAdCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Titel darf nicht leer sein")
    _validate_body(data.body)
    return _serialize(create_global_wanted_ad(db, author_character_id=character.id, title=title, body=data.body))


@router.get("/storybooks/{storybook_id}/wanted-ads", response_model=List[WantedAdRead])
def list_storybook_wanted_ads_endpoint(
    storybook_id: uuid.UUID,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    if not can_view_space(db, space, character.account_id):
        raise HTTPException(status_code=403, detail="Diese Welt ist privat – nur für Mitglieder")
    return [_serialize(item) for item in list_space_wanted_ads(db, space.id)]


@router.post("/storybooks/{storybook_id}/wanted-ads", response_model=WantedAdRead)
def create_storybook_wanted_ad_endpoint(
    storybook_id: uuid.UUID,
    data: WantedAdCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    if not can_post_in_space(db, space, character.id):
        raise HTTPException(status_code=403, detail="Nur Mitglieder können Gesuche erstellen")
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Titel darf nicht leer sein")
    _validate_body(data.body)
    return _serialize(create_space_wanted_ad(db, space_id=space.id, author_character_id=character.id, title=title, body=data.body))


@router.delete("/wanted-ads/{wanted_ad_id}")
def delete_wanted_ad_endpoint(
    wanted_ad_id: uuid.UUID,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    item = get_wanted_ad(db, wanted_ad_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Gesuch nicht gefunden")
    # Author may always delete their own. For plot ads, plot editors/creators may
    # also delete for moderation.
    is_author = item.author_character_id == character.id
    is_moderator = (
        item.scope_type == "space"
        and item.space_id is not None
        and can_edit_space(db, item.space_id, character.id)
    )
    if not (is_author or is_moderator):
        raise HTTPException(status_code=403, detail="Keine Berechtigung, dieses Gesuch zu löschen")
    delete_wanted_ad(db, item)
    return {"ok": True}
