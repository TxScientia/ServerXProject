from sqlalchemy.orm import Session

from ..models import Favorite


def list_favorites_for_character(db: Session, character_id):
    return (
        db.query(Favorite)
        .filter(Favorite.character_id == character_id)
        .order_by(Favorite.created_at.asc())
        .all()
    )


def get_favorite(db: Session, character_id, place_id):
    return (
        db.query(Favorite)
        .filter_by(character_id=character_id, place_id=place_id)
        .first()
    )


def add_favorite(db: Session, character_id, place_id):
    """Add a favourite; idempotent (returns the existing one if already favourited)."""
    existing = get_favorite(db, character_id, place_id)
    if existing is not None:
        return existing
    favorite = Favorite(character_id=character_id, place_id=place_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


def remove_favorite(db: Session, character_id, place_id) -> bool:
    favorite = get_favorite(db, character_id, place_id)
    if favorite is None:
        return False
    db.delete(favorite)
    db.commit()
    return True
