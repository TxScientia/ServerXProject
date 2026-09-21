from sqlalchemy.orm import Session

from ..models import Character, Membership, Space, StorybookDetail, Tag

# Plot roles that may edit settings/content (creator is the owner; editor is granted).
EDIT_ROLES = ("creator", "editor")


def create_storybook(
    db: Session,
    owner: Character,
    title: str,
    description: str = None,
    visibility: str = "public",
):
    """Create a StoryBook owned by ``owner``, with the creator as its creator member."""
    space = Space(
        type="storybook",
        owner_character_id=owner.id,
        title=title,
        description=description,
    )
    space.storybook_detail = StorybookDetail(visibility=visibility)
    db.add(space)
    db.flush()  # assign space.id before creating the membership
    db.add(Membership(space_id=space.id, character_id=owner.id, role="creator"))
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


def can_edit_space(db: Session, space_id, character_id) -> bool:
    """True if the character is creator or editor of the space."""
    membership = get_membership(db, space_id, character_id)
    return membership is not None and membership.role in EDIT_ROLES


def _get_or_create_tag(db: Session, name: str) -> Tag:
    tag = db.query(Tag).filter(Tag.name == name).first()
    if tag is None:
        tag = Tag(name=name)
        db.add(tag)
        db.flush()
    return tag


def update_storybook(
    db: Session,
    space: Space,
    *,
    title=None,
    description=None,
    image_url=None,
    biography=None,
    visibility=None,
    tags=None,
):
    """Apply the provided (non-None) settings fields to a StoryBook."""
    if title is not None:
        space.title = title
    if description is not None:
        space.description = description
    if image_url is not None:
        space.image_url = image_url
    if biography is not None:
        space.biography = biography
    if visibility is not None and space.storybook_detail is not None:
        space.storybook_detail.visibility = visibility
    if tags is not None:
        space.tags = [_get_or_create_tag(db, name) for name in tags]
    db.commit()
    db.refresh(space)
    return space
