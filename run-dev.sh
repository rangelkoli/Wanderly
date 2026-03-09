#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
cleaned_up=0

if ! command -v langgraph >/dev/null 2>&1; then
  echo "Error: 'langgraph' is not installed or not on PATH."
  echo "Install it in your backend environment, e.g. pip install \"langgraph-cli[inmem]\""
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: 'npm' is not installed or not on PATH."
  exit 1
fi

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "Error: expected 'backend/' and 'frontend/' directories next to this script."
  exit 1
fi

if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
  echo "Error: '$FRONTEND_DIR/package.json' was not found."
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Error: '$FRONTEND_DIR/node_modules' was not found."
  echo "Run 'npm install' inside '$FRONTEND_DIR' first."
  exit 1
fi

cleanup() {
  if [[ "$cleaned_up" -eq 1 ]]; then
    return
  fi
  cleaned_up=1

  echo
  echo "Stopping backend and frontend..."
  if [[ -n "${backend_pid:-}" ]]; then
    kill "$backend_pid" 2>/dev/null || true
    wait "$backend_pid" 2>/dev/null || true
  fi

  if [[ -n "${frontend_pid:-}" ]]; then
    kill "$frontend_pid" 2>/dev/null || true
    wait "$frontend_pid" 2>/dev/null || true
  fi
}

trap cleanup SIGINT SIGTERM EXIT

echo "Starting backend (langgraph dev)..."
(
  cd "$BACKEND_DIR"
  langgraph dev 2>&1 | sed -u 's/^/[backend] /'
) &
backend_pid=$!

echo "Starting frontend (npm run dev on http://$FRONTEND_HOST:$FRONTEND_PORT)..."
(
  cd "$FRONTEND_DIR"
  npm run dev -- --hostname "$FRONTEND_HOST" --port "$FRONTEND_PORT" 2>&1 | sed -u 's/^/[frontend] /'
) &
frontend_pid=$!

while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done

echo "One process exited. Shutting down the other..."
cleanup
