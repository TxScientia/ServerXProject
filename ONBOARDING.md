# Onboarding / Catch-up Guide

> Written for an AI coding assistant helping a developer get this repo running after
> pulling the latest `main`. Follow the steps top to bottom. Commands assume you start
> from the repository root unless stated otherwise.

## What this project is

**ServerXProject** ("When Worlds Collide") — a play-by-post RPG portal.

- **Frontend:** React 19 + TypeScript, built with **Vite** (dev server + build), tests via **Vitest**. Lives in `frontend/`.
- **Backend:** FastAPI + SQLAlchemy (Python). Lives in `backend/`.
- **Database (dev):** SQLite at `data/app.db` by default (throwaway test data — safe to delete and let it reseed). Can point at PostgreSQL via the `DATABASE_URL` env var.
- **Preferred local workflow:** run the two servers manually (not Docker).

## ⚠️ Important: the frontend recently migrated Create React App → Vite

If this machine has an **older checkout**, its `frontend/node_modules` still contains the old Create React App toolchain (`react-scripts`) and **won't work** with the new Vite setup. You **must reinstall** frontend dependencies after pulling — a plain `git pull` is not enough.

Also: **Vite 6 requires Node 20+.** Check with `node -v` and upgrade Node if it's older.

## Prerequisites

- **Node.js 20+** and npm 10+
- **Python 3.11+**
- Git

## First-time / after-pull setup

1. **Get the latest code:**
   ```bash
   git checkout main
   git pull
   ```

2. **Frontend — reinstall dependencies (required after the Vite migration):**
   ```bash
   cd frontend
   npm ci          # clean install matching package-lock.json (drops react-scripts, adds Vite)
   cd ..
   ```
   If `npm ci` errors, do `rm -rf frontend/node_modules && (cd frontend && npm install)`.

3. **Backend — set up a virtualenv and install dependencies:**
   ```bash
   python3 -m venv .venv
   .venv/bin/python -m pip install --upgrade pip
   .venv/bin/python -m pip install -r backend/requirements.txt
   ```

4. **Reset a stale database (recommended if this is an old checkout):**
   The schema and seed data have changed. Since dev data is throwaway, delete the local DB so the backend recreates and reseeds it on startup:
   ```bash
   rm -f data/app.db
   ```

## Running the app (two terminals, from the repo root)

**Terminal 1 — backend** (FastAPI on port 8000; recreates + seeds `data/app.db` on start):
```bash
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — frontend** (Vite dev server on port 3000):
```bash
cd frontend
VITE_API_BASE_URL=http://localhost:8000 npm start
```
> `VITE_API_BASE_URL` is **required** — it tells the frontend where the backend is. Without it, API calls hit the dev server's own origin and fail.

Then open **http://localhost:3000**.

## Logging in (test data)

- Log in with the account **`test`** / password **`1234`**.
- On the lobby, click a character (**Arthas** or **Sylvanas**) to "enter the server".
- Use **only the `test` account** for testing. Do not use the other seeded accounts.

## Verifying everything works

**Backend tests** (from repo root):
```bash
.venv/bin/python -m pytest -q
```

**Frontend tests + build** (from `frontend/`):
```bash
npm run test:ci     # Vitest (non-watch)
npm run build       # tsc + vite build → outputs to frontend/build/
```

All of these should pass. If the frontend commands fail with errors about `react-scripts` or missing modules, the dependencies weren't reinstalled — go back to setup step 2.

## Common gotchas

- **"react-scripts: command not found" / weird module errors** → run `npm ci` in `frontend/` (step 2). This is the #1 issue after pulling the Vite migration.
- **Vite won't start / build fails** → check `node -v` is 20+.
- **Frontend loads but login/API calls fail** → make sure you started the frontend with `VITE_API_BASE_URL=http://localhost:8000`.
- **Login fails or app errors about missing DB columns** → delete `data/app.db` and restart the backend (step 4); the schema changed.
- **Stop a server** → `Ctrl+C` in its terminal (or `lsof -ti:8000,3000 | xargs kill`).
