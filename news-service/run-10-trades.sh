#!/bin/bash
# Run 10 consecutive trades on Polygon (~$0.60 total)

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 BATCH TEST: 10 Polygon Trades"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "This will:"
echo "  - Generate 10 zkML classifications (~4 minutes)"
echo "  - Execute 10 trades on QuickSwap"
echo "  - Cost: ~\$0.60 total"
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""

# Load addresses
if [ -f ../.polygon-addresses ]; then
    source ../.polygon-addresses
else
    echo "❌ No deployment found. Run ../deploy-polygon.sh first"
    exit 1
fi

# Test headlines (mix of bullish and bearish)
HEADLINES=(
    "Bitcoin Surges Past \$100,000 as ETF Inflows Hit Record High"
    "Major Exchange Hack: \$500M Stolen, Bitcoin Drops 20%"
    "Ethereum Upgrade Successful, Price Rallies 15%"
    "SEC Announces Crypto Crackdown, Market Sells Off"
    "PayPal Adds Bitcoin Support, Adoption Soars"
    "China Bans Crypto Mining, BTC Hashrate Drops"
    "Major Bank Launches Bitcoin Custody Service"
    "Stablecoin Depegs, Crypto Market Panic Selling"
    "Institutional Investment in Crypto Hits All-Time High"
    "Exchange Halts Withdrawals, FUD Spreads Across Market"
)

SUCCESS=0
FAILED=0

for i in {0..9}; do
    HEADLINE="${HEADLINES[$i]}"

    echo "════════════════════════════════════════════════════════════════"
    echo "  Trade $((i+1))/10"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Headline: $HEADLINE"
    echo ""

    # Generate classification
    echo "Step 1/2: Generating classification (~25 seconds)..."
    node src/testRealArticle.js "$HEADLINE" > /tmp/trade-$i.log 2>&1 &
    PID=$!

    # Progress indicator
    for j in {1..25}; do
        echo -n "."
        sleep 1
    done
    echo ""

    wait $PID

    # Extract classification ID
    CLASS_ID=$(grep "Classification ID" /tmp/trade-$i.log | tail -1 | awk '{print $4}')

    if [ -z "$CLASS_ID" ]; then
        echo "❌ Classification failed"
        FAILED=$((FAILED + 1))
        echo ""
        continue
    fi

    echo "✅ Classification created: $CLASS_ID"

    # Get sentiment
    SENTIMENT=$(grep "Sentiment:" /tmp/trade-$i.log | tail -1 | awk '{print $2}')
    echo "   Sentiment: $SENTIMENT"
    echo ""

    # Execute trade (if not NEUTRAL)
    if [ "$SENTIMENT" != "NEUTRAL_NEWS" ]; then
        echo "Step 2/2: Executing trade..."

        cat > /tmp/execute-trade-$i.js <<'EOJS'
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const AGENT = process.env.POLYGON_AGENT;
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const CLASS_ID = process.argv[2];

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const agentAbi = ['function reactToNews(bytes32 classificationId) external'];
const agent = new ethers.Contract(AGENT, agentAbi, wallet);

try {
  const tx = await agent.reactToNews(CLASS_ID, { gasLimit: 500000 });
  const receipt = await tx.wait();
  console.log(`✅ Trade executed! Gas: ${receipt.gasUsed}`);
  console.log(`   TX: https://polygonscan.com/tx/${tx.hash}`);
} catch (error) {
  console.log(`❌ Trade failed: ${error.message}`);
  process.exit(1);
}
EOJS

        if node /tmp/execute-trade-$i.js $CLASS_ID; then
            SUCCESS=$((SUCCESS + 1))
        else
            FAILED=$((FAILED + 1))
        fi
    else
        echo "⏭️  Skipping trade (NEUTRAL sentiment)"
    fi

    echo ""

    # Small delay between trades
    if [ $i -lt 9 ]; then
        echo "Waiting 5 seconds before next trade..."
        sleep 5
        echo ""
    fi
done

echo "════════════════════════════════════════════════════════════════"
echo "  📊 BATCH TEST COMPLETE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Results:"
echo "  ✅ Successful trades: $SUCCESS"
echo "  ❌ Failed: $FAILED"
echo ""

EST_COST=$(echo "scale=2; $SUCCESS * 0.06" | bc)
echo "💰 Estimated cost: ~\$$EST_COST"
echo ""
echo "View all trades:"
echo "  ./monitor-polygon.sh"
echo ""
