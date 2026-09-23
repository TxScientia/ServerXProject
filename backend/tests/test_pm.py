"""Tests for the PM (messaging) system."""
from backend.app.crud import create_character


def char_headers(auth_headers, character):
    return {**auth_headers, "X-Character-Id": str(character.id)}


def test_create_direct_chat(client, character, auth_headers, account, db_session):
    """Create a direct chat between two characters."""
    h = char_headers(auth_headers, character)
    other = create_character(db_session, account.id, "Other", "Elf", "Ranger", "Divers")

    resp = client.post(
        "/pm/chats/direct",
        headers=h,
        json={"character_id": str(other.id)},
    )
    assert resp.status_code == 200
    chat = resp.json()
    assert chat["type"] == "direct"
    assert chat["member_count"] == 2


def test_cannot_create_direct_chat_with_self(client, character, auth_headers):
    """Cannot create a direct chat with yourself."""
    h = char_headers(auth_headers, character)
    resp = client.post(
        "/pm/chats/direct",
        headers=h,
        json={"character_id": str(character.id)},
    )
    assert resp.status_code == 400


def test_create_group_chat(client, character, auth_headers, account, db_session):
    """Create a group chat with multiple members."""
    h = char_headers(auth_headers, character)
    other1 = create_character(db_session, account.id, "Other1", "Elf", "Ranger", "Divers")
    other2 = create_character(db_session, account.id, "Other2", "Orc", "Warrior", "Männlich")

    resp = client.post(
        "/pm/chats/group",
        headers=h,
        json={
            "name": "Test Group",
            "character_ids": [str(other1.id), str(other2.id)],
        },
    )
    assert resp.status_code == 200
    chat = resp.json()
    assert chat["type"] == "group"
    assert chat["name"] == "Test Group"
    assert chat["member_count"] == 3  # including acting character


def test_list_chats(client, character, auth_headers, account, db_session):
    """List all chats for a character."""
    h = char_headers(auth_headers, character)
    other = create_character(db_session, account.id, "Other", "Elf", "Ranger", "Divers")

    # Create two chats
    client.post("/pm/chats/direct", headers=h, json={"character_id": str(other.id)})
    client.post(
        "/pm/chats/group",
        headers=h,
        json={"name": "Group1", "character_ids": [str(other.id)]},
    )

    resp = client.get("/pm/chats", headers=h)
    assert resp.status_code == 200
    chats = resp.json()
    assert len(chats) == 2
    assert chats[0]["type"] in ("direct", "group")


def test_send_message(client, character, auth_headers, account, db_session):
    """Send a message in a chat."""
    h = char_headers(auth_headers, character)
    other = create_character(db_session, account.id, "Other", "Elf", "Ranger", "Divers")

    chat = client.post(
        "/pm/chats/direct",
        headers=h,
        json={"character_id": str(other.id)},
    ).json()

    body = {
        "type": "doc",
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hallo!"}]}],
    }
    resp = client.post(
        f"/pm/chats/{chat['id']}/messages",
        headers=h,
        json={"body": body},
    )
    assert resp.status_code == 200
    msg = resp.json()
    assert msg["from_character_id"] == str(character.id)
    assert msg["from_character_name"] == character.name
    assert msg["body"] == body


def test_cannot_send_message_if_not_member(client, character, auth_headers, account, db_session):
    """Cannot send a message if not a chat member."""
    h1 = char_headers(auth_headers, character)
    other = create_character(db_session, account.id, "Other", "Elf", "Ranger", "Divers")
    outsider = create_character(db_session, account.id, "Outsider", "Orc", "Warrior", "Männlich")

    chat = client.post(
        "/pm/chats/direct",
        headers=h1,
        json={"character_id": str(other.id)},
    ).json()

    h2 = char_headers(auth_headers, outsider)
    resp = client.post(
        f"/pm/chats/{chat['id']}/messages",
        headers=h2,
        json={"body": {"type": "doc", "content": []}},
    )
    assert resp.status_code == 403


def test_get_chat_with_messages(client, character, auth_headers, account, db_session):
    """Get a chat and see its messages."""
    h = char_headers(auth_headers, character)
    other = create_character(db_session, account.id, "Other", "Elf", "Ranger", "Divers")

    chat = client.post(
        "/pm/chats/direct",
        headers=h,
        json={"character_id": str(other.id)},
    ).json()

    body = {
        "type": "doc",
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hi"}]}],
    }
    client.post(f"/pm/chats/{chat['id']}/messages", headers=h, json={"body": body})

    resp = client.get(f"/pm/chats/{chat['id']}", headers=h)
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["id"] == chat["id"]
    assert len(detail["messages"]) == 1
    assert detail["messages"][0]["body"] == body


def test_system_message_send_and_respond(client, auth_headers):
    """Send a system message and respond to it."""
    # System messages are sent via CRUD (not exposed as a test endpoint),
    # but we can test the respond endpoint here (requires accessing as the recipient).
    # For now, this is a placeholder test — full testing would require
    # direct DB access or an admin endpoint to create system messages.
    pass


def test_list_system_messages(client, auth_headers):
    """List system messages for an account."""
    resp = client.get("/pm/system-messages", headers=auth_headers)
    assert resp.status_code == 200
    messages = resp.json()
    assert isinstance(messages, list)
