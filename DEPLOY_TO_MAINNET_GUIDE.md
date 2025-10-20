# Base Mainnet Deployment Guide

Complete step-by-step guide for deploying zkML News Trading Agent to **Base Mainnet** (production).

⚠️ **WARNING: This uses REAL money. Double-check everything!**

---

## Prerequisites

### 1. Get Base Mainnet ETH (~0.5 ETH minimum)

**Option A: Bridge from Ethereum**
1. Go to https://bridge.base.org
2. Connect your wallet
3. Bridge 0.5 ETH from Ethereum → Base
4. Wait ~10 minutes for confirmation

**Option B: Buy on Exchange**
1. Coinbase: Withdraw ETH directly to "Base" network
2. Binance: Select "Base" when withdrawing ETH

**Verify balance:**
```bash
# Replace with your address
cast balance 0xYOUR_ADDRESS --rpc-url https://mainnet.base.org
```

### 2. Get Base Mainnet RPC URL

**Free Options:**

**A. Alchemy (recommended)**
1. Go to https://www.alchemy.com
2. Create account → Create App
3. Select "Base" network
4. Copy HTTPS endpoint: `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY`

**B. Public RPC (no signup)**
```
https://mainnet.base.org
https://base.llamarpc.com
https://1rpc.io/base
```

---

## Step 1: Configure Environment

```bash
cd /home/hshadab/zkml-erc8004/contracts
```

**Edit `.env` file:**
```bash
# Add these lines to contracts/.env
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE  # ⚠️ KEEP SECRET!
BASE_MAINNET_RPC_URL=https://mainnet.base.org
```

---

## Step 2: Deploy Contracts to Base Mainnet

```bash
cd /home/hshadab/zkml-erc8004/contracts

# Deploy all contracts (takes ~2 minutes)
forge script script/DeployComplete.s.sol:DeployComplete \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

**Expected output:**
```
========================================
DEPLOYMENT COMPLETE
========================================

Core Contracts:
  ZkMLVerificationRegistry: 0x...
  Groth16Verifier: 0x...
  NewsVerifier: 0x...
  NewsClassificationOracle: 0x...
  TradingAgent: 0x...

ERC-8004 Tokens:
  Oracle Token ID: 0 (Reputation: 250)
  Agent Token ID: 1 (Reputation: 250)
```

**📝 SAVE THESE ADDRESSES!** You'll need them in the next steps.

---

## Step 3: Fund the TradingAgent

The TradingAgent needs ETH to execute trades.

```bash
# Replace with your actual TradingAgent address from Step 2
TRADING_AGENT_ADDRESS=0xYOUR_TRADING_AGENT_ADDRESS

# Send 0.1 ETH for trading capital
cast send $TRADING_AGENT_ADDRESS \
  --value 0.1ether \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY

# Verify balance
cast balance $TRADING_AGENT_ADDRESS --rpc-url https://mainnet.base.org
```

**Expected:** ~0.1 ETH in TradingAgent

---

## Step 4: Update news-service Configuration

```bash
cd /home/hshadab/zkml-erc8004/news-service
```

**Edit `.env` file:**
```bash
# Update these with your deployed addresses from Step 2
BASE_MAINNET_RPC_URL=https://mainnet.base.org
ORACLE_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

NEWS_ORACLE_CONTRACT_ADDRESS=0xYOUR_ORACLE_ADDRESS
VERIFICATION_REGISTRY_ADDRESS=0xYOUR_REGISTRY_ADDRESS
NEWS_VERIFIER_ADDRESS=0xYOUR_VERIFIER_ADDRESS
GROTH16_VERIFIER=0xYOUR_GROTH16_ADDRESS
TRADING_AGENT_ADDRESS=0xYOUR_AGENT_ADDRESS

# Base Mainnet Token Addresses (official)
WETH_ADDRESS=0x4200000000000000000000000000000000000006
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
UNISWAP_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
UNISWAP_QUOTER=0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a
```

---

## Step 5: Test with One Classification

**⚠️ Start small! This costs real gas.**

```bash
cd /home/hshadab/zkml-erc8004/news-service

# Test with a bullish headline
node src/testRealArticle.js "Bitcoin ETF Approved by SEC, Price Surges to New All-Time High"
```

**Expected output (~26 seconds):**
```
🎯 JOLT Proof Generated (21.3s)
🔒 Groth16 Proof Generated (1.8s)
📡 Classification Submitted to Oracle
✅ Classification ID: 0x...
   Sentiment: 2 (GOOD_NEWS)
   Confidence: 85%
```

---

## Step 6: Execute a Trade

```bash
# Use the classification ID from Step 5
CLASSIFICATION_ID=0xYOUR_CLASSIFICATION_ID_FROM_STEP_5

# Create test script
cat > testMainnetTrade.js << 'EOF'
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.BASE_MAINNET_RPC_URL;
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const agentAbi = [
  'function reactToNews(bytes32 classificationId) external',
  'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)'
];

const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, wallet);

const classificationId = process.argv[2];

console.log('🚀 Executing trade on Base Mainnet...\n');
console.log(`   Classification: ${classificationId}`);
console.log(`   Agent: ${AGENT_ADDRESS}\n`);

try {
  const tx = await agent.reactToNews(classificationId);
  console.log(`   📤 TX submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`   ✅ Trade executed! Gas used: ${receipt.gasUsed}`);
  console.log(`   🔗 https://basescan.org/tx/${tx.hash}\n`);

  // Look for TradeExecuted event
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
    console.log(`   Amount In: ${ethers.formatEther(parsed.args.amountIn)} ETH`);
    console.log(`   Amount Out: ${Number(parsed.args.amountOut) / 1e6} USDC\n`);
  }

  console.log('✅ SUCCESS! Your zkML trading agent is live on Base Mainnet!');

} catch (error) {
  console.log(`❌ Trade failed: ${error.message}`);

  if (error.message.includes('insufficient funds')) {
    console.log('\n💡 The TradingAgent needs more ETH. Fund it with:');
    console.log(`   cast send ${AGENT_ADDRESS} --value 0.1ether`);
  }
}
EOF

# Execute the trade
node testMainnetTrade.js $CLASSIFICATION_ID
```

**Expected output:**
```
🚀 Executing trade on Base Mainnet...

   📤 TX submitted: 0x...
   ✅ Trade executed! Gas used: 287543
   🔗 https://basescan.org/tx/0x...

📊 Trade Details:
   Action: BUY_ETH
   Amount In: 0.01 ETH
   Amount Out: 32.45 USDC

✅ SUCCESS! Your zkML trading agent is live on Base Mainnet!
```

---

## Step 7: Start Automated Service

```bash
cd /home/hshadab/zkml-erc8004/news-service

# Start service in background
npm start > mainnet.log 2>&1 &

# Monitor logs
tail -f mainnet.log
```

**The service will now:**
1. Poll CoinDesk RSS every 5 minutes
2. Generate zkML proofs for new articles
3. Submit classifications to oracle
4. TradingAgent reacts automatically to high-confidence signals

---

## Step 8: Monitor Activity

### View Trades on BaseScan

```
https://basescan.org/address/YOUR_TRADING_AGENT_ADDRESS
```

### Check Oracle Classifications

```bash
node checkMainnetStatus.js
```

**Create this script:**
```javascript
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
const oracleAbi = [
  'function classificationCount() view returns (uint256)',
  'function classifications(uint256) view returns (bytes32 id, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId)'
];

const oracle = new ethers.Contract(
  process.env.NEWS_ORACLE_CONTRACT_ADDRESS,
  oracleAbi,
  provider
);

const count = await oracle.classificationCount();
console.log(`📊 Total Classifications on Mainnet: ${count}\n`);

// Get last 5
for (let i = Math.max(0, Number(count) - 5); i < count; i++) {
  const c = await oracle.classifications(i);
  const sentiments = ['BAD_NEWS', 'NEUTRAL_NEWS', 'GOOD_NEWS'];
  console.log(`[${i}] ${c.headline.substring(0, 60)}...`);
  console.log(`    Sentiment: ${sentiments[c.sentiment]} (${c.confidence}%)`);
  console.log(`    Time: ${new Date(Number(c.timestamp) * 1000).toLocaleString()}\n`);
}
```

---

## Cost Breakdown

**Deployment (one-time):**
- Deploy 5 contracts: ~0.01 ETH (~$30)
- Verify on BaseScan: Free

**Per Classification:**
- Submit classification: ~0.001 ETH (~$3)
- Execute trade: ~0.002 ETH (~$6)
- JOLT proof generation: Free (off-chain)

**Trading Capital:**
- Initial: 0.1 ETH (~$300)
- Per trade: 10% of balance

**Total to get started: ~0.5 ETH (~$1,500)**

---

## Troubleshooting

### Deployment Fails

```bash
# Check your balance
cast balance $(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY) \
  --rpc-url https://mainnet.base.org

# Should show > 0.05 ETH
```

### Trade Reverts

```bash
# Check TradingAgent balance
cast balance $TRADING_AGENT_ADDRESS --rpc-url https://mainnet.base.org

# Fund if needed
cast send $TRADING_AGENT_ADDRESS --value 0.1ether \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Classification Fails

```bash
# Check oracle owner matches your key
cast call $NEWS_ORACLE_CONTRACT_ADDRESS "owner()" \
  --rpc-url https://mainnet.base.org
```

---

## Safety Checklist

Before going live:

- [ ] Tested on testnet first
- [ ] Verified all contract addresses
- [ ] Funded TradingAgent with reasonable amount
- [ ] Set appropriate `minConfidence` threshold (60%+)
- [ ] Set reasonable `tradeSize` (start small!)
- [ ] Monitoring setup (logs, alerts)
- [ ] Private keys secured (use hardware wallet in production)
- [ ] Understand gas costs
- [ ] Have emergency stop plan

---

## Emergency Stop

```bash
# Pause trading
cast send $TRADING_AGENT_ADDRESS "pause()" \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY

# Withdraw funds
cast send $TRADING_AGENT_ADDRESS "withdraw(address)" $YOUR_WALLET_ADDRESS \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## Next Steps

1. **Monitor first few trades carefully**
2. **Adjust confidence thresholds** based on performance
3. **Increase trading capital** gradually
4. **Set up monitoring** (Discord/Telegram alerts)
5. **Deploy UI** to visualize trades
6. **Backtest strategies** with historical data

---

## Support

- BaseScan: https://basescan.org
- Base Bridge: https://bridge.base.org
- Uniswap V3: https://app.uniswap.org

Good luck! 🚀
