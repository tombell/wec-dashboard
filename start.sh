#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
INGESTOR="$HOME/.hermes/scripts/start-lemans-ingestor.py"

echo "=== WEC Dashboard ==="
echo "Project: $PROJECT_DIR"

# 1. Ingestor (lives outside repo)
echo ""
echo "[1/3] Starting ingestor..."
python3 "$INGESTOR" &
INGESTOR_PID=$!
echo "[ingestor] PID $INGESTOR_PID"
sleep 2

# 2. API
echo ""
echo "[2/3] Starting API (port 8001)..."
cd "$PROJECT_DIR/packages/api"
pnpm dev &
API_PID=$!
echo "[api] PID $API_PID"
sleep 2

# 3. Frontend dev server
echo ""
echo "[3/3] Starting frontend (port 5173)..."
cd "$PROJECT_DIR/packages/app"
pnpm dev &
FRONTEND_PID=$!
echo "[frontend] PID $FRONTEND_PID"

trap "echo 'Shutting down...'; kill $INGESTOR_PID $API_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

echo ""
echo "=== Ready ==="
echo "  Dashboard (dev): http://localhost:5173"
echo "  API:             http://localhost:8001/api/current"
echo "  Press Ctrl+C to stop all"

wait
