from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from ..auth import get_current_character, get_current_user
from ..commands import MALFORMED, OK, interpret, plain_text
from ..crud import (
    create_global_ooc_message,
    create_space_ooc_message,
    get_storybook,
    is_member,
    list_global_ooc_messages,
    list_space_ooc_messages,
)
from ..database import get_db
from ..models import Account, Character
from ..schemas import OOCMessageCreate, OOCMessageRead
from ..richtext import validate_rich_text

router = APIRouter(tags=["ooc"])

MAX_OOC_CHARS = 20_000


def _validate_body(body) -> None:
    validate_rich_text(body, max_chars=MAX_OOC_CHARS)


def _serialize(item):
    return OOCMessageRead(
        id=item.id,
        scope_type=item.scope_type,
        space_id=item.space_id,
        author_character_id=item.author_character_id,
        author_name=item.author_character.name if item.author_character else None,
        body=item.body,
        kind=item.kind,
        created_at=item.created_at,
        edited_at=item.edited_at,
    )


def _require_storybook(db: Session, storybook_id: uuid.UUID):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    return space


@router.get("/ooc/messages", response_model=List[OOCMessageRead])
def list_global_ooc_endpoint(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [_serialize(item) for item in list_global_ooc_messages(db)]


@router.post("/ooc/messages", response_model=OOCMessageRead)
def create_global_ooc_endpoint(
    data: OOCMessageCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    status, roll = interpret(plain_text(data.body), character.name)
    if status == MALFORMED:
        return Response(status_code=204)  # recognised command but invalid → silently drop
    if status == OK:
        return _serialize(
            create_global_ooc_message(db, author_character_id=character.id, body=roll, kind="roll")
        )
    _validate_body(data.body)
    return _serialize(create_global_ooc_message(db, author_character_id=character.id, body=data.body))


@router.get("/storybooks/{storybook_id}/ooc/messages", response_model=List[OOCMessageRead])
def list_storybook_ooc_endpoint(
    storybook_id: uuid.UUID,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    if not is_member(db, space.id, character.id):
        raise HTTPException(status_code=403, detail="Nur Plot-Mitglieder können den OOC lesen")
    return [_serialize(item) for item in list_space_ooc_messages(db, space.id)]


@router.post("/storybooks/{storybook_id}/ooc/messages", response_model=OOCMessageRead)
def create_storybook_ooc_endpoint(
    storybook_id: uuid.UUID,
    data: OOCMessageCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    if not is_member(db, space.id, character.id):
        raise HTTPException(status_code=403, detail="Nur Plot-Mitglieder können im OOC schreiben")
    status, roll = interpret(plain_text(data.body), character.name)
    if status == MALFORMED:
        return Response(status_code=204)  # recognised command but invalid → silently drop
    if status == OK:
        return _serialize(
            create_space_ooc_message(
                db, space_id=space.id, author_character_id=character.id, body=roll, kind="roll"
            )
        )
    _validate_body(data.body)
    return _serialize(create_space_ooc_message(db, space_id=space.id, author_character_id=character.id, body=data.body))
