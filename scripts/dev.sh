#!/usr/bin/env bash
# Local dev servers for ServerXProject (manual workflow, not Docker).
#   Backend  = FastAPI (uvicorn) on 127.0.0.1:8000
#   Frontend = Vite dev server on :3000
#
# Usage:  scripts/dev.sh [on|off|restart|status]   (default: on)
#   on / up / start   start both, wait until each is reachable
#   off / down / stop kill whatever is on :8000 and :3000
#   restart           stop then start
#   status            report which ports are in use
#
# Run from anywhere — the script cd's to the repo root itself.
set -uo pipefail

# --- locate repo root (parent of this script's dir) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

LOG_DIR="$ROOT/.dev-logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

port_pids() { lsof -ti:"$1" 2>/dev/null; }

wait_for_200() {
  # $1 = url, $2 = max seconds
  local url="$1" max="$2" i=0
  while [ "$i" -lt "$max" ]; do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null)" = "200" ]; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

stop() {
  local pids
  pids="$(lsof -ti:8000,3000 2>/dev/null)"
  if [ -z "$pids" ]; then
    echo "Nothing running on :8000 or :3000."
    return 0
  fi
  echo "$pids" | xargs kill 2>/dev/null
  sleep 1
  if [ -n "$(lsof -ti:8000,3000 2>/dev/null)" ]; then
    echo "Some processes survived SIGTERM; sending SIGKILL..."
    lsof -ti:8000,3000 2>/dev/null | xargs kill -9 2>/dev/null
  fi
  echo "Stopped. Ports 8000 and 3000 are free."
}

status() {
  local b f
  b="$(port_pids 8000)"; f="$(port_pids 3000)"
  echo "backend  :8000 -> ${b:-free}"
  echo "frontend :3000 -> ${f:-free}"
}

start() {
  # refuse to double-start
  if [ -n "$(port_pids 8000)" ] || [ -n "$(port_pids 3000)" ]; then
    echo "Something is already on :8000 or :3000. Run 'scripts/dev.sh restart' or 'off' first."
    status
    exit 1
  fi

  mkdir -p "$LOG_DIR"

  echo "Starting backend (FastAPI) on :8000 ..."
  .venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 \
    >"$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!

  if wait_for_200 "http://127.0.0.1:8000/ping" 15; then
    echo "  backend ready (pid $BACKEND_PID)"
  else
    echo "  backend did NOT come up within 15s. Last log lines:"
    tail -n 20 "$BACKEND_LOG"
    kill "$BACKEND_PID" 2>/dev/null
    exit 1
  fi

  echo "Starting frontend (Vite) on :3000 ..."
  # VITE_API_BASE_URL is required so the SPA calls the local backend, not its own origin.
  ( cd "$ROOT/frontend" && VITE_API_BASE_URL=http://localhost:8000 npm start \
      >"$FRONTEND_LOG" 2>&1 & )

  if wait_for_200 "http://127.0.0.1:3000" 90; then
    echo "  frontend ready"
  else
    echo "  frontend did NOT come up within 90s. Last log lines:"
    tail -n 20 "$FRONTEND_LOG"
    exit 1
  fi

  echo ""
  echo "Up. Open http://localhost:3000  (log in with test / 1234)"
  echo "Logs: $BACKEND_LOG  and  $FRONTEND_LOG"
  echo "Stop with: scripts/dev.sh off"
}

case "${1:-on}" in
  on|up|start)     start ;;
  off|down|stop)   stop ;;
  restart)         stop; echo; start ;;
  status)          status ;;
  *)
    echo "Usage: scripts/dev.sh [on|off|restart|status]"
    exit 2
    ;;
esac
