#!/bin/bash
# Test a single trade on Polygon (~$0.06 total cost)

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  🧪 POLYGON TRADE TEST (Cost: ~\$0.06)"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Load addresses
if [ -f ../.polygon-addresses ]; then
    source ../.polygon-addresses
else
    echo "❌ No deployment found. Run ./deploy-polygon.sh first"
    exit 1
fi

echo "Testing with:"
echo "  Oracle: $POLYGON_ORACLE"
echo "  Agent:  $POLYGON_AGENT"
echo ""

# Step 1: Generate classification
echo "Step 1: Generating classification (~25 seconds)..."
echo "Creating bullish news classification..."
echo ""

node src/testRealArticle.js "Bitcoin ETF Approved by SEC, Price Surges to New All-Time High" > /tmp/test-classification.log 2>&1 &
CLASSIF_PID=$!

# Show progress
for i in {1..25}; do
    echo -n "."
    sleep 1
done
echo ""

wait $CLASSIF_PID

# Extract classification ID
CLASS_ID=$(grep "Classification ID" /tmp/test-classification.log | tail -1 | awk '{print $4}')

if [ -z "$CLASS_ID" ]; then
    echo "❌ Classification failed. Check /tmp/test-classification.log"
    cat /tmp/test-classification.log
    exit 1
fi

echo "✅ Classification created: $CLASS_ID"
echo ""

# Step 2: Execute trade
echo "Step 2: Executing trade on Polygon..."
echo "This will cost ~\$0.03 in gas"
echo ""

cat > /tmp/test-trade.js <<'EOF'
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const AGENT = process.env.POLYGON_AGENT;
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const CLASS_ID = process.argv[2];

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const agentAbi = [
  'function reactToNews(bytes32 classificationId) external',
  'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)'
];

const agent = new ethers.Contract(AGENT, agentAbi, wallet);

console.log(`\n🚀 Executing trade for classification: ${CLASS_ID}\n`);

try {
  const tx = await agent.reactToNews(CLASS_ID);
  console.log(`   📤 TX submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`   ✅ Trade executed! Gas used: ${receipt.gasUsed}`);
  console.log(`   🔗 https://polygonscan.com/tx/${tx.hash}\n`);

  // Parse trade event
  const tradeEvent = receipt.logs.find(log => {
    try {
      const parsed = agent.interface.parseLog(log);
      return parsed && parsed.name === 'TradeExecuted';
    } catch {
      return false;
    }
  });

  if (tradeEvent) {
    const parsed = agent.interface.parseLog(tradeEvent);
    console.log('📊 Trade Details:');
    console.log(`   Action: ${parsed.args.action}`);
    console.log(`   Amount In: ${ethers.formatEther(parsed.args.amountIn)} MATIC`);
    console.log(`   Amount Out: ${Number(parsed.args.amountOut) / 1e6} USDC\n`);
  }

  // Calculate cost
  const gasPrice = receipt.gasPrice;
  const gasCost = gasPrice * receipt.gasUsed;
  const costMATIC = ethers.formatEther(gasCost);
  const costUSD = (Number(costMATIC) * 0.75).toFixed(4); // Assuming $0.75/MATIC

  console.log(`💰 Gas Cost: ${costMATIC} MATIC (~$${costUSD})\n`);
  console.log('✅ SUCCESS! Your zkML agent just executed a real trade on Polygon!');

} catch (error) {
  console.log(`❌ Trade failed: ${error.message}`);
  process.exit(1);
}
EOF

node /tmp/test-trade.js $CLASS_ID

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ TEST COMPLETE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "What just happened:"
echo "  1. Generated zkML proof (~25s)"
echo "  2. Submitted classification to oracle (~\$0.03)"
echo "  3. TradingAgent executed swap on QuickSwap (~\$0.03)"
echo ""
echo "Total cost: ~\$0.06"
echo ""
echo "Next: Run 500 trades for just \$30!"
echo "  npm start"
echo ""
