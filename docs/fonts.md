# Self-hosted font library

The library offers 36 starter families (listed in `backend/app/fonts.py`). Additional Google Fonts families can be requested by name in the character editor. Use **Schrift laden / Vorschau** to retrieve and preview a font. Saved profiles also retrieve their font automatically on first view. Other frontend features can reuse `listFonts()` and `loadFont()` from `frontend/src/fonts.ts`.

Only the backend contacts `fonts.googleapis.com` and `fonts.gstatic.com`. Browsers receive stylesheets and WOFF2 files from `/api/fonts/…`; successful downloads are persisted and reused without contacting Google again. The application does not mirror the entire Google Fonts catalog.

## Install the starter set

Run once with the same environment and data directory as the web backend:

```sh
# From repository root (load your deployment environment first):
.venv/bin/python -m backend.app.fonts

# Docker Compose:
docker compose exec backend python -m app.fonts
```

This downloads the starter set ahead of user requests. It is safe to rerun: existing families are skipped. The command requires internet access; web startup never depends on Google being available. Without prewarming, starter families are listed but downloaded only when requested.

## Storage and deployment

- `FONT_CACHE_DIR` overrides the cache location; default: `$APP_DATA_DIR/fonts`, or `data/fonts`.
- Set an **absolute path** in production and keep it writable by the backend user.
- Docker Compose uses the persistent `font-cache` volume at `/data/fonts`.
- Preserve/back up this directory across releases. Without it, requested families need to be downloaded again.
- Cache limit: `FONT_CACHE_MAX_FAMILIES` (default 500). An administrator can raise it or remove unused family directories while the backend is stopped.
- Cache fills are serialized across local workers using a file lock; completed families are published atomically.
- Regular and bold weights are requested, falling back to regular for single-weight families. Italic and arbitrary weight selection are not currently exposed.
- Review each family's upstream license before distributing font files outside this service; Google Fonts family licenses are available in the [Google Fonts repository](https://github.com/google/fonts).

## API

- `GET /api/fonts`: starter and cached families, including `cached` status.
- `POST /api/fonts` with `{"family":"Cinzel"}` and bearer authentication: ensure a local copy exists; returns a stylesheet path relative to the API prefix.
- `GET /api/fonts/{key}/font.css` and `…/{hash}.woff2`: public, cacheable assets; never trigger downloads.

Requests accept family names, not URLs. Downloads have fixed upstream hosts, disabled redirects, timeouts, size limits, a library capacity limit, and five cache-miss attempts per account per minute per process. At larger scale, apply a shared rate limit at the reverse proxy too. Unknown fonts/provider failures leave no published partial cache. Profiles retain their fallback font when retrieval fails.

No deployment is required to run tests, and repository-root screenshots/images must remain excluded from deployments.
