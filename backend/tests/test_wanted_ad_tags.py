import pytest
from sqlalchemy import inspect, text

from backend.app.crud import create_global_wanted_ad, create_storybook


def doc():
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Join us"}]}]}


def headers(auth_headers, character):
    return {**auth_headers, "X-Character-Id": str(character.id)}


def test_create_and_list_six_tags(client, auth_headers, character):
    tags = [" fantasy ", "Drama", "Adventure", "Romance", "Mystery", "x" * 50]
    response = client.post("/wanted-ads", headers=headers(auth_headers, character),
                           json={"title": "Wanted", "body": doc(), "tags": tags})
    assert response.status_code == 200
    expected = [tag.strip() for tag in tags]
    assert response.json()["tags"] == expected
    listing = client.get("/wanted-ads", headers=auth_headers)
    assert listing.status_code == 200
    assert listing.json()[0]["tags"] == expected


def test_tags_are_optional_for_older_clients(client, auth_headers, character):
    response = client.post("/wanted-ads", headers=headers(auth_headers, character),
                           json={"title": "No tags", "body": doc()})
    assert response.status_code == 200
    assert response.json()["tags"] == []


@pytest.mark.parametrize("tags", [["tag"] * 7, ["x" * 51], ["   "], [123], "not a list", None])
def test_reject_invalid_tags(client, auth_headers, character, tags):
    response = client.post("/wanted-ads", headers=headers(auth_headers, character),
                           json={"title": "Invalid", "body": doc(), "tags": tags})
    assert response.status_code == 422
    assert client.get("/wanted-ads", headers=auth_headers).json() == []


def test_plot_ads_support_tags_too(client, db_session, auth_headers, character):
    space = create_storybook(db_session, character, "Plot", "Description")
    url = f"/storybooks/{space.id}/wanted-ads"
    response = client.post(url, headers=headers(auth_headers, character),
                           json={"title": "Plot ad", "body": doc(), "tags": ["Fantasy"]})
    assert response.status_code == 200
    assert response.json()["tags"] == ["Fantasy"]
    assert client.get(url, headers=headers(auth_headers, character)).json()[0]["tags"] == ["Fantasy"]


def test_existing_database_migration_preserves_ads_and_is_idempotent(db_engine, db_session, character, monkeypatch):
    from backend.app import main

    ad = create_global_wanted_ad(db_session, author_character_id=character.id, title="Existing ad", body=doc())
    db_session.commit()
    db_session.close()
    with db_engine.begin() as conn:
        conn.execute(text("ALTER TABLE wanted_ads DROP COLUMN tags"))
    monkeypatch.setattr(main, "engine", db_engine)
    main.init_db()
    main.init_db()
    assert "tags" in {col["name"] for col in inspect(db_engine).get_columns("wanted_ads")}
    with db_engine.connect() as conn:
        row = conn.execute(text("SELECT title, tags FROM wanted_ads")).one()
    assert row.title == "Existing ad"
    assert row.tags == "[]"
