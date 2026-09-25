from sqlalchemy.orm import Session

from ..models import WantedAd


def create_global_wanted_ad(db: Session, *, author_character_id, title: str, body):
    item = WantedAd(
        scope_type="global",
        author_character_id=author_character_id,
        title=title,
        body=body,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def create_space_wanted_ad(db: Session, *, space_id, author_character_id, title: str, body):
    item = WantedAd(
        scope_type="space",
        space_id=space_id,
        author_character_id=author_character_id,
        title=title,
        body=body,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_wanted_ad(db: Session, wanted_ad_id):
    return db.query(WantedAd).filter(WantedAd.id == wanted_ad_id).first()


def list_global_wanted_ads(db: Session):
    return (
        db.query(WantedAd)
        .filter(WantedAd.scope_type == "global")
        .order_by(WantedAd.created_at.desc())
        .all()
    )


def list_space_wanted_ads(db: Session, space_id):
    return (
        db.query(WantedAd)
        .filter(WantedAd.scope_type == "space", WantedAd.space_id == space_id)
        .order_by(WantedAd.created_at.desc())
        .all()
    )


def delete_wanted_ad(db: Session, item: WantedAd):
    db.delete(item)
    db.commit()
