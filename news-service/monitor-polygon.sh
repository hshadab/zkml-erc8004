#!/bin/bash
# Monitor Polygon zkML Trading Agent
# Shows real-time stats from Polygon mainnet

set -e

# Load addresses
if [ -f ../.polygon-addresses ]; then
    source ../.polygon-addresses
else
    echo "❌ No deployment found"
    exit 1
fi

echo "════════════════════════════════════════════════════════════════"
echo "  📊 POLYGON zkML TRADING AGENT - LIVE STATUS"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check TradingAgent balance
echo "💰 TradingAgent Balance:"
BALANCE=$(~/.foundry/bin/cast balance $POLYGON_AGENT --rpc-url $POLYGON_RPC_URL)
BALANCE_MATIC=$(echo "scale=4; $BALANCE / 1000000000000000000" | bc)
BALANCE_USD=$(echo "scale=2; $BALANCE_MATIC * 0.75" | bc)
echo "   $BALANCE_MATIC MATIC (~\$$BALANCE_USD)"
echo ""

# Check deployer balance
echo "👤 Deployer Balance:"
DEPLOYER=$(~/.foundry/bin/cast wallet address --private-key $ORACLE_PRIVATE_KEY)
DEPLOYER_BALANCE=$(~/.foundry/bin/cast balance $DEPLOYER --rpc-url $POLYGON_RPC_URL)
DEPLOYER_MATIC=$(echo "scale=4; $DEPLOYER_BALANCE / 1000000000000000000" | bc)
echo "   $DEPLOYER_MATIC MATIC"
echo ""

echo "🔗 Quick Links:"
echo "   TradingAgent: https://polygonscan.com/address/$POLYGON_AGENT"
echo "   Oracle:       https://polygonscan.com/address/$POLYGON_ORACLE"
echo "   Registry:     https://polygonscan.com/address/$POLYGON_REGISTRY"
echo ""

echo "💡 Gas Estimates (Polygon):"
echo "   zkML Classification: ~$0.03"
echo "   QuickSwap Trade:     ~$0.03"
echo "   Total per trade:     ~$0.06"
echo ""

echo "🚀 Current Capacity:"
REMAINING_TRADES=$(echo "scale=0; $BALANCE_MATIC / 0.1" | bc)
REMAINING_COST=$(echo "scale=2; $REMAINING_TRADES * 0.06" | bc)
echo "   Can execute ~$REMAINING_TRADES more trades"
echo "   Estimated cost: ~\$$REMAINING_COST"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  ✅ Monitoring complete"
echo "════════════════════════════════════════════════════════════════"
