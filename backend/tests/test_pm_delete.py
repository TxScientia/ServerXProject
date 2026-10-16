"""Deleting / leaving chats: empty-chat cleanup + remove-for-me with history."""
import datetime
import uuid

import jwt

from backend.app.crud import create_account, create_character
from backend.app.security import SECRET_KEY


def _token(account):
    return jwt.encode(
        {
            "user_id": str(account.id),
            "login_name": account.login_name,
            "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1),
        },
        SECRET_KEY,
        algorithm="HS256",
    )


def _actor(db_session, email, login):
    acc = create_account(db_session, email, login, "pw")
    char = create_character(db_session, acc.id, login.title(), "Elf", "Ranger", "Divers")
    headers = {"Authorization": f"Bearer {_token(acc)}", "X-Character-Id": str(char.id)}
    return acc, char, headers


def doc(text="hi"):
    return {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}]}


def _direct_chat(client, a_headers, b_char_id):
    return client.post("/pm/chats/direct", headers=a_headers, json={"character_id": str(b_char_id)}).json()


def test_delete_empty_chat_removes_it_for_everyone(client, db_session):
    _, _a, a_h = _actor(db_session, "a@d.c", "aaa")
    _, b_char, b_h = _actor(db_session, "b@d.c", "bbb")
    chat = _direct_chat(client, a_h, b_char.id)
    # Empty chat → A leaves → hard-deleted for both.
    assert client.delete(f"/pm/chats/{chat['id']}", headers=a_h).status_code == 200
    assert client.get(f"/pm/chats/{chat['id']}", headers=b_h).status_code == 404


def test_delete_chat_with_history_removes_only_for_me(client, db_session):
    _, _a, a_h = _actor(db_session, "c@d.c", "ccc")
    _, b_char, b_h = _actor(db_session, "d@d.c", "ddd")
    chat = _direct_chat(client, a_h, b_char.id)
    client.post(f"/pm/chats/{chat['id']}/messages", headers=a_h, json={"body": doc()})
    # A deletes → gone for A (no longer a member), but B keeps it with history.
    assert client.delete(f"/pm/chats/{chat['id']}", headers=a_h).status_code == 200
    assert client.get(f"/pm/chats/{chat['id']}", headers=a_h).status_code == 403
    b_detail = client.get(f"/pm/chats/{chat['id']}", headers=b_h)
    assert b_detail.status_code == 200
    assert len(b_detail.json()["messages"]) == 1


def test_delete_purges_when_last_member_leaves(client, db_session):
    _, _a, a_h = _actor(db_session, "e@d.c", "eee")
    _, b_char, b_h = _actor(db_session, "f@d.c", "fff")
    chat = _direct_chat(client, a_h, b_char.id)
    client.post(f"/pm/chats/{chat['id']}/messages", headers=a_h, json={"body": doc()})
    client.delete(f"/pm/chats/{chat['id']}", headers=a_h)
    client.delete(f"/pm/chats/{chat['id']}", headers=b_h)
    assert client.get(f"/pm/chats/{chat['id']}", headers=a_h).status_code == 404
    assert client.get(f"/pm/chats/{chat['id']}", headers=b_h).status_code == 404


def test_delete_chat_forbidden_for_non_member(client, db_session):
    _, _a, a_h = _actor(db_session, "g@d.c", "ggg")
    _, b_char, _b_h = _actor(db_session, "h@d.c", "hhh")
    _, _c, c_h = _actor(db_session, "i@d.c", "iii")
    chat = _direct_chat(client, a_h, b_char.id)
    assert client.delete(f"/pm/chats/{chat['id']}", headers=c_h).status_code == 403


def test_delete_nonexistent_chat_404(client, db_session):
    _, _a, a_h = _actor(db_session, "j@d.c", "jjj")
    assert client.delete(f"/pm/chats/{uuid.uuid4()}", headers=a_h).status_code == 404
