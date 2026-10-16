#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="wwc@wwc.dev-shit.de"
REMOTE_DIR="/home/wwc"
KEY="${WWC_SSH_KEY:-./id_ed25519}"
LOCAL_DB="${1:-data/app.db}"

if [[ ! -f "$LOCAL_DB" ]]; then
  echo "Local SQLite DB not found: $LOCAL_DB" >&2
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 is required to sanitize and validate the DB before deployment." >&2
  exit 1
fi

cat <<'WARNING'
This will CHANGE the server SQLite database at wwc@wwc.dev-shit.de:/home/wwc/data/app.db.
Before upload, the DB copy is sanitized so no character whose name equals its account login name is deployed.
The current server DB is moved to data/reset-backups/ before replacement.
WARNING

read -r -p "Continue with SQLite DB deployment? Type 'deploy-db' to continue: " answer
if [[ "$answer" != "deploy-db" ]]; then
  echo "SQLite DB deployment cancelled."
  exit 1
fi

tmp_db="$(mktemp /tmp/wwc-app-db.XXXXXX.db)"
cleanup() {
  rm -f "$tmp_db"
}
trap cleanup EXIT

cp "$LOCAL_DB" "$tmp_db"

before_count="$(sqlite3 "$tmp_db" "select count(*) from characters c join accounts a on a.id = c.account_id where c.name = a.login_name;")"
if [[ "$before_count" != "0" ]]; then
  echo "Removing $before_count account-named character(s) from deployment copy."
  sqlite3 "$tmp_db" "delete from characters where id in (select c.id from characters c join accounts a on a.id = c.account_id where c.name = a.login_name);"
fi

after_count="$(sqlite3 "$tmp_db" "select count(*) from characters c join accounts a on a.id = c.account_id where c.name = a.login_name;")"
if [[ "$after_count" != "0" ]]; then
  echo "Refusing to deploy: sanitized DB still contains account-named characters." >&2
  exit 1
fi

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$REMOTE_HOST" \
  "mkdir -p ${REMOTE_DIR}/data/reset-backups && if [ -f ${REMOTE_DIR}/data/app.db ]; then mv ${REMOTE_DIR}/data/app.db ${REMOTE_DIR}/data/reset-backups/app.db.pre-sqlite-deploy.\$(date +%Y%m%d%H%M%S).bak; fi"

rsync -az \
  -e "ssh -i ${KEY} -o StrictHostKeyChecking=accept-new" \
  "$tmp_db" "${REMOTE_HOST}:${REMOTE_DIR}/data/app.db"

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$REMOTE_HOST" "touch ${REMOTE_DIR}/server.py"

echo "SQLite DB deployed without account-named characters."
