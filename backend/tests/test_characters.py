"""Route tests for the character endpoints — exercise the shared get_current_user."""
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
