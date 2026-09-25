from sqlalchemy.orm import Session

from ..models import OOCMessage


def create_global_ooc_message(db: Session, *, author_character_id, body):
    item = OOCMessage(scope_type="global", author_character_id=author_character_id, body=body)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def create_space_ooc_message(db: Session, *, space_id, author_character_id, body):
    item = OOCMessage(
        scope_type="space",
        space_id=space_id,
        author_character_id=author_character_id,
        body=body,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def list_global_ooc_messages(db: Session, *, limit: int = 100):
    return (
        db.query(OOCMessage)
        .filter(OOCMessage.scope_type == "global")
        .order_by(OOCMessage.created_at.desc())
        .limit(limit)
        .all()
    )[::-1]


def list_space_ooc_messages(db: Session, space_id, *, limit: int = 100):
    return (
        db.query(OOCMessage)
        .filter(OOCMessage.scope_type == "space", OOCMessage.space_id == space_id)
        .order_by(OOCMessage.created_at.desc())
        .limit(limit)
        .all()
    )[::-1]
