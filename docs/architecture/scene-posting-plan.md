# Implementation plan — `feature/scene-posting`

The core play-by-post loop: **create a scene in a place → read its posts → add a
post (turn)**. This is the first gameplay feature; everything before it was
scaffolding (spaces, places, membership, settings).

> **Decisions locked 2026-09-22** (from the root wireframes
> `RP-Posting-Wireframe1.png` / `2.png`; supersede any conflicting detail below):
> - **Editor = Tiptap** (`@tiptap/react`, headless), built FIRST on its own
>   branch `feature/rich-text-editor` as a shared `components/RichTextEditor/`
>   (reused later by world biography + place descriptions). `feature/scene-posting`
>   builds on top of it.
> - **No HTML stored or accepted.** Register only the marks bold / italic /
>   underline / strike / color. Store Tiptap's **JSON** doc (not HTML); backend
>   validates the JSON against the allowed schema and rejects anything off-list;
>   render read-only through Tiptap. (Overrides the "body = HTML rich text" note
>   in data-model.md — body is structured JSON rendered through a whitelist.)
> - **One reusable `components/Post/`**: identity (avatar + character name +
>   timestamp) on TOP, body below. A `title?` prop shows the title region for the
>   first post only (the RP's name); hidden for replies. The **Titel** field lives
>   inside the editor, shown only for the first post.
> - **Sticky (collapsible) place header** keeps image/title/description visible —
>   NOT a fixed-height inner-scroll box. **No count-based pagination**: load the
>   full scene now, but keep the API cursor-ready (`created_at`) for a future
>   "load older posts".
> - **Deferred to `scene-lifecycle`** (not this work): besetzt/occupancy toggle,
>   "character left" markers, finished/archive box, ping, and post edit/delete.

Design source of truth: [data-model.md](./data-model.md) (`scenes` / `posts`
sections). This file is the *build* plan — the slice order, endpoints, and UI —
mirroring how `storybook-core` and `plot-settings` were structured.

**Scope boundary (important):** this branch is *create-scene / read-scene /
add-post only*. Occupancy freeing, finish/reopen, and ping belong to the separate
`scene-lifecycle` branch. We store `finished_at` and `last_post_at` now (the
schema is complete), but we only *derive* status for read display — no
finish/reopen endpoints yet.

---

## Domain recap (from data-model.md)

- **Scene** — one RP thread inside a Place. `id`, `place_id`, `title` (from the
  required first-post title), `last_post_at` (**source of truth for occupancy**),
  `finished_at` (nullable), `created_at`.
- **Post** — one turn. `id`, `scene_id`, `author_character_id`, `body` (HTML rich
  text), `created_at`.
- **Status is DERIVED, never stored:** `finished_at` set → *finished*; else
  `now - last_post_at > space.scene_timeout_days` (default 90) → *inactive*; else
  → *active*.
- **Participants are DERIVED** from the distinct `author_character_id` of the
  scene's posts — no participant table.
- **Title lives on the scene**, not per-post. Only the first post carries the
  title (it *is* the scene title).
- A Place has **at most one active scene** + a history of finished/inactive ones.
- Creating a post **bumps `last_post_at`**.

---

## Backend slice (mirror the existing layer packages)

Order: **model → crud → schemas → route → wire into `__init__` + `main` → tests.**
Follow the `place` files as the template — same style, same GUID PKs, same
`server_default` conventions.

### 1. Models — `backend/app/models/scene.py`, `.../post.py`
- `Scene`: columns above. Relationships: `place = relationship("Place",
  back_populates="scenes")`, `posts = relationship("Post",
  back_populates="scene", cascade="all, delete-orphan", order_by="Post.created_at")`.
- `Post`: columns above. Relationships: `scene`, `author =
  relationship("Character")`.
- Add `scenes = relationship("Scene", back_populates="place",
  cascade="all, delete-orphan")` to `Place` (models/place.py).
- Register both in `models/__init__.py`.

### 2. CRUD — `backend/app/crud/scene.py`, `.../post.py`
- `create_scene(db, place_id, title)` — creates the scene with
  `last_post_at = now`, returns it. (First post is created in the same request;
  see route below.)
- `get_scene(db, scene_id)`, `list_scenes_in_place(db, place_id)` — order by
  `last_post_at` desc; caller derives status.
- `get_active_scene(db, place_id)` — the one scene that is neither finished nor
  timed-out (there should be ≤1); used to gate "start new scene".
- `create_post(db, scene, author_character_id, body)` — inserts the post **and
  bumps `scene.last_post_at = post.created_at`** in one commit.
- `list_posts(db, scene_id)` — ordered by `created_at`.
- Status helper: `scene_status(scene, timeout_days) -> "active"|"inactive"|"finished"`
  and `scene_participant_ids(scene)` (distinct authors, first-seen order). Keep
  these pure so the schema layer / tests can reuse them.
- Register in `crud/__init__.py`.

### 3. Schemas — `backend/app/schemas/scene.py`, `.../post.py`
- `PostRead`: `id, author_character_id, author_name?, body, created_at`.
  (Include `author_name` by resolving the character — the frontend needs it for
  the byline; cheap since posts already load the author relationship.)
- `PostCreate`: `{ body: str }`.
- `SceneCreate`: `{ title: str, body: str }` — title + the first post's body in
  one payload (title is required and comes from the first post).
- `SceneRead`: `id, place_id, title, status, last_post_at, finished_at,
  created_at, participant_ids: list, post_count`. `status` is the derived string.
- `SceneWithPosts(SceneRead)`: adds `posts: list[PostRead]`.
- Register in `schemas/__init__.py`.

### 4. Routes — extend `backend/app/routes/storybooks.py`
Keep scenes under the storybook router so occupancy/timeout config (on the space)
is in scope. Reuse the existing `_get_place_in_space` helper. Endpoints:

| Method & path | Body | Auth | Returns |
|---|---|---|---|
| `GET  /storybooks/{sid}/places/{pid}/scenes` | — | `get_current_user` | `List[SceneRead]` (active first, then history) |
| `POST /storybooks/{sid}/places/{pid}/scenes` | `SceneCreate` | `get_current_character` | `SceneWithPosts` — creates scene **+ first post** atomically; 409 if an active scene already exists in the place |
| `GET  /storybooks/{sid}/scenes/{scene_id}` | — | `get_current_user` | `SceneWithPosts` |
| `POST /storybooks/{sid}/scenes/{scene_id}/posts` | `PostCreate` | `get_current_character` | `PostRead` — bumps `last_post_at`; 409 if scene is finished |

**Authorization for posting:** any member of the space may post (not just
creator/editor — this is gameplay, not admin). Phase-1 pragmatic rule: require a
valid acting character via `get_current_character` and that they hold a
`Membership` in the space. Add a small `is_member(db, space_id, character_id)`
check (or reuse whatever membership lookup `can_edit_space` builds on). Non-members
get 403. Reading is open to any logged-in user (matches place reads today).

Add a `_get_scene_in_space(db, space_id, scene_id)` guard mirroring
`_get_place_in_space`.

### 5. Tests — `backend/tests/test_scenes.py`
Mirror `test_storybooks.py`. Cover: create scene → first post present & title set;
second character posts → participants = 2, `last_post_at` bumped; cannot start a
second active scene (409); posting to a finished scene → 409 (set `finished_at`
directly in the test since there's no finish endpoint yet); status derivation
(active vs. inactive via a back-dated `last_post_at`); non-member cannot post
(403); reads work for any logged-in user.

**DB note:** no Alembic yet (see hold-off-on-fixes) — new tables land via
`create_all` on a fresh DB. Wipe/reseed the dev SQLite (`data/app.db`) after
pulling this branch.

---

## Frontend slice

The scene UI slots into the **center panel** of the StoryBook detail page,
directly below the selected place's image/title/description
([index.tsx:193-206](../../frontend/src/pages/StoryBookDetail/index.tsx#L193-L206)).
When a place is selected inside the entered world, show its active scene (or an
empty state to start one).

### 1. `api.ts`
No new helpers strictly needed — `apiUrl`, `authHeaders`, `characterHeaders`
already exist. Posting/creating uses `{ ...authHeaders(), ...characterHeaders(),
'Content-Type': 'application/json' }`.

### 2. New component — `components/Scene/` (folder per convention)
- `Scene.tsx` — given a `placeId` + `storybookId`, fetches the place's scenes,
  finds the active one, and renders:
  - **Post list**: each post = author byline + avatar (later) + body + timestamp.
  - **Reply box**: textarea + "Antworten" button → `POST .../scenes/{id}/posts`,
    then refetch. Plain textarea for now; rich-text/BBCode is a later pass (shares
    the Biographie BBCode work, Phase 3 of plot-settings).
  - **Empty state** (no active scene): a "Neue Szene starten" form with a
    **title** field + first-post **body** → `POST .../places/{pid}/scenes`.
  - **Finished/inactive history**: a collapsed list below the active scene
    (read-only). Reopen button is deliberately absent (→ `scene-lifecycle`).
- `Scene.module.css` — reuse existing panel/typography tokens from
  `StoryBookDetail.module.css` where possible.

### 3. Wire into `StoryBookDetail/index.tsx`
In the `selectedPlace` branch of `center`, append `<Scene storybookId={id}
placeId={selectedPlace.id} />` after the description. Gate the reply/start-scene
controls on the user being a member (reuse the membership signal; for Phase 1 a
simple "has a selected character" check is acceptable, backend enforces the real
rule).

### 4. i18n
All strings as `t()` keys in `src/locales/{de,en}.json` (German default). New keys
under a `scene.*` namespace: `scene.reply`, `scene.startNew`, `scene.title`,
`scene.body`, `scene.noActiveScene`, `scene.finished`, `scene.participants`, etc.

### 5. Tests — `components/Scene/Scene.test.tsx` (Vitest)
Render with a mocked fetch: shows posts; empty state renders the start form;
submitting a reply posts and refetches. Keep it in the same style as
`StoryBooks.test.tsx`.

---

## Definition of done
- Backend: new tables via `create_all`, all four endpoints, membership-gated
  posting, `test_scenes.py` green (plus existing suite).
- Frontend: can enter a world → pick a place → start a scene → post turns →
  see participants update; build + Vitest green.
- Occupancy freeing, finish/reopen, ping are **out of scope** (→ `scene-lifecycle`).
- Branch cut off the latest `main` after `plot-settings` merges; own PR.
