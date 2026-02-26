#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

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

cleanup() {
  echo
  echo "Stopping backend and frontend..."
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}

trap cleanup SIGINT SIGTERM EXIT

echo "Starting backend (langgraph dev)..."
(
  cd "$BACKEND_DIR"
  langgraph dev 2>&1 | sed -u 's/^/[backend] /'
) &
backend_pid=$!

echo "Starting frontend (npm run dev)..."
(
  cd "$FRONTEND_DIR"
  npm run dev 2>&1 | sed -u 's/^/[frontend] /'
) &
frontend_pid=$!

wait -n "$backend_pid" "$frontend_pid"

echo "One process exited. Shutting down the other..."
cleanup