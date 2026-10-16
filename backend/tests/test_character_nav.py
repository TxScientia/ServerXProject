"""Right-side character nav: a character's plots + favourited places (quick-travel)."""
import datetime

import jwt

from backend.app.crud import create_account, create_character, create_storybook
from backend.app.security import SECRET_KEY


def char_headers(auth_headers, character):
    return {**auth_headers, "X-Character-Id": str(character.id)}


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
    acc = create_account(db_session, email, login, "pw")
    char = create_character(db_session, acc.id, login.title(), "Orc", "Warrior", "Männlich")
    headers = {"Authorization": f"Bearer {_token(acc)}", "X-Character-Id": str(char.id)}
    return acc, char, headers


def _place(client, headers, space_id, title="Hall"):
    return client.post(f"/storybooks/{space_id}/places", json={"title": title}, headers=headers).json()


# --- plots list ------------------------------------------------------------------

def test_my_plots_lists_membership_plots(client, db_session, auth_headers, character):
    create_storybook(db_session, character, "Alpha")
    create_storybook(db_session, character, "Beta")
    plots = client.get("/me/plots", headers=char_headers(auth_headers, character)).json()
    titles = [p["title"] for p in plots]
    assert "Alpha" in titles and "Beta" in titles
    assert all(p["role"] == "creator" for p in plots)


def test_my_plots_excludes_other_characters_plots(client, db_session, auth_headers, character):
    _, other_char, other_headers = _other(db_session, "o@x.c", "olga")
    create_storybook(db_session, other_char, "NotMine")
    plots = client.get("/me/plots", headers=char_headers(auth_headers, character)).json()
    assert "NotMine" not in [p["title"] for p in plots]


# --- favourites ------------------------------------------------------------------

def test_add_and_list_favorite(client, db_session, auth_headers, character):
    h = char_headers(auth_headers, character)
    sb = create_storybook(db_session, character, "World")
    place = _place(client, h, sb.id)
    resp = client.post("/me/favorites", json={"place_id": place["id"]}, headers=h)
    assert resp.status_code == 200
    body = resp.json()
    assert body["place_id"] == place["id"]
    assert body["space_id"] == str(sb.id)

    favs = client.get("/me/favorites", headers=h).json()
    assert [f["place_id"] for f in favs] == [place["id"]]


def test_add_favorite_is_idempotent(client, db_session, auth_headers, character):
    h = char_headers(auth_headers, character)
    sb = create_storybook(db_session, character, "World")
    place = _place(client, h, sb.id)
    client.post("/me/favorites", json={"place_id": place["id"]}, headers=h)
    client.post("/me/favorites", json={"place_id": place["id"]}, headers=h)
    favs = client.get("/me/favorites", headers=h).json()
    assert len(favs) == 1


def test_remove_favorite(client, db_session, auth_headers, character):
    h = char_headers(auth_headers, character)
    sb = create_storybook(db_session, character, "World")
    place = _place(client, h, sb.id)
    client.post("/me/favorites", json={"place_id": place["id"]}, headers=h)
    assert client.delete(f"/me/favorites/{place['id']}", headers=h).status_code == 200
    assert client.get("/me/favorites", headers=h).json() == []


def test_cannot_favorite_place_in_private_plot_not_member(client, db_session, auth_headers, character):
    h = char_headers(auth_headers, character)
    sb = create_storybook(db_session, character, "Secret", visibility="private_listed")
    place = _place(client, h, sb.id)
    _, _, other_headers = _other(db_session, "p@x.c", "pavel")
    resp = client.post("/me/favorites", json={"place_id": place["id"]}, headers=other_headers)
    assert resp.status_code == 403


def test_can_favorite_place_in_public_plot_as_nonmember(client, db_session, auth_headers, character):
    h = char_headers(auth_headers, character)
    sb = create_storybook(db_session, character, "OpenWorld", visibility="public")
    place = _place(client, h, sb.id)
    _, _, other_headers = _other(db_session, "q@x.c", "quinn")
    resp = client.post("/me/favorites", json={"place_id": place["id"]}, headers=other_headers)
    assert resp.status_code == 200
