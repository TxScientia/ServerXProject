import re
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_character, get_current_user
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

router = APIRouter(tags=["ooc"])

ALLOWED_NODE_TYPES = {"doc", "paragraph", "text", "hardBreak"}
ALLOWED_MARK_TYPES = {"bold", "italic", "underline", "strike", "textStyle"}
MAX_OOC_CHARS = 20_000
_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


def _validate_body(body) -> None:
    if not isinstance(body, dict) or body.get("type") != "doc":
        raise HTTPException(status_code=422, detail="Ungültiger Inhalt")
    total_chars = 0

    def walk(node):
        nonlocal total_chars
        if not isinstance(node, dict) or node.get("type") not in ALLOWED_NODE_TYPES:
            raise HTTPException(status_code=422, detail="Nicht erlaubter Inhaltstyp")
        for mark in node.get("marks") or []:
            mtype = mark.get("type") if isinstance(mark, dict) else None
            if mtype not in ALLOWED_MARK_TYPES:
                raise HTTPException(status_code=422, detail="Nicht erlaubte Formatierung")
            if mtype == "textStyle":
                color = (mark.get("attrs") or {}).get("color")
                if color is not None and not _HEX_COLOR.match(str(color)):
                    raise HTTPException(status_code=422, detail="Ungültige Farbe")
        text = node.get("text")
        if isinstance(text, str):
            total_chars += len(text)
        for child in node.get("content") or []:
            walk(child)

    walk(body)
    if total_chars == 0:
        raise HTTPException(status_code=422, detail="Nachricht darf nicht leer sein")
    if total_chars > MAX_OOC_CHARS:
        raise HTTPException(status_code=422, detail="Nachricht ist zu lang")


def _serialize(item):
    return OOCMessageRead(
        id=item.id,
        scope_type=item.scope_type,
        space_id=item.space_id,
        author_character_id=item.author_character_id,
        author_name=item.author_character.name if item.author_character else None,
        body=item.body,
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
    _validate_body(data.body)
    return _serialize(create_space_ooc_message(db, space_id=space.id, author_character_id=character.id, body=data.body))
