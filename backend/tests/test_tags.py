"""The admin-managed tag pool + plots using only pool tags."""
from backend.app.crud import create_storybook


def char_headers(auth_headers, character):
    return {**auth_headers, "X-Character-Id": str(character.id)}


def _make_admin(db_session, account):
    account.is_global_admin = True
    db_session.commit()


def test_list_tags_requires_auth(client):
    assert client.get("/tags").status_code in (401, 403, 422)


def test_admin_create_and_list_tag(client, account, auth_headers, db_session):
    _make_admin(db_session, account)
    resp = client.post("/admin/tags", headers=auth_headers, json={"name": "Mystery"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Mystery"
    names = [t["name"] for t in client.get("/tags", headers=auth_headers).json()]
    assert "Mystery" in names


def test_non_admin_cannot_manage_tags(client, account, auth_headers):
    # account is not an admin by default
    assert client.post("/admin/tags", headers=auth_headers, json={"name": "X"}).status_code == 403


def test_duplicate_tag_rejected(client, account, auth_headers, db_session):
    _make_admin(db_session, account)
    client.post("/admin/tags", headers=auth_headers, json={"name": "Dup"})
    assert client.post("/admin/tags", headers=auth_headers, json={"name": "Dup"}).status_code == 409


def test_rename_tag(client, account, auth_headers, db_session):
    _make_admin(db_session, account)
    tid = client.post("/admin/tags", headers=auth_headers, json={"name": "Old"}).json()["id"]
    resp = client.patch(f"/admin/tags/{tid}", headers=auth_headers, json={"name": "New"})
    assert resp.status_code == 200 and resp.json()["name"] == "New"


def test_delete_tag_removes_it_from_pool_and_plots(client, account, auth_headers, db_session, character):
    _make_admin(db_session, account)
    h = char_headers(auth_headers, character)
    tid = client.post("/admin/tags", headers=auth_headers, json={"name": "Temp"}).json()["id"]
    sb = create_storybook(db_session, character, "World")
    client.patch(f"/storybooks/{sb.id}", headers=h, json={"tags": ["Temp"]})
    assert "Temp" in client.get(f"/storybooks/{sb.id}", headers=auth_headers).json()["tags"]

    client.delete(f"/admin/tags/{tid}", headers=auth_headers)
    assert "Temp" not in [t["name"] for t in client.get("/tags", headers=auth_headers).json()]
    assert client.get(f"/storybooks/{sb.id}", headers=auth_headers).json()["tags"] == []


def test_plot_only_accepts_pool_tags(client, account, auth_headers, db_session, character):
    """Assigning a non-pool tag name to a plot is ignored (no ad-hoc tag creation)."""
    _make_admin(db_session, account)
    h = char_headers(auth_headers, character)
    client.post("/admin/tags", headers=auth_headers, json={"name": "Known"})
    sb = create_storybook(db_session, character, "World")
    client.patch(f"/storybooks/{sb.id}", headers=h, json={"tags": ["Known", "Unknown"]})
    assert client.get(f"/storybooks/{sb.id}", headers=auth_headers).json()["tags"] == ["Known"]
