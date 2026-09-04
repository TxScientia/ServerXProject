from sqlalchemy.orm import Session

from ..models import Place


def create_place(
    db: Session,
    space_id,
    title: str,
    description: str = None,
    parent_place_id=None,
    image_url: str = None,
    sort_order: int = 0,
):
    place = Place(
        space_id=space_id,
        title=title,
        description=description,
        parent_place_id=parent_place_id,
        image_url=image_url,
        sort_order=sort_order,
    )
    db.add(place)
    db.commit()
    db.refresh(place)
    return place


def list_places(db: Session, space_id):
    return (
        db.query(Place)
        .filter(Place.space_id == space_id)
        .order_by(Place.sort_order, Place.created_at)
        .all()
    )
