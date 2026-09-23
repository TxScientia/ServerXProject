import uuid
from typing import List, Optional

from sqlalchemy import and_, or_, func, case
from sqlalchemy.orm import Session

from ..models import Chat, ChatMember, Message, MessageRead, SystemMessage, Character


def create_direct_chat(db: Session, character_id_1: uuid.UUID, character_id_2: uuid.UUID) -> Chat:
    """Create a direct chat between two characters, or return if it already exists."""
    # Check if a direct chat between these two already exists (order-independent).
    existing = (
        db.query(Chat)
        .filter(Chat.type == "direct")
        .join(ChatMember)
        .filter(ChatMember.character_id.in_([character_id_1, character_id_2]))
        .group_by(Chat.id)
        .having(
            and_(
                func.count(ChatMember.id) == 2,
                func.sum(
                    case(
                        (ChatMember.character_id == character_id_1, 1),
                        else_=0,
                    )
                ) == 1,
            )
        )
        .first()
    )
    if existing:
        return existing

    chat = Chat(type="direct")
    db.add(chat)
    db.flush()
    db.add(ChatMember(chat_id=chat.id, character_id=character_id_1, role="member"))
    db.add(ChatMember(chat_id=chat.id, character_id=character_id_2, role="member"))
    db.commit()
    db.refresh(chat)
    return chat


def create_group_chat(db: Session, name: str, character_ids: List[uuid.UUID]) -> Chat:
    """Create a group chat with the given name and members."""
    chat = Chat(type="group", name=name)
    db.add(chat)
    db.flush()
    for char_id in character_ids:
        db.add(ChatMember(chat_id=chat.id, character_id=char_id, role="member"))
    db.commit()
    db.refresh(chat)
    return chat


def get_chat(db: Session, chat_id: uuid.UUID) -> Optional[Chat]:
    return db.query(Chat).filter(Chat.id == chat_id).first()


def list_chats_for_character(db: Session, character_id: uuid.UUID) -> List[Chat]:
    """All chats (direct + group) this character is a member of, sorted by latest message."""
    return (
        db.query(Chat)
        .join(ChatMember)
        .filter(ChatMember.character_id == character_id)
        .order_by(Chat.created_at.desc())
        .all()
    )


def list_chats_for_account(db: Session, account_id: uuid.UUID) -> List[Chat]:
    """All chats for any character in this account, sorted by latest message."""
    from ..models import Character

    # Get all character IDs for this account
    character_ids = [c.id for c in db.query(Character.id).filter(Character.account_id == account_id).all()]

    if not character_ids:
        return []

    # Get all chats where any of these characters is a member
    return (
        db.query(Chat)
        .distinct()
        .join(ChatMember)
        .filter(ChatMember.character_id.in_(character_ids))
        .order_by(Chat.created_at.desc())
        .all()
    )


def send_message(
    db: Session, chat_id: uuid.UUID, from_character_id: uuid.UUID, body: dict
) -> Message:
    """Send a message in a chat (body is Tiptap JSON)."""
    message = Message(chat_id=chat_id, from_character_id=from_character_id, body=body)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_message(db: Session, message_id: uuid.UUID) -> Optional[Message]:
    return db.query(Message).filter(Message.id == message_id).first()


def list_messages(db: Session, chat_id: uuid.UUID, limit: int = 50) -> List[Message]:
    """Most recent messages in a chat (oldest first for display order)."""
    return (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()[::-1]  # reverse to oldest-first
    )


def send_system_message(
    db: Session,
    from_account_id: uuid.UUID,
    to_account_id: uuid.UUID,
    type_: str,
    content: str,
    data: Optional[dict] = None,
    action_required: bool = False,
) -> SystemMessage:
    """Send a system message (still_playing, invite, plot_link, system_news)."""
    msg = SystemMessage(
        from_account_id=from_account_id,
        to_account_id=to_account_id,
        type=type_,
        content=content,
        data=data,
        action_required="true" if action_required else "false",  # string for SQLite compat
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def get_system_message(db: Session, message_id: uuid.UUID) -> Optional[SystemMessage]:
    return db.query(SystemMessage).filter(SystemMessage.id == message_id).first()


def list_system_messages(
    db: Session, account_id: uuid.UUID, unread_only: bool = False
) -> List[SystemMessage]:
    """All system messages for an account (sent or received)."""
    query = db.query(SystemMessage).filter(
        or_(
            SystemMessage.from_account_id == account_id,
            SystemMessage.to_account_id == account_id,
        )
    )
    if unread_only:
        # Unread = action_required and no response yet
        query = query.filter(
            and_(
                SystemMessage.action_required == "true",
                SystemMessage.response.is_(None),
            )
        )
    return query.order_by(SystemMessage.created_at.desc()).all()


def respond_to_system_message(
    db: Session, message_id: uuid.UUID, action: str
) -> SystemMessage:
    """Record a response to a system message (accept/decline/free/keep_occupied)."""
    msg = get_system_message(db, message_id)
    if msg:
        import datetime
        msg.response = {"action": action, "responded_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
        db.commit()
        db.refresh(msg)
    return msg


def mark_messages_as_read(db: Session, chat_id: uuid.UUID, character_id: uuid.UUID) -> None:
    """Mark all messages in a chat as read for the given character."""
    # Get all messages in the chat that this character hasn't read yet
    messages = (
        db.query(Message)
        .filter(Message.chat_id == chat_id)
        .filter(~Message.reads.any(MessageRead.character_id == character_id))
        .all()
    )
    for msg in messages:
        read = MessageRead(message_id=msg.id, character_id=character_id)
        db.add(read)
    db.commit()


def get_unread_count_for_chat(db: Session, chat_id: uuid.UUID, character_id: uuid.UUID) -> int:
    """Count unread messages in a chat for a character (messages not from them that they haven't read)."""
    return (
        db.query(Message)
        .filter(
            and_(
                Message.chat_id == chat_id,
                Message.from_character_id != character_id,
                ~Message.reads.any(MessageRead.character_id == character_id),
            )
        )
        .count()
    )


def get_unread_count_for_account(db: Session, account_id: uuid.UUID) -> dict:
    """Get total unread count per chat for all characters in an account.

    Returns dict with chat_id -> unread_count.
    Unread = not read by ANY character in the account.
    """
    # Get all character IDs for this account
    character_ids = [c.id for c in db.query(Character.id).filter(Character.account_id == account_id).all()]

    if not character_ids:
        return {}

    # For each chat, count messages not read by any character in the account
    chats = list_chats_for_account(db, account_id)
    result = {}
    for chat in chats:
        # Messages in chat that haven't been read by any of the account's characters
        unread = (
            db.query(Message)
            .filter(Message.chat_id == chat.id)
            .filter(Message.from_character_id.notin_(character_ids))  # not from account's chars
            .filter(~Message.reads.any(MessageRead.character_id.in_(character_ids)))  # not read by account's chars
            .count()
        )
        result[chat.id] = unread
    return result
