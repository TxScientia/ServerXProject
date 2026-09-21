from sqlalchemy.orm import Session

from ..models import Place

# Sentinel so update_place can distinguish "field omitted" from "set to null".
_UNSET = object()


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


def get_place(db: Session, place_id):
    return db.query(Place).filter(Place.id == place_id).first()


def update_place(
    db: Session,
    place: Place,
    *,
    title=None,
    description=_UNSET,
    image_url=_UNSET,
    parent_place_id=_UNSET,
    sort_order=None,
):
    if title is not None:
        place.title = title
    if description is not _UNSET:
        place.description = description
    if image_url is not _UNSET:
        place.image_url = image_url
    if parent_place_id is not _UNSET:
        place.parent_place_id = parent_place_id
    if sort_order is not None:
        place.sort_order = sort_order
    db.commit()
    db.refresh(place)
    return place


def delete_place(db: Session, place: Place):
    """Delete a place and (via the ORM cascade) all of its descendant places."""
    db.delete(place)
    db.commit()


def reorder_places(db: Session, space_id, ordered_ids):
    """Assign sort_order by position for the given place ids (within one space)."""
    for index, place_id in enumerate(ordered_ids):
        place = get_place(db, place_id)
        if place is not None and place.space_id == space_id:
            place.sort_order = index
    db.commit()
