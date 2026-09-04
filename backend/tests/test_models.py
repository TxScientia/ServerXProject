"""Tests for the data-model foundation: spaces, memberships, places, tags."""
import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from backend.app.models import (
    Account,
    Character,
    Membership,
    Place,
    Space,
    StorybookDetail,
    Tag,
)


def _character(db_session):
    account = Account(
        email=f"{uuid.uuid4().hex}@example.com",
        login_name=uuid.uuid4().hex,
        password_hash="x",
    )
    db_session.add(account)
    db_session.flush()
    character = Character(
        name="Owner", race="Mensch", specification="Held", gender="Divers",
        account_id=account.id,
    )
    db_session.add(character)
    db_session.commit()
    return character


def test_account_defaults_to_non_admin(db_session, account):
    assert account.is_global_admin is False


def test_create_storybook_with_detail_and_tags(db_session):
    owner = _character(db_session)
    space = Space(type="storybook", owner_character_id=owner.id, title="Neverwhere")
    space.storybook_detail = StorybookDetail(visibility="public")
    space.tags = [Tag(name="scifi"), Tag(name="romance")]
    db_session.add(space)
    db_session.commit()
    db_session.refresh(space)

    assert space.created_at is not None
    assert space.scene_timeout_days == 90  # default
    assert space.storybook_detail.visibility == "public"
    assert {t.name for t in space.tags} == {"scifi", "romance"}


def test_house_has_no_storybook_detail(db_session):
    owner = _character(db_session)
    house = Space(type="house", owner_character_id=owner.id, title="Home")
    db_session.add(house)
    db_session.commit()
    db_session.refresh(house)

    assert house.type == "house"
    assert house.storybook_detail is None


def test_membership_role_is_per_link(db_session):
    owner = _character(db_session)
    other = _character(db_session)
    s1 = Space(type="storybook", owner_character_id=owner.id, title="A")
    s2 = Space(type="storybook", owner_character_id=owner.id, title="B")
    db_session.add_all([s1, s2])
    db_session.flush()
    db_session.add_all([
        Membership(space_id=s1.id, character_id=other.id, role="admin"),
        Membership(space_id=s2.id, character_id=other.id, role="member"),
    ])
    db_session.commit()

    roles = {
        m.space_id: m.role
        for m in db_session.query(Membership).filter_by(character_id=other.id)
    }
    assert roles == {s1.id: "admin", s2.id: "member"}


def test_membership_unique_per_space_character(db_session):
    owner = _character(db_session)
    member = _character(db_session)
    space = Space(type="storybook", owner_character_id=owner.id, title="A")
    db_session.add(space)
    db_session.flush()
    db_session.add(Membership(space_id=space.id, character_id=member.id, role="member"))
    db_session.commit()

    db_session.add(Membership(space_id=space.id, character_id=member.id, role="admin"))
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_places_form_a_tree(db_session):
    owner = _character(db_session)
    space = Space(type="storybook", owner_character_id=owner.id, title="World")
    db_session.add(space)
    db_session.flush()
    root = Place(space_id=space.id, title="Location A")
    db_session.add(root)
    db_session.flush()
    child = Place(space_id=space.id, parent_place_id=root.id, title="Sublocation A1")
    db_session.add(child)
    db_session.commit()
    db_session.refresh(root)

    assert child.parent.id == root.id
    assert [c.id for c in root.children] == [child.id]


def test_deleting_space_cascades(db_session):
    owner = _character(db_session)
    space = Space(type="storybook", owner_character_id=owner.id, title="World")
    space.storybook_detail = StorybookDetail(visibility="generic")
    db_session.add(space)
    db_session.flush()
    db_session.add(Place(space_id=space.id, title="Loc"))
    db_session.add(Membership(space_id=space.id, character_id=owner.id, role="admin"))
    db_session.commit()

    db_session.delete(space)
    db_session.commit()

    assert db_session.query(Place).count() == 0
    assert db_session.query(Membership).count() == 0
    assert db_session.query(StorybookDetail).count() == 0
