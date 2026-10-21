# Self-hosted image uploads

Image uploads are a module in the existing FastAPI backend, not an external service. No image bytes, filenames, IP addresses, or image URLs are sent to a third-party optimizer/scanner. The browser sends file bytes directly to our authenticated API.

## User interface and existing data

`ImageUpload` replaces URL inputs for character banners, portraits, ornaments, header backgrounds, both character-builder image block types, plot images, and place images. Rich-text posts, news, wanted ads and PMs already reject image nodes; they remain text-only.

All user-controlled image renderers use `frontend/src/images.ts` to accept only canonical local upload references. Backend validators also reject external, protocol-relative, data, arbitrary local and unknown image references. Application images under `frontend/public/pictures` are trusted static assets and remain unchanged.

**Existing externally linked images stop displaying.** API read serializers hide those references without deleting existing database content. Users must upload their own authorized copies again. We deliberately do not fetch/import old URLs: doing so could expose the server to SSRF, tracking, unlicensed content, or unbounded downloads.

**Default: one image per field, no image history or backups.** Uploading a replacement permanently deletes the previous file and its database record after the new image passes validation and is persisted. Failed validation or persistence leaves the previous image intact. Removing an image from a field permanently deletes its file/record too. Replacements count only their net size difference against storage quotas.

These operations take effect immediately, before the surrounding form is saved; cancelling the form does not restore a deleted image. A failed/interrupted browser response can require reloading or re-uploading. If an image reference was manually reused elsewhere, deleting/replacing it also invalidates those uses. Fields that explicitly need retention can opt into `ImageUpload`'s `retainPrevious` prop; no current field does so.

## Optimization and file safety

- Login required to upload, list or delete images.
- Raw request body, maximum **10 MiB**, checked against both Content-Length and streamed bytes. No original filenames or user-supplied paths are used.
- File content is decoded by Pillow, not trusted based on extension or MIME type.
- Only **static JPEG, PNG, WebP** accepted. SVG, GIF, HTML and unsupported formats are rejected; animated WebP/APNG is rejected too.
- Maximum **25 megapixels**, maximum **10,000 px** on either source edge, plus Pillow decompression-bomb detection.
- Apply EXIF orientation, resize to at most **2048 × 2048** preserving aspect ratio, preserve transparency, and encode a fresh **WebP at quality 82**.
- Fresh pixel buffers remove EXIF/GPS, XMP, ICC, comments, embedded/trailing original payloads. Original bytes are never saved or served.
- Random UUID filenames; files outside source/static folders; fixed WebP response MIME, `nosniff`, restrictive image-response CSP, and no original filename reflection.
- Files are published atomically. Database records track owner, stored size, dimensions, and creation time. No file is served without a corresponding record.
- Account-wide rate limit **10 attempts/minute**, including invalid-file attempts, persisted under a cross-worker file lock.
- Storage quotas: **200 MiB/account**, **5 GiB total**, based on optimized stored bytes. At most two uploads are buffered per process (excess requests receive HTTP 503). Encoding and quota checks are serialized using a local file lock to bound concurrent decoding and avoid over-allocation across workers.

**Limits:** Re-encoding protects against active/embedded file content; this is not an antivirus or visual-content classifier. It does not detect violence, nudity, illegal imagery, copyright violations, or steganographic content. If required, add a self-hosted moderation/quarantine workflow before publication. Keep Pillow patched, run the backend without root privileges, and use OS/container resource limits. Apply body-size, connection, timeout and shared request-rate limits at the reverse proxy too; application checks cannot alone prevent every resource-exhaustion attack.

## Storage and deployment

Install `backend/requirements.txt` (includes Pillow). The normal application startup creates the `image_assets` database table; existing tables/data are not replaced.

- Default storage: `$APP_DATA_DIR/images`, or `data/images`.
- `IMAGE_UPLOAD_DIR`: override with an absolute writable persistent path in production.
- `IMAGE_ACCOUNT_QUOTA_BYTES` and `IMAGE_TOTAL_QUOTA_BYTES`: override storage quotas in bytes.
- Docker Compose mounts the persistent `image-uploads` volume at `/data/images`.
- Use one shared local filesystem and database for all workers. The `fcntl` lock requires a Unix-like host. Multiple hosts need a shared coordination/storage design instead.
- **Do not back up user image bytes.** Exclude `IMAGE_UPLOAD_DIR` / the `image-uploads` volume from backup jobs, snapshots and versioned object storage. This module creates no backup, archive or trash copies. Host-level backup/snapshot policies must be configured separately; application code cannot remove copies already retained by infrastructure.
- Database backups may contain image metadata/references, but must not include image bytes. Restoring such a backup cannot restore deleted images.
- Do not sync/delete current runtime uploads during deployment; the default `data/` directory is already excluded by the deployment script. A custom storage path must also be outside the deployment sync tree or explicitly excluded.
- Never deploy repository-root screenshots or temporary images; only intentionally checked-in application assets may be synced.

## API

### Upload

`POST /api/images` with bearer authentication and the file bytes as the request body (`Content-Type: application/octet-stream`). **Not multipart form data.**

Returns HTTP 201:

```json
{"id":"0123456789abcdef0123456789abcdef","url":"/api/images/0123456789abcdef0123456789abcdef.webp","width":1200,"height":800,"size_bytes":45000}
```

Persist the returned `url` in existing image fields. It is a canonical path, not an arbitrary URL. `uploadImage()` and `imageSrc()` handle frontend requests and API-base resolution.

To replace a field's existing image, use `POST /api/images?replace={old_image_id}`. The backend checks ownership, validates/stores the new image, and permanently deletes the old image file and record before returning success. The response contains a **new ID and URL**. Unknown replacement IDs return 409; another account's image returns 403. Callers must pass the existing field's image ID when replacing it; omitting `replace` means creating an image for a new/empty field.

### List / delete

- `GET /api/images?offset=0&limit=50`: current account's uploads, newest first; maximum page size 100.
- `DELETE /api/images/{id}`: owner-only permanent deletion, returns 204. This invalidates **all** uses of the image; stored references may remain but serializers/renderers hide missing files. The default field-removal UI calls this endpoint.
- `GET /api/images/{id}.webp`: serves a sanitized upload with `Cache-Control: no-store` to prevent persistent browser/proxy caching.

## Privacy / DSGVO boundaries

Self-hosting eliminates browser requests to third-party image hosts, and metadata stripping reduces accidental location/device disclosures. It does **not** by itself establish DSGVO compliance.

**Image URLs are public to anyone who knows the random URL**, as with ordinary web images. Plot/character privacy settings do not protect image bytes. Do not upload confidential personal documents or other content requiring access-controlled delivery. Private media would need authenticated delivery (e.g. protected cookies or a blob-fetching client), per-resource authorization and suitable cache rules.

Define consent/legal basis, copyright/upload rules, user erasure procedures and hosting arrangements separately. User image bytes must not be backed up. Account deletion is not currently implemented by this application; an operator performing account erasure must also delete that account's uploads/records. The list/delete API provides owner-controlled file erasure; a media-management UI and automatic orphan-retention job are not included yet.
