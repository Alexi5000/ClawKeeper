#!/bin/bash
# ClawKeeper Start Script
# Starts API server and dashboard

echo "🔐 Starting ClawKeeper..."
echo ""

REPO_DIR="$(pwd)"

# Source .env
if [ -f "$REPO_DIR/.env" ]; then
    export $(grep -v '^#' "$REPO_DIR/.env" | xargs)
fi

# Start API server (background)
echo "🚀 Starting API server on port ${PORT:-4004}..."
cd "$REPO_DIR"
bun run dev &
API_PID=$!

sleep 3

# Start dashboard (background)
echo "💻 Starting dashboard on port 3000..."
cd "$REPO_DIR"
bun run dashboard:dev &
DASHBOARD_PID=$!

echo ""
echo "✅ ClawKeeper started!"
echo ""
echo "Services:"
echo "  API: http://localhost:${PORT:-4004}"
echo "  Dashboard: http://localhost:3000"
echo ""
echo "PIDs: API=$API_PID, Dashboard=$DASHBOARD_PID"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for interrupt
trap "kill $API_PID $DASHBOARD_PID 2>/dev/null; exit" INT TERM
wait
