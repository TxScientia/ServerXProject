from sqlalchemy.orm import Session

from ..models import Character, Membership, Space, StorybookDetail, Tag

# Plot roles that may edit settings/content (creator is the owner; editor is granted).
EDIT_ROLES = ("creator", "editor")


def create_storybook(
    db: Session,
    owner: Character,
    title: str,
    description: str = None,
    # New plots start members-only (listed, but only members can enter/post); the creator
    # can switch to "public" (open posting) in settings. Open-by-default would make every
    # new plot world-postable now that public ungates posting.
    visibility: str = "private_listed",
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


# --- Visibility / access (the agreed standard matrix) ---------------------------
# public / generic : viewable by anyone. private_listed / private_hidden : members only
# to view. For LISTING, only private_hidden is withheld from non-members.

def account_is_member(db: Session, space_id, account_id) -> bool:
    """True if ANY of the account's characters is a member of the space."""
    return (
        db.query(Membership)
        .join(Character, Membership.character_id == Character.id)
        .filter(Membership.space_id == space_id, Character.account_id == account_id)
        .first()
        is not None
    )


def can_view_space(db: Session, space, account_id) -> bool:
    """Whether the account may open/read a plot. Public & generic are open; private
    (listed or hidden) requires membership by one of the account's characters."""
    if space.visibility in ("public", "generic", None):
        return True
    return account_is_member(db, space.id, account_id)


def list_visible_storybooks(db: Session, account_id):
    """Storybooks for the StoryBooks list: everything except private_hidden plots the
    account isn't a member of (public, private_listed and generic are always listed)."""
    result = []
    for s in list_storybooks(db):
        if s.visibility == "private_hidden" and not account_is_member(db, s.id, account_id):
            continue
        result.append(s)
    return result


def can_post_in_space(db: Session, space, character_id) -> bool:
    """Who may post / start scenes: any member, or anyone if the plot is public."""
    return space.visibility == "public" or is_member(db, space.id, character_id)


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


def list_members(db: Session, space_id):
    """All memberships in a space, joined to their character for name display."""
    return (
        db.query(Membership)
        .filter(Membership.space_id == space_id)
        .join(Character, Membership.character_id == Character.id)
        .all()
    )


def get_space_creator(db: Session, space_id):
    """The creator Membership of a space (the owner), or None."""
    return (
        db.query(Membership)
        .filter_by(space_id=space_id, role="creator")
        .first()
    )


def can_edit_space(db: Session, space_id, character_id) -> bool:
    """True if the character is creator or editor of the space."""
    membership = get_membership(db, space_id, character_id)
    return membership is not None and membership.role in EDIT_ROLES


def is_member(db: Session, space_id, character_id) -> bool:
    """True if the character has any membership in the space (gameplay, not admin)."""
    return get_membership(db, space_id, character_id) is not None


# Assignable member roles (the creator role is fixed and cannot be reassigned here).
ASSIGNABLE_ROLES = ("member", "editor")


def set_member_role(db: Session, space_id, character_id, role: str):
    """Set a member's role to 'member' or 'editor'. Returns the Membership, or None if
    the member doesn't exist. Never changes the creator's role."""
    membership = get_membership(db, space_id, character_id)
    if membership is None or membership.role == "creator":
        return None
    membership.role = role
    db.commit()
    db.refresh(membership)
    return membership


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
