"""Route tests for the scene-posting loop: create/read scenes, add/edit posts."""
import datetime

from backend.app.crud import create_character
from backend.app.models import Membership, Scene


def char_headers(auth_headers, character):
    return {**auth_headers, "X-Character-Id": str(character.id)}


def doc(text="Hallo Welt"):
    """A minimal valid Tiptap body."""
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def _make_storybook(client, headers, title="World"):
    return client.post("/storybooks", json={"title": title}, headers=headers).json()


def _make_place(client, headers, sb, title="Loc"):
    return client.post(f"/storybooks/{sb['id']}/places", json={"title": title}, headers=headers).json()


def _add_member(db_session, space_id, character):
    db_session.add(Membership(space_id=space_id, character_id=character.id, role="member"))
    db_session.commit()


def test_create_scene_creates_first_post_with_title(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)

    resp = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "The Tavern", "body": doc("First line")},
    )
    assert resp.status_code == 200
    scene = resp.json()
    assert scene["title"] == "The Tavern"
    assert scene["status"] == "active"
    assert scene["post_count"] == 1
    assert len(scene["posts"]) == 1
    assert scene["posts"][0]["author_character_id"] == str(character.id)
    assert scene["posts"][0]["author_name"] == character.name
    assert scene["participant_ids"] == [str(character.id)]


def test_second_character_posts_updates_participants(client, character, auth_headers, db_session, account):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    scene = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": doc()},
    ).json()

    # A second character of the same account, made a member of the space.
    other = create_character(db_session, account.id, "Second", "Elf", "Bard", "Divers")
    _add_member(db_session, sb["id"], other)

    resp = client.post(
        f"/storybooks/{sb['id']}/scenes/{scene['id']}/posts",
        headers=char_headers(auth_headers, other),
        json={"body": doc("second turn")},
    )
    assert resp.status_code == 200

    full = client.get(f"/storybooks/{sb['id']}/scenes/{scene['id']}", headers=auth_headers).json()
    assert full["post_count"] == 2
    assert full["participant_ids"] == [str(character.id), str(other.id)]


def test_cannot_start_second_active_scene(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "One", "body": doc()},
    )
    resp = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "Two", "body": doc()},
    )
    assert resp.status_code == 409


def test_can_start_new_scene_after_previous_timed_out(client, character, auth_headers, db_session):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    first = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "Old", "body": doc()},
    ).json()

    # Back-date last_post_at past the 90-day timeout → the scene auto-finishes.
    scene = db_session.query(Scene).filter(Scene.id == first["id"]).first()
    scene.last_post_at = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=100)
    db_session.commit()

    scenes = client.get(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes", headers=auth_headers
    ).json()
    assert scenes[0]["status"] == "finished"

    resp = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "New", "body": doc()},
    )
    assert resp.status_code == 200


def test_finish_scene_frees_place_and_locks_posting(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    scene = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": doc()},
    ).json()

    # The participant finishes it.
    resp = client.post(f"/storybooks/{sb['id']}/scenes/{scene['id']}/finish", headers=h)
    assert resp.status_code == 200
    assert resp.json()["status"] == "finished"

    # Posting is now locked...
    resp = client.post(
        f"/storybooks/{sb['id']}/scenes/{scene['id']}/posts",
        headers=h,
        json={"body": doc("after finish")},
    )
    assert resp.status_code == 409

    # ...and the place is free, so a new scene can start.
    resp = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "Next", "body": doc()},
    )
    assert resp.status_code == 200


def test_reopen_scene_when_place_free(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    scene = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": doc()},
    ).json()
    client.post(f"/storybooks/{sb['id']}/scenes/{scene['id']}/finish", headers=h)

    resp = client.post(f"/storybooks/{sb['id']}/scenes/{scene['id']}/reopen", headers=h)
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"

    # Posting works again.
    resp = client.post(
        f"/storybooks/{sb['id']}/scenes/{scene['id']}/posts",
        headers=h,
        json={"body": doc("back")},
    )
    assert resp.status_code == 200


def test_cannot_reopen_when_another_scene_active(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    first = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "First", "body": doc()},
    ).json()
    client.post(f"/storybooks/{sb['id']}/scenes/{first['id']}/finish", headers=h)
    # Someone starts a fresh scene in the now-free place.
    client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "Second", "body": doc()},
    )

    resp = client.post(f"/storybooks/{sb['id']}/scenes/{first['id']}/reopen", headers=h)
    assert resp.status_code == 409


def test_non_participant_non_admin_cannot_finish(client, character, auth_headers, account, db_session):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    scene = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": doc()},
    ).json()

    # A member who never posted in the scene (not a participant, not an admin).
    bystander = create_character(db_session, account.id, "Bystander", "Elf", "Bard", "Divers")
    _add_member(db_session, sb["id"], bystander)

    resp = client.post(
        f"/storybooks/{sb['id']}/scenes/{scene['id']}/finish",
        headers=char_headers(auth_headers, bystander),
    )
    assert resp.status_code == 403


def test_cannot_edit_post_in_finished_scene(client, character, auth_headers, db_session):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    scene = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": doc("original")},
    ).json()
    post_id = scene["posts"][0]["id"]
    client.post(f"/storybooks/{sb['id']}/scenes/{scene['id']}/finish", headers=h)

    resp = client.patch(
        f"/storybooks/{sb['id']}/scenes/{scene['id']}/posts/{post_id}",
        headers=h,
        json={"body": doc("edited")},
    )
    assert resp.status_code == 409


def test_posting_to_finished_scene_conflicts(client, character, auth_headers, db_session):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    scene = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "Done", "body": doc()},
    ).json()

    row = db_session.query(Scene).filter(Scene.id == scene["id"]).first()
    row.finished_at = datetime.datetime.now(datetime.timezone.utc)
    db_session.commit()

    resp = client.post(
        f"/storybooks/{sb['id']}/scenes/{scene['id']}/posts",
        headers=h,
        json={"body": doc("too late")},
    )
    assert resp.status_code == 409


def test_non_member_cannot_post(client, character, auth_headers, account, db_session):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    scene = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": doc()},
    ).json()

    outsider = create_character(db_session, account.id, "Outsider", "Ork", "Krieger", "Divers")
    resp = client.post(
        f"/storybooks/{sb['id']}/scenes/{scene['id']}/posts",
        headers=char_headers(auth_headers, outsider),
        json={"body": doc("intruder")},
    )
    assert resp.status_code == 403


def test_author_can_edit_own_post_others_cannot(client, character, auth_headers, account, db_session):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    scene = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": doc("original")},
    ).json()
    post_id = scene["posts"][0]["id"]

    # Author edits their first post + renames the scene via the title.
    resp = client.patch(
        f"/storybooks/{sb['id']}/scenes/{scene['id']}/posts/{post_id}",
        headers=h,
        json={"body": doc("edited"), "title": "Renamed RP"},
    )
    assert resp.status_code == 200
    assert resp.json()["edited_at"] is not None

    full = client.get(f"/storybooks/{sb['id']}/scenes/{scene['id']}", headers=auth_headers).json()
    assert full["title"] == "Renamed RP"
    assert full["posts"][0]["body"]["content"][0]["content"][0]["text"] == "edited"

    # A different member cannot edit someone else's post.
    other = create_character(db_session, account.id, "Nosy", "Elf", "Bard", "Divers")
    _add_member(db_session, sb["id"], other)
    resp = client.patch(
        f"/storybooks/{sb['id']}/scenes/{scene['id']}/posts/{post_id}",
        headers=char_headers(auth_headers, other),
        json={"body": doc("hax")},
    )
    assert resp.status_code == 403


def test_rejects_non_whitelisted_and_empty_bodies(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)

    # A heading node is not on the whitelist.
    bad = {"type": "doc", "content": [{"type": "heading", "attrs": {"level": 1},
                                       "content": [{"type": "text", "text": "x"}]}]}
    resp = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": bad},
    )
    assert resp.status_code == 422

    # An empty document (no visible text) is rejected.
    empty = {"type": "doc", "content": [{"type": "paragraph"}]}
    resp = client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": empty},
    )
    assert resp.status_code == 422


def test_reads_open_to_any_logged_in_user(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = _make_place(client, h, sb)
    client.post(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": doc()},
    )
    # No X-Character-Id header — plain logged-in read.
    resp = client.get(
        f"/storybooks/{sb['id']}/places/{place['id']}/scenes", headers=auth_headers
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 1
