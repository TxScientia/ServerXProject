import asyncio
import os
import uuid
from typing import List

import jwt
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..auth import get_current_character, get_current_user
from ..crud import (
    count_unread_system_messages,
    create_direct_chat,
    create_group_chat,
    get_chat,
    get_member_account_ids,
    get_message,
    get_system_message,
    get_unread_count_for_account,
    handle_invite_response,
    list_chats_for_character,
    list_chats_for_account,
    list_messages,
    list_system_messages,
    mark_messages_as_read,
    respond_to_system_message,
    send_message,
    send_system_message,
)
from ..database import get_db
from ..models import Account, Character
from ..realtime import manager as realtime_manager
from ..security import SECRET_KEY
from ..schemas import (
    ChatRead,
    ChatWithMessages,
    CreateDirectChatRequest,
    CreateGroupChatRequest,
    MessageCreate,
    MessageRead,
    SystemMessageRead,
    SystemMessageResponse,
)

router = APIRouter(prefix="/pm", tags=["pm"])


@router.post("/chats/direct", response_model=ChatRead)
def create_direct_chat_endpoint(
    data: CreateDirectChatRequest,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Create a direct chat between the acting character and another."""
    if data.character_id == character.id:
        raise HTTPException(status_code=400, detail="Kann keine Nachricht an sich selbst senden")
    chat = create_direct_chat(db, character.id, data.character_id)
    return ChatRead(
        id=chat.id,
        type=chat.type,
        name=chat.name,
        created_at=chat.created_at,
        member_count=len(chat.members),
        member_names=[m.character.name for m in chat.members] if chat.members else [],
        unread_count=0,
    )


@router.post("/chats/group", response_model=ChatRead)
def create_group_chat_endpoint(
    data: CreateGroupChatRequest,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Create a group chat. The acting character is added as a member."""
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Gruppennamen erforderlich")
    char_ids = list(set([character.id] + list(data.character_ids)))
    if len(char_ids) < 2:
        raise HTTPException(status_code=400, detail="Mindestens 2 Mitglieder erforderlich")
    chat = create_group_chat(db, data.name.strip(), char_ids)
    return ChatRead(
        id=chat.id,
        type=chat.type,
        name=chat.name,
        created_at=chat.created_at,
        member_count=len(chat.members),
        member_names=[m.character.name for m in chat.members] if chat.members else [],
        unread_count=0,
    )


@router.get("/chats", response_model=List[ChatRead])
def list_chats_endpoint(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all chats for all characters in this account."""
    chats = list_chats_for_account(db, current_user.id)
    unread_counts = get_unread_count_for_account(db, current_user.id)
    return [
        ChatRead(
            id=c.id,
            type=c.type,
            name=c.name,
            created_at=c.created_at,
            member_count=len(c.members),
            member_names=[m.character.name for m in c.members] if c.members else [],
            unread_count=unread_counts.get(c.id, 0),
        )
        for c in chats
    ]


@router.get("/chats/{chat_id}", response_model=ChatWithMessages)
def get_chat_endpoint(
    chat_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a chat and its recent messages. Any of the account's characters must be a member."""
    from ..models import Character

    chat = get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat nicht gefunden")

    # Check if ANY of the account's characters are members
    user_character_ids = [c.id for c in db.query(Character).filter(Character.account_id == current_user.id).all()]
    chat_member_ids = [m.character_id for m in chat.members]

    if not any(cid in chat_member_ids for cid in user_character_ids):
        raise HTTPException(status_code=403, detail="Keine Berechtigung")

    # Mark messages as read for all account's characters
    for char_id in user_character_ids:
        if char_id in chat_member_ids:
            mark_messages_as_read(db, chat_id, char_id)

    messages = list_messages(db, chat_id, limit=50)
    return ChatWithMessages(
        id=chat.id,
        type=chat.type,
        name=chat.name,
        created_at=chat.created_at,
        member_count=len(chat.members),
        member_names=[m.character.name for m in chat.members] if chat.members else [],
        unread_count=0,  # Messages are marked as read above
        messages=[
            MessageRead(
                id=m.id,
                chat_id=m.chat_id,
                from_character_id=m.from_character_id,
                from_character_name=m.from_character.name if m.from_character else None,
                body=m.body,
                created_at=m.created_at,
            )
            for m in messages
        ],
    )


@router.post("/chats/{chat_id}/messages", response_model=MessageRead)
def send_message_endpoint(
    chat_id: uuid.UUID,
    data: MessageCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    """Send a message in a chat. Acting character must be a member."""
    chat = get_chat(db, chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat nicht gefunden")
    member_ids = [m.character_id for m in chat.members]
    if character.id not in member_ids:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    # TODO: validate body (Tiptap JSON whitelist, non-empty)
    message = send_message(db, chat_id, character.id, data.body)
    result = MessageRead(
        id=message.id,
        chat_id=message.chat_id,
        from_character_id=message.from_character_id,
        from_character_name=character.name,
        body=message.body,
        created_at=message.created_at,
    )
    # Live delivery: push to every account in the chat (per-account inbox). The sender's
    # own browser reconciles against its optimistic append.
    payload = {"type": "new_message", "chat_id": str(chat_id), "message": result.model_dump(mode="json")}
    for account_id in get_member_account_ids(db, chat_id):
        manager.broadcast_threadsafe(account_id, payload)
    return result


@router.get("/system-messages/unread-count")
def system_messages_unread_count(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Number of action-required system messages awaiting a response (for the badge)."""
    return {"count": count_unread_system_messages(db, current_user.id)}


@router.get("/system-messages", response_model=List[SystemMessageRead])
def list_system_messages_endpoint(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all system messages for the account."""
    messages = list_system_messages(db, current_user.id)
    return [
        SystemMessageRead(
            id=m.id,
            from_account_id=m.from_account_id,
            to_account_id=m.to_account_id,
            type=m.type,
            content=m.content,
            action_required=m.action_required == "true",
            data=m.data,
            response=m.response,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post("/system-messages/{message_id}/respond")
def respond_to_system_message_endpoint(
    message_id: uuid.UUID,
    data: SystemMessageResponse,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Respond to a system message (accept/decline/free/keep_occupied)."""
    message = get_system_message(db, message_id)
    if not message:
        raise HTTPException(status_code=404, detail="System-Nachricht nicht gefunden")
    if message.to_account_id != current_user.id:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    if not message.action_required or message.action_required == "false":
        raise HTTPException(status_code=400, detail="Keine Antwort erforderlich")
    respond_to_system_message(db, message_id, data.action)
    # Perform the domain side-effect for invite/plot_link messages (create membership,
    # accept link, or delete the declined record).
    if message.type in ("invite", "plot_link"):
        handle_invite_response(db, message, data.action)
    return {"ok": True}


# The per-account socket registry lives in app.realtime so any layer can push to it.
manager = realtime_manager

# WebSocket close codes (RFC 6455 application range 4000–4999).
WS_UNAUTHORIZED = 4401
WS_FORBIDDEN_ORIGIN = 4403


def _allowed_ws_origins() -> set[str]:
    """Origin allowlist for the WS handshake (CSWSH protection).

    Configured via ALLOWED_WS_ORIGINS (comma-separated). Defaults to the local dev
    frontend so it works out of the box; production must set the env var.
    """
    raw = os.getenv("ALLOWED_WS_ORIGINS")
    if raw:
        return {o.strip() for o in raw.split(",") if o.strip()}
    return {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }


def _account_from_token(token: str, db: Session):
    """Resolve the Account behind a JWT, mirroring auth.get_current_user. None if invalid."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload["user_id"]
    except Exception:  # noqa: BLE001
        return None
    return db.query(Account).filter(Account.id == user_id).first()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = "",
    db: Session = Depends(get_db),
):
    """Authenticated WebSocket for real-time message delivery.

    The account is derived from the JWT (passed as a query param, since browsers can't
    set headers on WebSocket) — never from a client-supplied account id. The Origin
    header is checked to block cross-site WebSocket hijacking. Use over wss:// in prod.
    """
    # Origin check must happen before accept().
    origin = websocket.headers.get("origin")
    if origin is not None and origin not in _allowed_ws_origins():
        await websocket.close(code=WS_FORBIDDEN_ORIGIN)
        return

    account = _account_from_token(token, db)
    # We only need the DB for auth; release the connection so idle sockets don't pin one.
    db.close()
    if account is None:
        await websocket.close(code=WS_UNAUTHORIZED)
        return

    account_id = account.id
    await manager.connect(account_id, websocket)
    try:
        while True:
            # We don't trust client input for delivery; just keep the socket alive and
            # answer heartbeats.
            await websocket.receive_json()
            await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(account_id, websocket)
    except Exception:  # noqa: BLE001 — any receive error ends the connection cleanly
        manager.disconnect(account_id, websocket)
