from backend.app.crud import create_account, create_character, create_storybook


def doc(text="Hello OOC"):
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def test_global_ooc_create_and_list(client, auth_headers, character):
    headers = {**auth_headers, "X-Character-Id": str(character.id)}
    response = client.post("/ooc/messages", headers=headers, json={"body": doc("Hi all")})

    assert response.status_code == 200
    created = response.json()
    assert created["scope_type"] == "global"
    assert created["author_name"] == "Testchar"

    listing = client.get("/ooc/messages", headers=auth_headers)
    assert listing.status_code == 200
    assert listing.json()[0]["id"] == created["id"]


def test_plot_ooc_requires_membership(client, db_session, auth_headers, character, account):
    space = create_storybook(db_session, character, "Plot", "Desc")
    other_account = create_account(db_session, "other@example.com", "other", "secret")
    other_char = create_character(db_session, other_account.id, "Other", "Elf", "Mage", "Divers")

    owner_headers = {**auth_headers, "X-Character-Id": str(character.id)}
    created = client.post(
        f"/storybooks/{space.id}/ooc/messages",
        headers=owner_headers,
        json={"body": doc("Plot only")},
    )
    assert created.status_code == 200

    other_headers = {**auth_headers, "X-Character-Id": str(other_char.id)}
    denied = client.get(f"/storybooks/{space.id}/ooc/messages", headers=other_headers)
    assert denied.status_code == 403
