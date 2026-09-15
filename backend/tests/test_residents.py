"""Route tests for the resident list (all characters)."""
from backend.app.crud import create_account, create_character


def test_residents_requires_auth(client):
    assert client.get("/residents").status_code == 422


def test_residents_lists_all_characters_across_accounts(
    client, db_session, account, auth_headers
):
    create_character(db_session, account.id, "Mine", "Mensch", "Held", "Divers")
    other = create_account(db_session, "other@example.com", "other", "pw")
    create_character(db_session, other.id, "Theirs", "Ork", "Krieger", "Divers")

    resp = client.get("/residents", headers=auth_headers)

    assert resp.status_code == 200
    names = {c["name"] for c in resp.json()}
    assert {"Mine", "Theirs"} <= names
