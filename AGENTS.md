# Agent Notes

## Deployment safety

Do not push or deploy image files from the repository root to the server.

This especially includes local screenshots and temporary visual assets, for example:

- `Screenshot_*.png`
- `*.jpg`, `*.jpeg`, `*.png`, `*.webp`, `*.gif` in the project root

Before running deployment, check that root-level images are excluded from any sync/push/deploy operation. Application assets that intentionally live inside source/static asset folders may be deployed as usual.
