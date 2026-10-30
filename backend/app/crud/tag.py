from sqlalchemy.orm import Session

from ..models import SpaceTag, Tag


def list_tags(db: Session):
    return db.query(Tag).order_by(Tag.name.asc()).all()


def get_tag(db: Session, tag_id):
    return db.query(Tag).filter(Tag.id == tag_id).first()


def get_tag_by_name(db: Session, name: str):
    return db.query(Tag).filter(Tag.name == name).first()


def create_tag(db: Session, name: str) -> Tag:
    tag = Tag(name=name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def rename_tag(db: Session, tag: Tag, name: str) -> Tag:
    tag.name = name
    db.commit()
    db.refresh(tag)
    return tag


def delete_tag(db: Session, tag: Tag) -> None:
    # Drop the plot associations first, then the tag itself.
    db.query(SpaceTag).filter(SpaceTag.tag_id == tag.id).delete(synchronize_session=False)
    db.delete(tag)
    db.commit()


def tags_by_names(db: Session, names):
    """Existing pool tags matching the given names (unknown names are ignored).
    Plots may only use tags that exist in the pool — no ad-hoc creation."""
    if not names:
        return []
    found = db.query(Tag).filter(Tag.name.in_(names)).all()
    # Preserve the caller's order and de-dupe.
    by_name = {t.name: t for t in found}
    result, seen = [], set()
    for name in names:
        tag = by_name.get(name)
        if tag is not None and tag.id not in seen:
            result.append(tag)
            seen.add(tag.id)
    return result
