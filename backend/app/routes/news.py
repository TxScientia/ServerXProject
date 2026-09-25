import re
from typing import List
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_character, get_current_user
from ..crud import (
    can_edit_space,
    count_unread_global_news,
    count_unread_space_news,
    create_global_news,
    create_space_news,
    get_storybook,
    list_global_news,
    list_space_news,
    mark_global_news_read,
    mark_space_news_read,
)
from ..database import get_db
from ..models import Account, Character
from ..schemas import NewsCreate, NewsRead

router = APIRouter(tags=["news"])

ALLOWED_NODE_TYPES = {"doc", "paragraph", "text", "hardBreak"}
ALLOWED_MARK_TYPES = {"bold", "italic", "underline", "strike", "textStyle"}
MAX_NEWS_CHARS = 100_000
_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


def _validate_body(body) -> None:
    """Validate the shared Tiptap JSON rich-text format. No HTML is accepted."""
    if not isinstance(body, dict) or body.get("type") != "doc":
        raise HTTPException(status_code=422, detail="Ungültiger Nachrichteninhalt")

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
    if total_chars > MAX_NEWS_CHARS:
        raise HTTPException(status_code=422, detail="Nachricht ist zu lang")


def _serialize_news(item) -> NewsRead:
    return NewsRead(
        id=item.id,
        scope_type=item.scope_type,
        space_id=item.space_id,
        title=item.title,
        body=item.body,
        kind=item.kind,
        pinned=item.pinned,
        author_account_id=item.author_account_id,
        author_login_name=item.author_account.login_name if item.author_account else None,
        author_character_id=item.author_character_id,
        author_character_name=item.author_character.name if item.author_character else None,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _require_admin(account: Account):
    if not account.is_global_admin:
        raise HTTPException(status_code=403, detail="Nur Admins dürfen System-News erstellen")


def _require_storybook(db: Session, storybook_id: uuid.UUID):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    return space


@router.get("/news/unread-count")
def global_news_unread_count_endpoint(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"count": count_unread_global_news(db, current_user.id)}


@router.post("/news/mark-read")
def mark_global_news_read_endpoint(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"marked": mark_global_news_read(db, current_user.id)}


@router.get("/news", response_model=List[NewsRead])
def list_global_news_endpoint(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [_serialize_news(item) for item in list_global_news(db)]


@router.post("/admin/news", response_model=NewsRead)
def create_global_news_endpoint(
    data: NewsCreate,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Titel darf nicht leer sein")
    _validate_body(data.body)
    item = create_global_news(
        db,
        author_account_id=current_user.id,
        title=title,
        body=data.body,
        kind=data.kind,
        pinned=data.pinned,
    )
    return _serialize_news(item)


@router.get("/storybooks/{storybook_id}/news/unread-count")
def storybook_news_unread_count_endpoint(
    storybook_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    return {"count": count_unread_space_news(db, current_user.id, space.id)}


@router.post("/storybooks/{storybook_id}/news/mark-read")
def mark_storybook_news_read_endpoint(
    storybook_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    return {"marked": mark_space_news_read(db, current_user.id, space.id)}


@router.get("/storybooks/{storybook_id}/news", response_model=List[NewsRead])
def list_storybook_news_endpoint(
    storybook_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    return [_serialize_news(item) for item in list_space_news(db, space.id)]


@router.post("/storybooks/{storybook_id}/news", response_model=NewsRead)
def create_storybook_news_endpoint(
    storybook_id: uuid.UUID,
    data: NewsCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    if not can_edit_space(db, space.id, character.id):
        raise HTTPException(status_code=403, detail="Keine Berechtigung, Plot-News zu erstellen")
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Titel darf nicht leer sein")
    _validate_body(data.body)
    item = create_space_news(
        db,
        space_id=space.id,
        author_account_id=character.account_id,
        author_character_id=character.id,
        title=title,
        body=data.body,
        kind=data.kind,
        pinned=data.pinned,
    )
    return _serialize_news(item)
