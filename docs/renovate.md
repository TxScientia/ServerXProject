# Renovate

This repository uses [Renovate](https://docs.renovatebot.com/) to keep dependency definitions up to date. The configuration lives in [`renovate.json`](../renovate.json).

## What Renovate scans

Renovate is enabled for these managers:

- `npm` for `package.json` and `package-lock.json` files, including the root project and `frontend/`.
- `pip_requirements` for Python requirements files such as `backend/requirements.txt`.
- `dockerfile` for `backend/Dockerfile` and `frontend/Dockerfile`.
- `docker-compose` for `docker-compose.yml`.
- `github-actions` for workflows in `.github/workflows/`.

Renovate uses these runtime constraints when resolving updates:

- Node.js `20`
- npm `10`
- Python `3.11`

## Pull request strategy

Renovate is configured to create one combined dependency update PR:

- All supported dependency updates are grouped as `all dependencies`.
- Major, minor, and patch updates are not split into separate PRs.
- Renovate may have only one dependency PR and one Renovate branch open at a time.
- Lock file maintenance is disabled because standalone lock-file refreshes would create an additional PR. Lock files are still updated when package updates require them.

Security vulnerability alerts are enabled and receive the `security` label. They still use the repository grouping rules, so they are included in the combined dependency update flow instead of creating separate ecosystem-specific PRs.

## Labels and commits

Renovate PRs receive the `dependencies` label. Security-related updates additionally receive the `security` label.

Semantic commits are enabled through the shared Renovate presets, and Renovate uses the `chore` commit type for dependency updates.

## Dependency Dashboard

The Dependency Dashboard is enabled. Renovate maintains an issue listing detected updates, ignored or pending updates, and the state of open Renovate branches/PRs. Use this dashboard to understand what will be included in the next combined update PR.

## Changing Renovate behavior

Edit [`renovate.json`](../renovate.json) to change Renovate behavior. Keep the single-PR policy by preserving:

- `prConcurrentLimit: 1`
- `branchConcurrentLimit: 1`
- the `all dependencies` package rule
- `separateMajorMinor: false`
- `separateMinorPatch: false`
- `separateMultipleMajor: false`
