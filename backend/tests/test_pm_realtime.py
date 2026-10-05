"""Tests for PM at-rest encryption and the real-time WebSocket delivery/auth."""
import uuid

import pytest
from sqlalchemy import text
from starlette.websockets import WebSocketDisconnect

from backend.app import crypto
from backend.app.crud import create_character, send_message, send_system_message
from backend.app.models import Chat, ChatMember


def char_headers(auth_headers, character):
    return {**auth_headers, "X-Character-Id": str(character.id)}


def _token(auth_headers):
    return auth_headers["Authorization"].split(" ")[1]


# --- Encryption at rest ---------------------------------------------------------

def test_crypto_json_round_trip():
    value = {"type": "doc", "content": [{"type": "text", "text": "geheim"}]}
    envelope = crypto.encrypt_json(value)
    assert crypto.is_encrypted_json(envelope)
    assert "geheim" not in str(envelope)
    assert crypto.decrypt_json(envelope) == value
    # Plaintext passes through unchanged (backward compatibility).
    assert crypto.decrypt_json(value) == value


def test_crypto_str_round_trip():
    token = crypto.encrypt_str("vertraulich")
    assert crypto.is_encrypted_str(token)
    assert "vertraulich" not in token
    assert crypto.decrypt_str(token) == "vertraulich"
    assert crypto.decrypt_str("plain") == "plain"


def test_message_body_encrypted_at_rest(db_session, account):
    """The message body must be ciphertext in the DB but plaintext through the ORM."""
    alice = create_character(db_session, account.id, "Alice", "Elf", "Ranger", "Divers")
    chat = Chat(id=uuid.uuid4(), type="direct")
    db_session.add(chat)
    db_session.flush()
    db_session.add(ChatMember(chat_id=chat.id, character_id=alice.id, role="member"))
    db_session.commit()

    body = {"type": "doc", "content": [{"type": "text", "text": "TOPSECRET"}]}
    msg = send_message(db_session, chat.id, alice.id, body)

    raw = db_session.execute(text("SELECT body FROM messages WHERE id = :id"), {"id": msg.id.hex}).fetchone()[0]
    assert "TOPSECRET" not in raw
    assert "__enc__" in raw

    db_session.expire_all()
    reread = db_session.query(type(msg)).filter_by(id=msg.id).first()
    assert reread.body == body


def test_system_message_content_encrypted_at_rest(db_session, account):
    other = create_character(db_session, account.id, "Other", "Elf", "Ranger", "Divers")  # noqa: F841
    msg = send_system_message(
        db_session,
        from_account_id=account.id,
        to_account_id=account.id,
        type_="system_news",
        content="Geheime Ankündigung",
    )
    raw = db_session.execute(
        text("SELECT content FROM system_messages WHERE id = :id"), {"id": msg.id.hex}
    ).fetchone()[0]
    assert "Geheime" not in raw
    assert raw.startswith("enc:v1:")

    db_session.expire_all()
    reread = db_session.query(type(msg)).filter_by(id=msg.id).first()
    assert reread.content == "Geheime Ankündigung"


# --- WebSocket authentication ---------------------------------------------------

def test_ws_rejects_missing_token(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/pm/ws"):
            pass


def test_ws_rejects_invalid_token(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/pm/ws?token=not-a-real-jwt"):
            pass


def test_ws_rejects_forbidden_origin(client, auth_headers):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(
            f"/pm/ws?token={_token(auth_headers)}",
            headers={"origin": "https://evil.example.com"},
        ):
            pass


def test_ws_accepts_valid_token(client, auth_headers):
    with client.websocket_connect(f"/pm/ws?token={_token(auth_headers)}") as ws:
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}


def test_ws_accepts_same_origin(client, auth_headers):
    """An Origin matching the server's own Host is allowed (SPA served from the API origin)."""
    with client.websocket_connect(
        f"/pm/ws?token={_token(auth_headers)}",
        headers={"origin": "http://testserver"},  # TestClient's Host is 'testserver'
    ) as ws:
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}


# --- WebSocket delivery ---------------------------------------------------------

def test_ws_receives_broadcast_on_new_message(client, character, auth_headers, account, db_session):
    """A message sent into a chat is pushed live to the member account's socket."""
    h = char_headers(auth_headers, character)
    other = create_character(db_session, account.id, "Other", "Elf", "Ranger", "Divers")
    chat = client.post(
        "/pm/chats/direct", headers=h, json={"character_id": str(other.id)}
    ).json()

    with client.websocket_connect(f"/pm/ws?token={_token(auth_headers)}") as ws:
        body = {"type": "doc", "content": [{"type": "text", "text": "Live!"}]}
        resp = client.post(
            f"/pm/chats/{chat['id']}/messages",
            headers=char_headers(auth_headers, other),
            json={"body": body},
        )
        assert resp.status_code == 200

        data = ws.receive_json()
        assert data["type"] == "new_message"
        assert data["chat_id"] == chat["id"]
        assert data["message"]["body"] == body  # delivered decrypted
