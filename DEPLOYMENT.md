# Deployment to wwc.dev-shit.de

The host proxies `https://wwc.dev-shit.de` to the port configured in `/home/wwc/proxy.conf`.
The current server has `port = 8000`, Python 3, and no usable Docker access for the `wwc` user.

This branch therefore deploys the app without Docker:

- the React app is built locally into `frontend/build/`
- `server.py` is the host entrypoint
- `server.py` creates/updates a local `.venv` on the server
- FastAPI serves both the API and the React build on `127.0.0.1:8000`
- the default database is SQLite at `data/app.db`
- `DATABASE_URL` can still be set to PostgreSQL for Docker/other environments

## Deploy

Only run this after confirming that server changes are approved:

```bash
./scripts/deploy-wwc.sh
```

The script asks for a typed confirmation, builds the frontend, then rsyncs the project to `/home/wwc` while excluding secrets and local dependency folders.

## Deploy a fresh SQLite DB

Use the guarded DB deployment script instead of copying `data/app.db` manually:

```bash
./scripts/deploy-sqlite-db-wwc.sh
```

The script deploys a sanitized copy and refuses to leave characters whose name equals their account login name in the deployed DB.

## After deploy

Open:

```text
https://wwc.dev-shit.de
```

Useful read-only checks:

```bash
./scripts/wwc-ssh -- ss -tulpn
./scripts/wwc-ssh -- ps aux
```
