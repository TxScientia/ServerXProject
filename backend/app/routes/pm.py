import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..auth import get_current_character, get_current_user
from ..crud import (
    create_direct_chat,
    create_group_chat,
    get_chat,
    get_message,
    get_system_message,
    get_unread_count_for_account,
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
    return MessageRead(
        id=message.id,
        chat_id=message.chat_id,
        from_character_id=message.from_character_id,
        from_character_name=character.name,
        body=message.body,
        created_at=message.created_at,
    )


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
    return {"ok": True}


# WebSocket connection manager (simple in-memory registry per account)
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[uuid.UUID, list[WebSocket]] = {}

    async def connect(self, account_id: uuid.UUID, websocket: WebSocket):
        await websocket.accept()
        if account_id not in self.active_connections:
            self.active_connections[account_id] = []
        self.active_connections[account_id].append(websocket)

    def disconnect(self, account_id: uuid.UUID, websocket: WebSocket):
        if account_id in self.active_connections:
            self.active_connections[account_id].remove(websocket)
            if not self.active_connections[account_id]:
                del self.active_connections[account_id]

    async def broadcast_to_account(self, account_id: uuid.UUID, data: dict):
        if account_id in self.active_connections:
            for connection in self.active_connections[account_id]:
                try:
                    await connection.send_json(data)
                except Exception:
                    pass  # connection closed


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    account_id: str = None,
    db: Session = Depends(get_db),
):
    """WebSocket connection for real-time message delivery."""
    if not account_id:
        await websocket.close(code=400, reason="account_id required")
        return
    try:
        account_uuid = uuid.UUID(account_id)
    except ValueError:
        await websocket.close(code=400, reason="invalid account_id")
        return

    await manager.connect(account_uuid, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Echo back or process (for now, just keep connection alive)
            await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(account_uuid, websocket)
