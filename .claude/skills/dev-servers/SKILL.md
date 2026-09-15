---
name: dev-servers
description: Start, stop, restart, or check the local ServerXProject dev servers (FastAPI backend on :8000 + React frontend on :3000). Use when the user asks to turn the app/servers on or off, run/start/stop the app, restart it, or check whether it's running.
---

# Dev servers (manual, local)

Manual servers are the preferred local workflow for this project (not Docker).
Backend = FastAPI on **:8000**, frontend = CRA React on **:3000**.
Run commands from the repo root unless a step says otherwise.

**Parse the argument:** `on`/`up`/`start`, `off`/`down`/`stop`, `restart`, `status`.
If no argument is given, run **status** and ask whether to start or stop.

## Start (on)
1. Start the backend in the background (Bash `run_in_background: true`):
   ```
   .venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
   ```
2. Poll until ready (up to ~15s): `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/ping` returns `200`.
3. Start the frontend in the background (Bash `run_in_background: true`), from the `frontend/` dir (Vite dev server, port 3000 from vite.config):
   ```
   VITE_API_BASE_URL=http://localhost:8000 npm start
   ```
   `VITE_API_BASE_URL` is **required** so the frontend calls the local backend (otherwise API calls hit the dev server's own origin and fail).
4. Poll `http://127.0.0.1:3000` until it returns `200` (CRA compile can take 30–60s).
5. Report: open **http://localhost:3000**, log in with `test` / `1234` (the sanctioned test account — do NOT use Luminary, that's the user's real account).

## Stop (off)
1. `lsof -ti:8000,3000 | xargs kill`
2. Verify free: run `lsof -ti:8000; lsof -ti:3000` — no output means both stopped.

Note: a background backend task ending with **exit code 143** is just SIGTERM from the kill — a clean shutdown, not an error.

## Restart
Run **Stop**, then **Start**.

## Status
`lsof -ti:8000; lsof -ti:3000` — report which port has a PID (running) vs no output (free).

## Notes
- Do NOT run Docker (`docker compose up`) at the same time — it collides on the same ports.
- If a port is already in use when starting, stop first (or report it) rather than failing.
- Avoid fragile shell redirects; keep the port commands simple.
