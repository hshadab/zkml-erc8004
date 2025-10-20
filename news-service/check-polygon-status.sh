#!/bin/bash
# Quick status check for Polygon deployment

set -e

# Load addresses
if [ -f ../.polygon-addresses ]; then
    source ../.polygon-addresses
else
    echo "❌ No deployment found. Run ../deploy-polygon.sh first"
    exit 1
fi

POLYGON_RPC="${POLYGON_RPC_URL:-https://polygon-rpc.com}"

echo "════════════════════════════════════════════════════════════════"
echo "  ⚡ POLYGON QUICK STATUS"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check balances
echo "💰 Agent Balances:"
MATIC_BAL=$(cast balance $POLYGON_AGENT --rpc-url $POLYGON_RPC)
MATIC_BAL_FORMATTED=$(echo "scale=4; $MATIC_BAL / 1000000000000000000" | bc)
echo "  MATIC: $MATIC_BAL_FORMATTED"

WMATIC="0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"
USDC="0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

WMATIC_BAL=$(cast call $WMATIC "balanceOf(address)(uint256)" $POLYGON_AGENT --rpc-url $POLYGON_RPC)
WMATIC_FORMATTED=$(echo "scale=4; $WMATIC_BAL / 1000000000000000000" | bc)
echo "  WMATIC: $WMATIC_FORMATTED"

USDC_BAL=$(cast call $USDC "balanceOf(address)(uint256)" $POLYGON_AGENT --rpc-url $POLYGON_RPC)
USDC_FORMATTED=$(echo "scale=2; $USDC_BAL / 1000000" | bc)
echo "  USDC: $USDC_FORMATTED"
echo ""

# Check trade count
echo "📊 Statistics:"
TRADE_COUNT=$(cast call $POLYGON_AGENT "totalTradesExecuted()(uint256)" --rpc-url $POLYGON_RPC)
echo "  Total Trades: $((TRADE_COUNT))"

CLASS_COUNT=$(cast call $POLYGON_ORACLE "totalClassifications()(uint256)" --rpc-url $POLYGON_RPC)
echo "  Total Classifications: $((CLASS_COUNT))"

REPUTATION=$(cast call $POLYGON_AGENT "reputation()(uint256)" --rpc-url $POLYGON_RPC)
echo "  Reputation: $((REPUTATION))"
echo ""

# Links
echo "🔗 Quick Links:"
echo "  Agent: https://polygonscan.com/address/$POLYGON_AGENT"
echo "  Oracle: https://polygonscan.com/address/$POLYGON_ORACLE"
echo ""

# Calculate estimated costs
if [ $TRADE_COUNT -gt 0 ]; then
    EST_COST=$(echo "scale=2; $TRADE_COUNT * 0.03" | bc)
    echo "💸 Estimated gas spent: ~\$$EST_COST"
    echo ""
fi

echo "════════════════════════════════════════════════════════════════"
