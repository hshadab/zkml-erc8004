#!/bin/bash
# End-to-end Polygon zkML Trading Test
# Generates zkML proof → Submits to Oracle → Executes trade on QuickSwap

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 END-TO-END POLYGON zkML TRADING TEST"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Load addresses
if [ -f ../.polygon-addresses ]; then
    source ../.polygon-addresses
else
    echo "❌ No deployment found. Run ../deploy-polygon.sh first"
    exit 1
fi

echo "Testing complete zkML trading flow on Polygon:"
echo "  Oracle:       $POLYGON_ORACLE"
echo "  TradingAgent: $POLYGON_AGENT"
echo "  Registry:     $POLYGON_REGISTRY"
echo ""

HEADLINE="${1:-Bitcoin ETF Approved by SEC - Price Surges to New All-Time High}"

echo "📰 Test Headline: \"$HEADLINE\""
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  Step 1/2: Generate zkML Classification (~26 seconds)"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Generate classification and submit to Polygon
echo "Generating JOLT zkML proof and submitting to Polygon Oracle..."
echo ""

CLASS_OUTPUT=$(node src/polygonClassifier.js "$HEADLINE" 2>&1)
echo "$CLASS_OUTPUT"

# Extract classification ID
CLASS_ID=$(echo "$CLASS_OUTPUT" | grep "Classification ID:" | tail -1 | awk '{print $3}')

if [ -z "$CLASS_ID" ]; then
    echo ""
    echo "❌ Failed to extract classification ID"
    exit 1
fi

echo ""
echo "✅ Classification submitted with ID: $CLASS_ID"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  Step 2/2: Execute Trade on QuickSwap (~3 seconds)"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Execute trade
node src/polygonTrader.js "$CLASS_ID"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ END-TO-END TEST COMPLETE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "What just happened:"
echo "  1. Generated real JOLT zkML proof (~19s)"
echo "  2. Wrapped proof in Groth16 (~4s)"
echo "  3. Submitted classification to Polygon Oracle (~$0.03)"
echo "  4. TradingAgent executed swap on QuickSwap (~$0.03)"
echo ""
echo "Total cost: ~$0.06 (15-20x cheaper than Base Sepolia!)"
echo ""
echo "🔗 View transactions on PolygonScan:"
echo "   https://polygonscan.com/address/$POLYGON_AGENT"
echo ""
echo "Next: Run 100 automated trades:"
echo "  node src/polygonAutomated.js"
echo ""
