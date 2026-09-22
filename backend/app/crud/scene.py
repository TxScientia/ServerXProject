import datetime

from sqlalchemy.orm import Session

from ..models import Post, Scene


def _utcnow():
    return datetime.datetime.now(datetime.timezone.utc)


def create_scene_with_post(db: Session, place_id, title, author_character_id, body, *, now=None):
    """Create a scene and its first post atomically (one commit).

    The first post carries the scene title (the RP name). ``last_post_at`` and both
    ``created_at`` values are pinned to the same instant so occupancy is consistent.
    """
    now = now or _utcnow()
    scene = Scene(place_id=place_id, title=title, last_post_at=now, created_at=now)
    db.add(scene)
    db.flush()  # assign scene.id before the post references it
    db.add(
        Post(
            scene_id=scene.id,
            author_character_id=author_character_id,
            body=body,
            created_at=now,
        )
    )
    db.commit()
    db.refresh(scene)
    return scene


def create_post(db: Session, scene: Scene, author_character_id, body, *, now=None):
    """Add a post to a scene and bump ``last_post_at`` in the same commit."""
    now = now or _utcnow()
    post = Post(
        scene_id=scene.id,
        author_character_id=author_character_id,
        body=body,
        created_at=now,
    )
    db.add(post)
    scene.last_post_at = now
    db.commit()
    db.refresh(post)
    return post


def update_post(db: Session, post: Post, body, *, now=None):
    """Replace a post's body and stamp ``edited_at`` (author edits their own post)."""
    post.body = body
    post.edited_at = now or _utcnow()
    db.commit()
    db.refresh(post)
    return post


def get_scene(db: Session, scene_id):
    return db.query(Scene).filter(Scene.id == scene_id).first()


def get_post(db: Session, post_id):
    return db.query(Post).filter(Post.id == post_id).first()


def list_scenes_in_place(db: Session, place_id):
    """Scenes in a place, most-recently-active first. Caller derives status."""
    return (
        db.query(Scene)
        .filter(Scene.place_id == place_id)
        .order_by(Scene.last_post_at.desc())
        .all()
    )


# --- Derived state (pure helpers; reused by routes and tests) --------------

def scene_status(scene: Scene, timeout_days: int, *, now=None) -> str:
    """'finished' | 'inactive' | 'active' — never stored, always derived."""
    if scene.finished_at is not None:
        return "finished"
    now = now or _utcnow()
    last = scene.last_post_at
    if last is None:
        return "active"
    if last.tzinfo is None:  # SQLite returns naive datetimes; treat as UTC
        last = last.replace(tzinfo=datetime.timezone.utc)
    if now - last > datetime.timedelta(days=timeout_days):
        return "inactive"
    return "active"


def scene_participant_ids(scene: Scene):
    """Distinct post authors in first-seen order (no participant table)."""
    seen = []
    for post in scene.posts:  # relationship is ordered by created_at
        if post.author_character_id not in seen:
            seen.append(post.author_character_id)
    return seen


def get_active_scene(db: Session, place_id, timeout_days: int, *, now=None):
    """The single non-finished, non-timed-out scene in a place (≤1), or None.

    Used to gate 'start a new scene' — a place may only have one active scene.
    """
    for scene in list_scenes_in_place(db, place_id):
        if scene_status(scene, timeout_days, now=now) == "active":
            return scene
    return None
