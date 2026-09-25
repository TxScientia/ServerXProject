import datetime

from sqlalchemy.orm import Session

from ..models import NewsItem, NewsItemRead


def _utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


def create_global_news(db: Session, *, author_account_id, title: str, body, kind: str, pinned: bool):
    item = NewsItem(
        scope_type="global",
        space_id=None,
        title=title,
        body=body,
        kind=kind,
        pinned=pinned,
        author_account_id=author_account_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def create_space_news(
    db: Session,
    *,
    space_id,
    author_account_id,
    author_character_id,
    title: str,
    body,
    kind: str,
    pinned: bool,
):
    item = NewsItem(
        scope_type="space",
        space_id=space_id,
        title=title,
        body=body,
        kind=kind,
        pinned=pinned,
        author_account_id=author_account_id,
        author_character_id=author_character_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def list_global_news(db: Session):
    return (
        db.query(NewsItem)
        .filter(NewsItem.scope_type == "global")
        .order_by(NewsItem.pinned.desc(), NewsItem.created_at.desc())
        .all()
    )


def list_space_news(db: Session, space_id):
    return (
        db.query(NewsItem)
        .filter(NewsItem.scope_type == "space", NewsItem.space_id == space_id)
        .order_by(NewsItem.pinned.desc(), NewsItem.created_at.desc())
        .all()
    )


def _unread_query(db: Session, account_id, *, scope_type: str, space_id=None):
    query = db.query(NewsItem).filter(NewsItem.scope_type == scope_type)
    if space_id is not None:
        query = query.filter(NewsItem.space_id == space_id)
    return (
        query.outerjoin(
            NewsItemRead,
            (NewsItemRead.news_item_id == NewsItem.id) & (NewsItemRead.account_id == account_id),
        )
        .filter(NewsItemRead.news_item_id.is_(None))
    )


def count_unread_global_news(db: Session, account_id) -> int:
    return _unread_query(db, account_id, scope_type="global").count()


def count_unread_space_news(db: Session, account_id, space_id) -> int:
    return _unread_query(db, account_id, scope_type="space", space_id=space_id).count()


def mark_global_news_read(db: Session, account_id) -> int:
    """Mark all current global news items as read for this account."""
    return mark_space_or_global_news_read(db, account_id, scope_type="global")


def mark_space_news_read(db: Session, account_id, space_id) -> int:
    return mark_space_or_global_news_read(db, account_id, scope_type="space", space_id=space_id)


def mark_space_or_global_news_read(db: Session, account_id, *, scope_type: str, space_id=None) -> int:
    items = _unread_query(db, account_id, scope_type=scope_type, space_id=space_id).all()
    for item in items:
        db.add(NewsItemRead(news_item_id=item.id, account_id=account_id))
    db.commit()
    return len(items)
