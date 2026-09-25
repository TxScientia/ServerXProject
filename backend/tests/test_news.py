from backend.app.crud import create_storybook


def doc(text="Hello world"):
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def test_global_news_requires_admin(client, auth_headers):
    response = client.post(
        "/admin/news",
        headers=auth_headers,
        json={"title": "Update", "body": doc(), "kind": "info", "pinned": False},
    )

    assert response.status_code == 403


def test_admin_can_create_and_list_global_news(client, db_session, account, auth_headers):
    account.is_global_admin = True
    db_session.commit()

    response = client.post(
        "/admin/news",
        headers=auth_headers,
        json={"title": "Update", "body": doc("New things"), "kind": "update", "pinned": True},
    )

    assert response.status_code == 200
    created = response.json()
    assert created["scope_type"] == "global"
    assert created["title"] == "Update"
    assert created["kind"] == "update"
    assert created["pinned"] is True
    assert created["author_login_name"] == "player"

    unread = client.get("/news/unread-count", headers=auth_headers)
    assert unread.status_code == 200
    assert unread.json() == {"count": 1}

    listing = client.get("/news", headers=auth_headers)
    assert listing.status_code == 200
    assert [item["id"] for item in listing.json()] == [created["id"]]

    marked = client.post("/news/mark-read", headers=auth_headers)
    assert marked.status_code == 200
    assert marked.json() == {"marked": 1}
    assert client.get("/news/unread-count", headers=auth_headers).json() == {"count": 0}


def test_plot_editor_can_create_storybook_news(client, db_session, account, character, auth_headers):
    space = create_storybook(db_session, character, "Plot", "Desc")
    headers = {**auth_headers, "X-Character-Id": str(character.id)}

    response = client.post(
        f"/storybooks/{space.id}/news",
        headers=headers,
        json={"title": "Plot update", "body": doc("Plot news"), "kind": "info", "pinned": False},
    )

    assert response.status_code == 200
    created = response.json()
    assert created["scope_type"] == "space"
    assert created["space_id"] == str(space.id)
    assert created["author_character_name"] == "Testchar"

    unread = client.get(f"/storybooks/{space.id}/news/unread-count", headers=auth_headers)
    assert unread.status_code == 200
    assert unread.json() == {"count": 1}

    listing = client.get(f"/storybooks/{space.id}/news", headers=auth_headers)
    assert listing.status_code == 200
    assert listing.json()[0]["title"] == "Plot update"

    marked = client.post(f"/storybooks/{space.id}/news/mark-read", headers=auth_headers)
    assert marked.status_code == 200
    assert marked.json() == {"marked": 1}
    assert client.get(f"/storybooks/{space.id}/news/unread-count", headers=auth_headers).json() == {"count": 0}
