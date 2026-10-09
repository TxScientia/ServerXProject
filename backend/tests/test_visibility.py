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
