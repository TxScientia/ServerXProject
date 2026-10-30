"""The tag pool: a read-only list for everyone (plot picker + filter), managed by admins."""
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..crud import (
    create_tag,
    delete_tag,
    get_tag,
    get_tag_by_name,
    list_tags,
    rename_tag,
)
from ..database import get_db
from ..models import Account
from ..schemas import TagCreate, TagRead, TagUpdate

router = APIRouter(tags=["tags"])


def _require_admin(account: Account):
    if not account.is_global_admin:
        raise HTTPException(status_code=403, detail="Nur Admins dürfen Tags verwalten")


def _clean_name(name: str) -> str:
    name = name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Tag darf nicht leer sein")
    if len(name) > 40:
        raise HTTPException(status_code=422, detail="Tag ist zu lang")
    return name


@router.get("/tags", response_model=List[TagRead])
def list_tags_endpoint(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_tags(db)


@router.post("/admin/tags", response_model=TagRead)
def create_tag_endpoint(
    data: TagCreate,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    name = _clean_name(data.name)
    if get_tag_by_name(db, name) is not None:
        raise HTTPException(status_code=409, detail="Tag existiert bereits")
    try:
        return create_tag(db, name)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tag existiert bereits")


@router.patch("/admin/tags/{tag_id}", response_model=TagRead)
def update_tag_endpoint(
    tag_id: uuid.UUID,
    data: TagUpdate,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    tag = get_tag(db, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")
    name = _clean_name(data.name)
    existing = get_tag_by_name(db, name)
    if existing is not None and existing.id != tag.id:
        raise HTTPException(status_code=409, detail="Tag existiert bereits")
    return rename_tag(db, tag, name)


@router.delete("/admin/tags/{tag_id}")
def delete_tag_endpoint(
    tag_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    tag = get_tag(db, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag nicht gefunden")
    delete_tag(db, tag)
    return {"ok": True}
