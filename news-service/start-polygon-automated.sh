#!/bin/bash
# Start Polygon Automated Trading Service
# Continuously monitors CoinDesk RSS and executes trades

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  🤖 POLYGON AUTOMATED TRADING SERVICE"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Load config
if [ -f ../.polygon-addresses ]; then
    source ../.polygon-addresses
else
    echo "❌ No deployment found. Run ../deploy-polygon.sh first"
    exit 1
fi

echo "Configuration:"
echo "  Oracle:       $POLYGON_ORACLE"
echo "  TradingAgent: $POLYGON_AGENT"
echo "  Registry:     $POLYGON_REGISTRY"
echo ""

# Check .env settings
POLL_INTERVAL=${POLL_INTERVAL_MINUTES:-5}
MIN_CONFIDENCE=${MIN_CONFIDENCE_THRESHOLD:-60}
MAX_PER_CYCLE=${MAX_CLASSIFICATIONS_PER_CYCLE:-5}

echo "Service Settings:"
echo "  Poll Interval:    ${POLL_INTERVAL} minutes"
echo "  Min Confidence:   ${MIN_CONFIDENCE}%"
echo "  Max Per Cycle:    ${MAX_PER_CYCLE} articles"
echo ""

echo "⚠️  IMPORTANT:"
echo "  - Each classification costs ~\$0.03 (zkML proof + Oracle)"
echo "  - Each trade costs ~\$0.03 (QuickSwap swap)"
echo "  - Total: ~\$0.06 per article"
echo "  - With ${MAX_PER_CYCLE} articles per cycle: ~\$0.30 per ${POLL_INTERVAL} minutes"
echo ""

read -p "Start automated trading? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo "🚀 Starting service..."
echo "   Press Ctrl+C to stop"
echo ""

# Run service
node src/polygonAutomated.js
