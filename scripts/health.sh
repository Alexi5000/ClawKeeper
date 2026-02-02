#!/bin/bash
# ClawKeeper Health Check Script

echo "🔐 ClawKeeper Health Check"
echo "========================="
echo ""

REPO_DIR="$(pwd)"
API_URL="http://localhost:4004"
DASHBOARD_URL="http://localhost:5174"

# Check API server
echo -n "API Server ($API_URL): "
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "❌ Not responding"
fi

# Check dashboard
echo -n "Dashboard ($DASHBOARD_URL): "
if curl -s -f "$DASHBOARD_URL" > /dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "❌ Not responding"
fi

# Check database
echo -n "Database: "
if [ -n "$DATABASE_URL" ]; then
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Connected"
    else
        echo "❌ Connection failed"
    fi
else
    echo "⚠️  DATABASE_URL not set"
fi

# Check Clawdbot
echo -n "Clawdbot Gateway: "
if clawdbot health > /dev/null 2>&1; then
    echo "✅ Healthy"
else
    echo "❌ Not running"
fi

echo ""
echo "Agent Status:"
echo "  CEO: ClawKeeper"
echo "  Orchestrators: 9"
echo "  Workers: 100"
echo ""
