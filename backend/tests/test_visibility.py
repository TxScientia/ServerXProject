"""Visibility / access enforcement for StoryBooks (the agreed standard matrix)."""
import datetime

import jwt

from backend.app.crud import create_account, create_character, create_storybook
from backend.app.security import SECRET_KEY


def doc(text="hi"):
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def _token(account):
    return jwt.encode(
        {
            "user_id": str(account.id),
            "login_name": account.login_name,
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
        },
        SECRET_KEY,
        algorithm="HS256",
    )


def _other(db_session, email, login):
    """A second, unrelated account + character (a non-member) with auth headers."""
    acc = create_account(db_session, email, login, "pw")
    char = create_character(db_session, acc.id, login.title(), "Orc", "Warrior", "Männlich")
    headers = {"Authorization": f"Bearer {_token(acc)}", "X-Character-Id": str(char.id)}
    return acc, char, headers


# --- listing --------------------------------------------------------------------

def test_private_hidden_not_listed_for_nonmember(client, db_session, character):
    create_storybook(db_session, character, "SecretWorld", visibility="private_hidden")
    _, _, other = _other(db_session, "a@x.c", "alice")
    titles = [s["title"] for s in client.get("/storybooks", headers=other).json()]
    assert "SecretWorld" not in titles


def test_private_hidden_listed_for_member(client, db_session, auth_headers, character):
    create_storybook(db_session, character, "SecretWorld", visibility="private_hidden")
    titles = [s["title"] for s in client.get("/storybooks", headers=auth_headers).json()]
    assert "SecretWorld" in titles


def test_private_listed_is_shown_in_list(client, db_session, character):
    create_storybook(db_session, character, "ListedWorld", visibility="private_listed")
    _, _, other = _other(db_session, "b@x.c", "bob")
    titles = [s["title"] for s in client.get("/storybooks", headers=other).json()]
    assert "ListedWorld" in titles


# --- viewing a single plot ------------------------------------------------------

def test_private_listed_detail_forbidden_for_nonmember(client, db_session, character):
    sb = create_storybook(db_session, character, "ListedWorld", visibility="private_listed")
    _, _, other = _other(db_session, "c@x.c", "carol")
    assert client.get(f"/storybooks/{sb.id}", headers=other).status_code == 403


def test_public_detail_open_to_nonmember(client, db_session, character):
    sb = create_storybook(db_session, character, "PublicWorld", visibility="public")
    _, _, other = _other(db_session, "d@x.c", "dave")
    assert client.get(f"/storybooks/{sb.id}", headers=other).status_code == 200


# --- posting --------------------------------------------------------------------

def test_public_plot_nonmember_can_start_scene(client, db_session, auth_headers, character):
    h = {**auth_headers, "X-Character-Id": str(character.id)}
    sb = create_storybook(db_session, character, "PublicRP", visibility="public")
    place = client.post(f"/storybooks/{sb.id}/places", json={"title": "Hall"}, headers=h).json()
    _, _, other = _other(db_session, "e@x.c", "erin")
    resp = client.post(
        f"/storybooks/{sb.id}/places/{place['id']}/scenes",
        headers=other,
        json={"title": "Open scene", "body": doc()},
    )
    assert resp.status_code == 200


def test_private_plot_nonmember_cannot_start_scene(client, db_session, auth_headers, character):
    h = {**auth_headers, "X-Character-Id": str(character.id)}
    sb = create_storybook(db_session, character, "PrivateRP", visibility="private_listed")
    place = client.post(f"/storybooks/{sb.id}/places", json={"title": "Hall"}, headers=h).json()
    _, _, other = _other(db_session, "f@x.c", "finn")
    resp = client.post(
        f"/storybooks/{sb.id}/places/{place['id']}/scenes",
        headers=other,
        json={"title": "Blocked", "body": doc()},
    )
    assert resp.status_code == 403


# --- reading content (the read-gating: non-members can't read a private plot) ----

def _private_plot_with_content(client, db_session, auth_headers, character, visibility="private_listed"):
    """A plot (default private) with a place, a scene, a plot-news item and a wanted ad."""
    h = {**auth_headers, "X-Character-Id": str(character.id)}
    sb = create_storybook(db_session, character, "WalledGarden", visibility=visibility)
    place = client.post(f"/storybooks/{sb.id}/places", json={"title": "Hall"}, headers=h).json()
    scene = client.post(
        f"/storybooks/{sb.id}/places/{place['id']}/scenes",
        headers=h,
        json={"title": "RP", "body": doc()},
    ).json()
    client.post(
        f"/storybooks/{sb.id}/news",
        headers=h,
        json={"title": "Secret", "body": doc(), "kind": "info", "pinned": False},
    )
    client.post(
        f"/storybooks/{sb.id}/wanted-ads",
        headers=h,
        json={"title": "Looking", "body": doc()},
    )
    return sb, place, scene, h


def test_private_places_forbidden_for_nonmember(client, db_session, auth_headers, character):
    sb, _, _, _ = _private_plot_with_content(client, db_session, auth_headers, character)
    _, _, other = _other(db_session, "g@x.c", "gwen")
    assert client.get(f"/storybooks/{sb.id}/places", headers=other).status_code == 403


def test_private_ranks_forbidden_for_nonmember(client, db_session, auth_headers, character):
    sb, _, _, _ = _private_plot_with_content(client, db_session, auth_headers, character)
    _, _, other = _other(db_session, "h@x.c", "hugo")
    assert client.get(f"/storybooks/{sb.id}/ranks", headers=other).status_code == 403


def test_private_scenes_list_forbidden_for_nonmember(client, db_session, auth_headers, character):
    sb, place, _, _ = _private_plot_with_content(client, db_session, auth_headers, character)
    _, _, other = _other(db_session, "i@x.c", "iris")
    resp = client.get(f"/storybooks/{sb.id}/places/{place['id']}/scenes", headers=other)
    assert resp.status_code == 403


def test_private_scene_detail_forbidden_for_nonmember(client, db_session, auth_headers, character):
    sb, _, scene, _ = _private_plot_with_content(client, db_session, auth_headers, character)
    _, _, other = _other(db_session, "j@x.c", "jack")
    assert client.get(f"/storybooks/{sb.id}/scenes/{scene['id']}", headers=other).status_code == 403


def test_private_news_forbidden_for_nonmember(client, db_session, auth_headers, character):
    sb, _, _, _ = _private_plot_with_content(client, db_session, auth_headers, character)
    _, _, other = _other(db_session, "k@x.c", "kira")
    assert client.get(f"/storybooks/{sb.id}/news", headers=other).status_code == 403


def test_private_wanted_ads_forbidden_for_nonmember(client, db_session, auth_headers, character):
    sb, _, _, _ = _private_plot_with_content(client, db_session, auth_headers, character)
    _, _, other = _other(db_session, "l@x.c", "liam")
    assert client.get(f"/storybooks/{sb.id}/wanted-ads", headers=other).status_code == 403


def test_public_content_readable_by_nonmember(client, db_session, auth_headers, character):
    sb, place, scene, _ = _private_plot_with_content(
        client, db_session, auth_headers, character, visibility="public"
    )
    _, _, other = _other(db_session, "m@x.c", "mia")
    assert client.get(f"/storybooks/{sb.id}/places", headers=other).status_code == 200
    assert client.get(f"/storybooks/{sb.id}/places/{place['id']}/scenes", headers=other).status_code == 200
    assert client.get(f"/storybooks/{sb.id}/scenes/{scene['id']}", headers=other).status_code == 200
    assert client.get(f"/storybooks/{sb.id}/news", headers=other).status_code == 200
    assert client.get(f"/storybooks/{sb.id}/wanted-ads", headers=other).status_code == 200
