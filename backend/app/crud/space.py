from sqlalchemy.orm import Session

from ..models import Character, Membership, Space, StorybookDetail


def create_storybook(
    db: Session,
    owner: Character,
    title: str,
    description: str = None,
    visibility: str = "public",
):
    """Create a StoryBook owned by ``owner``, with the creator as admin member."""
    space = Space(
        type="storybook",
        owner_character_id=owner.id,
        title=title,
        description=description,
    )
    space.storybook_detail = StorybookDetail(visibility=visibility)
    db.add(space)
    db.flush()  # assign space.id before creating the membership
    db.add(Membership(space_id=space.id, character_id=owner.id, role="admin"))
    db.commit()
    db.refresh(space)
    return space


def list_storybooks(db: Session):
    return db.query(Space).filter(Space.type == "storybook").all()


def get_storybook(db: Session, storybook_id):
    return (
        db.query(Space)
        .filter(Space.id == storybook_id, Space.type == "storybook")
        .first()
    )


def get_membership(db: Session, space_id, character_id):
    return (
        db.query(Membership)
        .filter_by(space_id=space_id, character_id=character_id)
        .first()
    )
