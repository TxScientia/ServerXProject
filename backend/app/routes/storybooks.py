import re
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_character, get_current_user
from ..crud import (
    can_edit_space,
    create_place,
    create_post,
    create_rank,
    create_scene_with_post,
    create_storybook,
    delete_place,
    delete_rank,
    get_active_scene,
    get_place,
    get_post,
    get_rank,
    get_scene,
    get_storybook,
    is_member,
    list_places,
    list_ranks,
    list_scenes_in_place,
    list_storybooks,
    reorder_places,
    scene_participant_ids,
    scene_status,
    update_place,
    update_post,
    update_rank,
    update_storybook,
)
from ..database import get_db
from ..models import Account, Character
from ..schemas import (
    PlaceCreate,
    PlaceRead,
    PlaceReorder,
    PlaceUpdate,
    PostCreate,
    PostRead,
    PostUpdate,
    RankCreate,
    RankRead,
    RankUpdate,
    SceneCreate,
    SceneRead,
    SceneWithPosts,
    StorybookCreate,
    StorybookRead,
    StorybookUpdate,
    StorybookWithPlaces,
)

router = APIRouter(prefix="/storybooks", tags=["storybooks"])

MAX_TAGS = 6

# --- Rich-text body whitelist (must mirror the frontend editor's schema) ----
# Posts store Tiptap JSON. We accept ONLY these nodes/marks — everything else
# (headings, lists, links, and therefore any HTML/script) is rejected, so nothing
# dangerous can ever be stored. Colours must be #rrggbb hex.
ALLOWED_NODE_TYPES = {"doc", "paragraph", "text", "hardBreak"}
ALLOWED_MARK_TYPES = {"bold", "italic", "underline", "strike", "textStyle"}
MAX_POST_CHARS = 100_000
_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


def _validate_body(body) -> None:
    """Reject any post body that isn't a whitelisted, non-empty, sane-length doc."""
    if not isinstance(body, dict) or body.get("type") != "doc":
        raise HTTPException(status_code=422, detail="Ungültiger Beitragsinhalt")

    total_chars = 0

    def walk(node):
        nonlocal total_chars
        if not isinstance(node, dict) or node.get("type") not in ALLOWED_NODE_TYPES:
            raise HTTPException(status_code=422, detail="Nicht erlaubter Inhaltstyp")
        for mark in node.get("marks") or []:
            mtype = mark.get("type") if isinstance(mark, dict) else None
            if mtype not in ALLOWED_MARK_TYPES:
                raise HTTPException(status_code=422, detail="Nicht erlaubte Formatierung")
            if mtype == "textStyle":
                color = (mark.get("attrs") or {}).get("color")
                if color is not None and not _HEX_COLOR.match(str(color)):
                    raise HTTPException(status_code=422, detail="Ungültige Farbe")
        text = node.get("text")
        if isinstance(text, str):
            total_chars += len(text)
        for child in node.get("content") or []:
            walk(child)

    walk(body)
    if total_chars == 0:
        raise HTTPException(status_code=422, detail="Beitrag darf nicht leer sein")
    if total_chars > MAX_POST_CHARS:
        raise HTTPException(status_code=422, detail="Beitrag ist zu lang")


def _serialize_scene(scene, timeout_days: int, *, include_posts: bool = False):
    """Build a SceneRead/SceneWithPosts with derived status/participants/count."""
    fields = dict(
        id=scene.id,
        place_id=scene.place_id,
        title=scene.title,
        status=scene_status(scene, timeout_days),
        last_post_at=scene.last_post_at,
        finished_at=scene.finished_at,
        created_at=scene.created_at,
        participant_ids=scene_participant_ids(scene),
        post_count=len(scene.posts),
    )
    if include_posts:
        return SceneWithPosts(**fields, posts=[PostRead.model_validate(p) for p in scene.posts])
    return SceneRead(**fields)


def _get_editable_space(db: Session, storybook_id, character: Character):
    """Fetch the StoryBook and require the acting character to be creator/editor."""
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    if not can_edit_space(db, space.id, character.id):
        raise HTTPException(
            status_code=403, detail="Keine Berechtigung, dieses StoryBook zu bearbeiten"
        )
    return space


def _require_storybook(db: Session, storybook_id):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    return space


def _get_place_in_space(db: Session, space_id, place_id):
    place = get_place(db, place_id)
    if place is None or place.space_id != space_id:
        raise HTTPException(status_code=404, detail="Ort nicht gefunden")
    return place


def _get_scene_in_space(db: Session, space, scene_id):
    scene = get_scene(db, scene_id)
    if scene is not None:
        place = get_place(db, scene.place_id)
        if place is not None and place.space_id == space.id:
            return scene
    raise HTTPException(status_code=404, detail="Szene nicht gefunden")


def _get_rank_in_space(db: Session, space_id, rank_id):
    rank = get_rank(db, rank_id)
    if rank is None or rank.space_id != space_id:
        raise HTTPException(status_code=404, detail="Rang nicht gefunden")
    return rank


# --- StoryBook CRUD -------------------------------------------------------

@router.post("", response_model=StorybookRead)
def create_storybook_endpoint(
    data: StorybookCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    return create_storybook(db, character, data.title, data.description)


@router.get("", response_model=List[StorybookRead])
def list_storybooks_endpoint(
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return list_storybooks(db)


@router.get("/{storybook_id}", response_model=StorybookWithPlaces)
def get_storybook_endpoint(
    storybook_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    return space


@router.patch("/{storybook_id}", response_model=StorybookRead)
def update_storybook_endpoint(
    storybook_id: uuid.UUID,
    data: StorybookUpdate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    if data.tags is not None and len(data.tags) > MAX_TAGS:
        raise HTTPException(status_code=400, detail=f"Maximal {MAX_TAGS} Tags erlaubt")
    return update_storybook(
        db,
        space,
        title=data.title,
        description=data.description,
        image_url=data.image_url,
        biography=data.biography,
        visibility=data.visibility,
        tags=data.tags,
    )


# --- Ranks ----------------------------------------------------------------

@router.get("/{storybook_id}/ranks", response_model=List[RankRead])
def list_ranks_endpoint(
    storybook_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    return list_ranks(db, space.id)


@router.post("/{storybook_id}/ranks", response_model=RankRead)
def create_rank_endpoint(
    storybook_id: uuid.UUID,
    data: RankCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    return create_rank(db, space.id, data.name, data.weight)


@router.patch("/{storybook_id}/ranks/{rank_id}", response_model=RankRead)
def update_rank_endpoint(
    storybook_id: uuid.UUID,
    rank_id: uuid.UUID,
    data: RankUpdate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    rank = _get_rank_in_space(db, space.id, rank_id)
    fields = data.model_dump(exclude_unset=True)
    return update_rank(db, rank, **fields)


@router.delete("/{storybook_id}/ranks/{rank_id}")
def delete_rank_endpoint(
    storybook_id: uuid.UUID,
    rank_id: uuid.UUID,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    rank = _get_rank_in_space(db, space.id, rank_id)
    delete_rank(db, rank)
    return {"ok": True}


# --- Places ---------------------------------------------------------------

@router.get("/{storybook_id}/places", response_model=List[PlaceRead])
def list_places_endpoint(
    storybook_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = get_storybook(db, storybook_id)
    if space is None:
        raise HTTPException(status_code=404, detail="StoryBook nicht gefunden")
    return list_places(db, space.id)


@router.post("/{storybook_id}/places", response_model=PlaceRead)
def create_place_endpoint(
    storybook_id: uuid.UUID,
    data: PlaceCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    return create_place(
        db,
        space.id,
        data.title,
        data.description,
        data.parent_place_id,
        data.image_url,
        data.sort_order,
    )


@router.post("/{storybook_id}/places/reorder")
def reorder_places_endpoint(
    storybook_id: uuid.UUID,
    data: PlaceReorder,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    reorder_places(db, space.id, data.ordered_ids)
    return {"ok": True}


@router.patch("/{storybook_id}/places/{place_id}", response_model=PlaceRead)
def update_place_endpoint(
    storybook_id: uuid.UUID,
    place_id: uuid.UUID,
    data: PlaceUpdate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    place = _get_place_in_space(db, space.id, place_id)
    fields = data.model_dump(exclude_unset=True)
    return update_place(db, place, **fields)


@router.delete("/{storybook_id}/places/{place_id}")
def delete_place_endpoint(
    storybook_id: uuid.UUID,
    place_id: uuid.UUID,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _get_editable_space(db, storybook_id, character)
    place = _get_place_in_space(db, space.id, place_id)
    delete_place(db, place)
    return {"ok": True}


# --- Scenes & Posts (the play-by-post loop) -------------------------------
# Reading is open to any logged-in user; posting/creating requires the acting
# character to be a member of the space (gameplay, not admin). Occupancy freeing,
# finish/reopen, ping and post deletion belong to the separate scene-lifecycle
# branch; here we only create/read/post and let authors edit their own posts.

@router.get(
    "/{storybook_id}/places/{place_id}/scenes",
    response_model=List[SceneRead],
)
def list_scenes_endpoint(
    storybook_id: uuid.UUID,
    place_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    place = _get_place_in_space(db, space.id, place_id)
    scenes = list_scenes_in_place(db, place.id)  # already last_post_at desc
    # Active scene first, history after; stable sort preserves the desc ordering.
    scenes.sort(key=lambda s: scene_status(s, space.scene_timeout_days) != "active")
    return [_serialize_scene(s, space.scene_timeout_days) for s in scenes]


@router.post(
    "/{storybook_id}/places/{place_id}/scenes",
    response_model=SceneWithPosts,
)
def create_scene_endpoint(
    storybook_id: uuid.UUID,
    place_id: uuid.UUID,
    data: SceneCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    place = _get_place_in_space(db, space.id, place_id)
    if not is_member(db, space.id, character.id):
        raise HTTPException(status_code=403, detail="Nur Mitglieder können Szenen starten")
    if not data.title.strip():
        raise HTTPException(status_code=422, detail="Titel darf nicht leer sein")
    _validate_body(data.body)
    if get_active_scene(db, place.id, space.scene_timeout_days) is not None:
        raise HTTPException(
            status_code=409, detail="An diesem Ort läuft bereits eine aktive Szene"
        )
    scene = create_scene_with_post(db, place.id, data.title.strip(), character.id, data.body)
    return _serialize_scene(scene, space.scene_timeout_days, include_posts=True)


@router.get(
    "/{storybook_id}/scenes/{scene_id}",
    response_model=SceneWithPosts,
)
def get_scene_endpoint(
    storybook_id: uuid.UUID,
    scene_id: uuid.UUID,
    current_user: Account = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    scene = _get_scene_in_space(db, space, scene_id)
    return _serialize_scene(scene, space.scene_timeout_days, include_posts=True)


@router.post(
    "/{storybook_id}/scenes/{scene_id}/posts",
    response_model=PostRead,
)
def create_post_endpoint(
    storybook_id: uuid.UUID,
    scene_id: uuid.UUID,
    data: PostCreate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    scene = _get_scene_in_space(db, space, scene_id)
    if not is_member(db, space.id, character.id):
        raise HTTPException(status_code=403, detail="Nur Mitglieder können posten")
    if scene.finished_at is not None:
        raise HTTPException(status_code=409, detail="Szene ist abgeschlossen")
    _validate_body(data.body)
    post = create_post(db, scene, character.id, data.body)
    return PostRead.model_validate(post)


@router.patch(
    "/{storybook_id}/scenes/{scene_id}/posts/{post_id}",
    response_model=PostRead,
)
def update_post_endpoint(
    storybook_id: uuid.UUID,
    scene_id: uuid.UUID,
    post_id: uuid.UUID,
    data: PostUpdate,
    character: Character = Depends(get_current_character),
    db: Session = Depends(get_db),
):
    space = _require_storybook(db, storybook_id)
    scene = _get_scene_in_space(db, space, scene_id)
    post = get_post(db, post_id)
    if post is None or post.scene_id != scene.id:
        raise HTTPException(status_code=404, detail="Beitrag nicht gefunden")
    if post.author_character_id != character.id:
        raise HTTPException(status_code=403, detail="Nur eigene Beiträge bearbeitbar")
    if scene.finished_at is not None:
        raise HTTPException(status_code=409, detail="Szene ist abgeschlossen")
    _validate_body(data.body)
    # Editing the first post may also rename the scene (its title is the RP name).
    if data.title is not None and scene.posts and scene.posts[0].id == post.id:
        if not data.title.strip():
            raise HTTPException(status_code=422, detail="Titel darf nicht leer sein")
        scene.title = data.title.strip()
    return PostRead.model_validate(update_post(db, post, data.body))
