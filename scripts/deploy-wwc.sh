#!/usr/bin/env bash
set -euo pipefail

REMOTE="wwc@wwc.dev-shit.de:"
KEY="${WWC_SSH_KEY:-./id_ed25519}"

cat <<'WARNING'
This will CHANGE the server by syncing this project to wwc@wwc.dev-shit.de.
It may overwrite /home/wwc/server.py and will trigger the host auto-restart.
WARNING

read -r -p "Continue with deployment? Type 'deploy' to continue: " answer
if [[ "$answer" != "deploy" ]]; then
  echo "Deployment cancelled."
  exit 1
fi

npm --prefix frontend ci
npm --prefix frontend run build

rsync -az --delete \
  -e "ssh -i ${KEY} -o StrictHostKeyChecking=accept-new" \
  --exclude '.git/' \
  --exclude '.venv/' \
  --exclude 'data/' \
  --exclude 'frontend/node_modules/' \
  --exclude 'node_modules/' \
  --exclude 'id_ed25519' \
  --exclude 'id_ed25519.pub' \
  --exclude '.ssh/' \
  --exclude 'proxy.conf' \
  --exclude 'PROJECT-GUIDE.md' \
  ./ "$REMOTE"

echo "Deployed. The host should auto-restart server.py within a few seconds."
echo "Open: https://wwc.dev-shit.de"
