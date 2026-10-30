"""Route tests for the character endpoints — exercise the shared get_current_user."""
import json
from uuid import uuid4

from backend.app.crud import create_account, create_character


def test_get_characters_requires_authorization_header(client):
    resp = client.get("/characters")
    assert resp.status_code == 422  # missing required Authorization header


def test_get_characters_rejects_bad_token(client):
    resp = client.get("/characters", headers={"Authorization": "Bearer not-a-token"})
    assert resp.status_code == 401


def test_get_characters_returns_only_the_callers_characters(
    client, db_session, account, auth_headers
):
    create_character(db_session, account.id, "Mine", "Mensch", "Held", "Divers")
    other = create_account(db_session, "other@example.com", "other", "pw")
    create_character(db_session, other.id, "Theirs", "Ork", "Krieger", "Divers")

    resp = client.get("/characters", headers=auth_headers)

    assert resp.status_code == 200
    body = resp.json()
    assert [c["name"] for c in body] == ["Mine"]
    assert "id" in body[0]  # frontend needs the id for X-Character-Id


def test_get_character_requires_auth(client, character):
    url = f"/characters/{character.id}"
    assert client.get(url).status_code == 422
    assert client.get(url, headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_get_character_allows_reading_other_accounts_profile(client, db_session, auth_headers):
    other = create_account(db_session, "other@example.com", "other", "pw")
    character = create_character(db_session, other.id, "Theirs", "Elf", "Magier", "Divers")
    character.editor_data = json.dumps({"biography": "Public biography"})
    db_session.commit()

    response = client.get(f"/characters/{character.id}", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["name"] == "Theirs"
    assert response.json()["editorData"]["biography"] == "Public biography"

    response = client.put(
        f"/characters/{character.id}",
        headers=auth_headers,
        json={"name": "Changed", "race": "Elf", "spec": "Magier", "gender": "Divers"},
    )
    assert response.status_code == 404
    db_session.refresh(character)
    assert character.name == "Theirs"


def test_get_character_returns_own_profile(client, character, auth_headers):
    response = client.get(f"/characters/{character.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == str(character.id)


def test_get_character_missing(client, auth_headers):
    assert client.get(f"/characters/{uuid4()}", headers=auth_headers).status_code == 404


def test_create_character(client, account, auth_headers):
    resp = client.post(
        "/characters",
        json={"name": "New", "race": "Elf", "spec": "Magier", "gender": "Divers"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "New"
    assert body["spec"] == "Magier"
    assert "id" in body
