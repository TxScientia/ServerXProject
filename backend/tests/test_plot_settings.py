"""Route tests for PlotSettings — StoryBook update, place edit/delete/reorder, gating."""
from backend.app.crud import create_character


def char_headers(auth_headers, character):
    return {**auth_headers, "X-Character-Id": str(character.id)}


def _make_storybook(client, headers, title="World"):
    return client.post("/storybooks", json={"title": title}, headers=headers).json()


def test_update_storybook_settings(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)

    resp = client.patch(
        f"/storybooks/{sb['id']}",
        headers=h,
        json={
            "title": "New Title",
            "description": "short summary",
            "image_url": "http://example.com/x.png",
            "biography": "[b]lore[/b]",
            "visibility": "generic",
            "tags": ["scifi", "romance"],
        },
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "New Title"
    assert body["description"] == "short summary"
    assert body["image_url"] == "http://example.com/x.png"
    assert body["biography"] == "[b]lore[/b]"
    assert body["visibility"] == "generic"
    assert set(body["tags"]) == {"scifi", "romance"}


def test_update_storybook_tag_cap(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    resp = client.patch(
        f"/storybooks/{sb['id']}",
        headers=h,
        json={"tags": ["1", "2", "3", "4", "5", "6", "7"]},
    )
    assert resp.status_code == 400


def test_non_editor_cannot_update(client, character, auth_headers, account, db_session):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    # A second character of the same account — owned by caller, but not a member.
    outsider = create_character(db_session, account.id, "Outsider", "Elf", "Späher", "Divers")

    resp = client.patch(
        f"/storybooks/{sb['id']}",
        headers=char_headers(auth_headers, outsider),
        json={"title": "Hax"},
    )
    assert resp.status_code == 403


def test_update_place(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    place = client.post(f"/storybooks/{sb['id']}/places", json={"title": "Loc"}, headers=h).json()

    resp = client.patch(
        f"/storybooks/{sb['id']}/places/{place['id']}",
        headers=h,
        json={"title": "Renamed", "description": "a desc"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Renamed"
    assert resp.json()["description"] == "a desc"


def test_delete_place_cascades(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    parent = client.post(f"/storybooks/{sb['id']}/places", json={"title": "Parent"}, headers=h).json()
    client.post(
        f"/storybooks/{sb['id']}/places",
        json={"title": "Child", "parent_place_id": parent["id"]},
        headers=h,
    )

    resp = client.delete(f"/storybooks/{sb['id']}/places/{parent['id']}", headers=h)
    assert resp.status_code == 200

    places = client.get(f"/storybooks/{sb['id']}/places", headers=auth_headers).json()
    assert places == []  # child cascaded away with the parent


def test_reorder_places(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    a = client.post(f"/storybooks/{sb['id']}/places", json={"title": "A"}, headers=h).json()
    b = client.post(f"/storybooks/{sb['id']}/places", json={"title": "B"}, headers=h).json()

    resp = client.post(
        f"/storybooks/{sb['id']}/places/reorder",
        headers=h,
        json={"ordered_ids": [b["id"], a["id"]]},
    )
    assert resp.status_code == 200

    places = client.get(f"/storybooks/{sb['id']}/places", headers=auth_headers).json()
    assert [p["title"] for p in places] == ["B", "A"]


def test_rank_crud_orders_by_priority(client, character, auth_headers):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)

    low = client.post(f"/storybooks/{sb['id']}/ranks", json={"name": "Member", "weight": 5}, headers=h).json()
    high = client.post(f"/storybooks/{sb['id']}/ranks", json={"name": "Leader", "weight": 1}, headers=h).json()

    ranks = client.get(f"/storybooks/{sb['id']}/ranks", headers=auth_headers).json()
    assert [r["name"] for r in ranks] == ["Leader", "Member"]

    resp = client.patch(
        f"/storybooks/{sb['id']}/ranks/{low['id']}",
        json={"name": "Co-Leader", "weight": 1},
        headers=h,
    )
    assert resp.status_code == 200

    resp = client.delete(f"/storybooks/{sb['id']}/ranks/{high['id']}", headers=h)
    assert resp.status_code == 200

    ranks = client.get(f"/storybooks/{sb['id']}/ranks", headers=auth_headers).json()
    assert [r["name"] for r in ranks] == ["Co-Leader"]


def test_non_editor_cannot_create_rank(client, character, auth_headers, account, db_session):
    h = char_headers(auth_headers, character)
    sb = _make_storybook(client, h)
    outsider = create_character(db_session, account.id, "Rank Outsider", "Elf", "Späher", "Divers")

    resp = client.post(
        f"/storybooks/{sb['id']}/ranks",
        headers=char_headers(auth_headers, outsider),
        json={"name": "Hax", "weight": 1},
    )
    assert resp.status_code == 403
