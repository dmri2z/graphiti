#!/usr/bin/env bash
# Boot the Graph Explorer backend (:8001) and frontend (:5173) together.
#
# Assumes the graph database (FalkorDB on :6379 by default) is already running and
# populated — see README.md. Ctrl-C stops both processes.
#
#   ./run.sh                 # start both, stream logs
#   BACKEND_PORT=9001 ./run.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

backend_pid=""
frontend_pid=""
cleanup() {
  trap - INT TERM EXIT
  [ -n "$frontend_pid" ] && kill "$frontend_pid" 2>/dev/null || true
  [ -n "$backend_pid" ] && kill "$backend_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# --- backend ---
cd "$HERE/backend"
if [ ! -f .env ]; then
  echo "backend/.env missing — creating from .env.example (edit DB/keys as needed)"
  cp .env.example .env
fi
echo "Installing backend deps (uv sync)…"
uv sync --quiet
echo "Starting backend on :$BACKEND_PORT"
uv run uvicorn app:app --port "$BACKEND_PORT" --host 127.0.0.1 &
backend_pid=$!

# Wait for backend health before starting the frontend.
for i in $(seq 1 30); do
  if curl -sf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1; then
    echo "backend ready after ${i}s"
    break
  fi
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    echo "backend exited during startup" >&2; exit 1
  fi
  [ "$i" -eq 30 ] && { echo "backend did not become ready in 30s" >&2; exit 1; }
  sleep 1
done

# --- frontend ---
cd "$HERE/frontend"
[ -d node_modules ] || { echo "Installing frontend deps (npm install)…"; npm install; }
echo "Starting frontend on :$FRONTEND_PORT"
VITE_API_BASE="${VITE_API_BASE:-http://localhost:$BACKEND_PORT/api}" \
  npm run dev -- --port "$FRONTEND_PORT" &
frontend_pid=$!

echo
echo "Graph Explorer up:"
echo "  frontend  http://localhost:$FRONTEND_PORT"
echo "  backend   http://localhost:$BACKEND_PORT/api/health"
echo "Ctrl-C to stop both."
wait
