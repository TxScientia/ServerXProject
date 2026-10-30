from uuid import uuid4

from sqlalchemy import inspect, text

from backend.app.crud import create_account, create_character, create_global_wanted_ad, create_storybook
from backend.app.models import Character


def test_favorites_persist_and_can_be_removed(client, character, auth_headers):
    url = f"/characters/{character.id}/favorite"
    assert client.get("/characters", headers=auth_headers).json()[0]["isFavorite"] is False
    response = client.patch(url, headers=auth_headers, json={"is_favorite": True})
    assert response.status_code == 200
    assert response.json() == {"id": str(character.id), "isFavorite": True}
    assert client.get("/characters", headers=auth_headers).json()[0]["isFavorite"] is True
    assert client.patch(url, headers=auth_headers, json={"is_favorite": False}).status_code == 200
    assert client.get("/characters", headers=auth_headers).json()[0]["isFavorite"] is False


def test_only_owner_can_favorite_or_delete(client, db_session, auth_headers):
    other = create_account(db_session, "other-action@example.com", "other-action", "secret")
    character = create_character(db_session, other.id, "Other", "Elf", "Mage", "Divers")
    assert client.patch(f"/characters/{character.id}/favorite", headers=auth_headers,
                        json={"is_favorite": True}).status_code == 404
    assert client.delete(f"/characters/{character.id}", headers=auth_headers).status_code == 404
    db_session.refresh(character)
    assert not character.is_deleted
    assert not character.is_favorite


def test_delete_hides_character_but_preserves_authored_ads(client, db_session, character, auth_headers):
    character.is_favorite = True
    db_session.commit()
    body = {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Existing ad"}]}]}
    ad = create_global_wanted_ad(db_session, author_character_id=character.id, title="Kept ad", body=body)
    character_id = str(character.id)
    response = client.delete(f"/characters/{character_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {"deleted": True}
    assert client.get("/characters", headers=auth_headers).json() == []
    assert client.get("/residents", headers=auth_headers).json() == []
    assert client.get(f"/characters/{character_id}", headers=auth_headers).status_code == 404
    assert client.patch(f"/characters/{character_id}/favorite", headers=auth_headers,
                        json={"is_favorite": True}).status_code == 404
    assert client.put(f"/characters/{character_id}", headers=auth_headers,
                      json={"name": "Revive", "race": "Elf", "spec": "Mage", "gender": "Divers"}).status_code == 404
    assert client.get("/me/plots", headers={**auth_headers, "X-Character-Id": character_id}).status_code == 404
    listing = client.get("/wanted-ads", headers=auth_headers).json()
    assert listing[0]["id"] == str(ad.id)
    assert listing[0]["author_name"] == "Testchar"
    db_session.expire_all()
    retained = db_session.get(Character, character.id)
    assert retained.is_deleted and not retained.is_favorite


def test_deleting_plot_owner_is_rejected_to_protect_shared_data(client, db_session, character, auth_headers):
    create_storybook(db_session, character, "Shared plot", "Keep this plot")
    assert client.delete(f"/characters/{character.id}", headers=auth_headers).status_code == 409
    assert len(client.get("/characters", headers=auth_headers).json()) == 1


def test_character_actions_require_login_and_existing_character(client, character, auth_headers):
    assert client.delete(f"/characters/{character.id}").status_code == 422
    assert client.patch(f"/characters/{character.id}/favorite", json={"is_favorite": True}).status_code == 422
    assert client.delete(f"/characters/{uuid4()}", headers=auth_headers).status_code == 404
    assert client.patch(f"/characters/{character.id}/favorite", headers=auth_headers,
                        json={"is_favorite": "yes"}).status_code == 422


def test_character_flags_migrate_without_changing_existing_profiles(db_engine, db_session, character, monkeypatch):
    from backend.app import main

    character.editor_data = '{"biography": "Keep biography"}'
    db_session.commit()
    db_session.close()
    with db_engine.begin() as conn:
        conn.execute(text("ALTER TABLE characters DROP COLUMN is_favorite"))
        conn.execute(text("ALTER TABLE characters DROP COLUMN is_deleted"))
    monkeypatch.setattr(main, "engine", db_engine)
    main.init_db()
    main.init_db()
    assert {"is_favorite", "is_deleted"} <= {col["name"] for col in inspect(db_engine).get_columns("characters")}
    with db_engine.connect() as conn:
        row = conn.execute(text("SELECT name, editor_data, is_favorite, is_deleted FROM characters")).one()
    assert row.name == "Testchar"
    assert row.editor_data == '{"biography": "Keep biography"}'
    assert row.is_favorite == 0 and row.is_deleted == 0
