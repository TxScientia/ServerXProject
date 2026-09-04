"""Route tests for the thin StoryBook slice: create / list / enter + places."""
from backend.app.crud import create_account, create_character


def char_headers(auth_headers, character):
    """Auth headers plus the acting-character header."""
    return {**auth_headers, "X-Character-Id": str(character.id)}


# --- create ---------------------------------------------------------------

def test_create_storybook(client, character, auth_headers):
    resp = client.post(
        "/storybooks",
        json={"title": "Neverwhere", "description": "A world below"},
        headers=char_headers(auth_headers, character),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Neverwhere"
    assert body["type"] == "storybook"
    assert body["owner_character_id"] == str(character.id)


def test_create_storybook_requires_acting_character(client, auth_headers):
    resp = client.post("/storybooks", json={"title": "X"}, headers=auth_headers)
    assert resp.status_code == 422  # missing X-Character-Id header


def test_cannot_act_as_someone_elses_character(client, db_session, auth_headers):
    other = create_account(db_session, "other@example.com", "other", "pw")
    other_char = create_character(db_session, other.id, "NotYours", "Ork", "Krieger", "Divers")

    resp = client.post(
        "/storybooks",
        json={"title": "X"},
        headers={**auth_headers, "X-Character-Id": str(other_char.id)},
    )
    assert resp.status_code == 403


def test_creator_becomes_admin_member(client, character, auth_headers, db_session):
    from backend.app.crud import get_membership

    resp = client.post(
        "/storybooks", json={"title": "World"}, headers=char_headers(auth_headers, character)
    )
    sb_id = resp.json()["id"]
    membership = get_membership(db_session, sb_id, character.id)
    assert membership is not None
    assert membership.role == "admin"


# --- list / enter ---------------------------------------------------------

def test_list_storybooks(client, character, auth_headers):
    client.post("/storybooks", json={"title": "One"}, headers=char_headers(auth_headers, character))
    client.post("/storybooks", json={"title": "Two"}, headers=char_headers(auth_headers, character))

    resp = client.get("/storybooks", headers=auth_headers)
    assert resp.status_code == 200
    titles = {sb["title"] for sb in resp.json()}
    assert {"One", "Two"} <= titles


def test_enter_storybook_returns_places(client, character, auth_headers):
    sb_id = client.post(
        "/storybooks", json={"title": "World"}, headers=char_headers(auth_headers, character)
    ).json()["id"]

    resp = client.get(f"/storybooks/{sb_id}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["places"] == []


def test_enter_missing_storybook_404(client, auth_headers):
    resp = client.get(
        "/storybooks/00000000-0000-0000-0000-000000000000", headers=auth_headers
    )
    assert resp.status_code == 404


# --- places ---------------------------------------------------------------

def test_admin_can_create_place(client, character, auth_headers):
    sb_id = client.post(
        "/storybooks", json={"title": "World"}, headers=char_headers(auth_headers, character)
    ).json()["id"]

    resp = client.post(
        f"/storybooks/{sb_id}/places",
        json={"title": "Location A"},
        headers=char_headers(auth_headers, character),
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Location A"


def test_non_member_character_cannot_create_place(
    client, character, auth_headers, db_session, account
):
    sb_id = client.post(
        "/storybooks", json={"title": "World"}, headers=char_headers(auth_headers, character)
    ).json()["id"]

    # A second character of the SAME account — owned by the caller, but not a member.
    outsider = create_character(db_session, account.id, "Outsider", "Elf", "Späher", "Divers")

    resp = client.post(
        f"/storybooks/{sb_id}/places",
        json={"title": "Sneaky"},
        headers=char_headers(auth_headers, outsider),
    )
    assert resp.status_code == 403


def test_nested_places_list(client, character, auth_headers):
    headers = char_headers(auth_headers, character)
    sb_id = client.post("/storybooks", json={"title": "World"}, headers=headers).json()["id"]

    parent = client.post(
        f"/storybooks/{sb_id}/places", json={"title": "Location A"}, headers=headers
    ).json()
    client.post(
        f"/storybooks/{sb_id}/places",
        json={"title": "Sublocation A1", "parent_place_id": parent["id"]},
        headers=headers,
    )

    places = client.get(f"/storybooks/{sb_id}/places", headers=auth_headers).json()
    assert len(places) == 2
    child = next(p for p in places if p["title"] == "Sublocation A1")
    assert child["parent_place_id"] == parent["id"]
