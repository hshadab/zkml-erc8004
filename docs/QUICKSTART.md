# Quick Start Guide

Get the zkML-ERC8004 demo running in under 30 minutes!

## 📋 Prerequisites

- [x] Node.js 18+ installed
- [x] Foundry installed (for contract deployment)
- [x] Base Sepolia ETH in your wallet
- [x] Base Sepolia USDC in your wallet (you already have this!)

## 🚀 Step 1: Install Dependencies

### Contracts

```bash
cd zkml-erc8004/contracts

# Install Foundry dependencies (if forge is installed)
forge install OpenZeppelin/openzeppelin-contracts
forge install Uniswap/v3-core
forge install Uniswap/v3-periphery
forge install foundry-rs/forge-std

# If forge is not installed, that's OK - we'll use Remix for deployment
```

### News Service

```bash
cd ../news-service
npm install
```

## ⚙️ Step 2: Configure Environment

### Set up .env files

**contracts/.env:**
```bash
# Copy example
cp .env.example .env

# Edit .env and add:
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
BASESCAN_API_KEY=YOUR_KEY_HERE  # Optional, for verification
```

**news-service/.env:**
```bash
# Copy example
cp .env.example .env

# Edit .env and add:
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ORACLE_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE  # Can be same as deployer

# Contract addresses - LEAVE EMPTY FOR NOW, will fill after deployment
NEWS_ORACLE_CONTRACT_ADDRESS=
VERIFICATION_REGISTRY_ADDRESS=

# These are good defaults:
POLL_INTERVAL_MINUTES=5
MIN_CONFIDENCE_THRESHOLD=60
```

## 📦 Step 3: Deploy Contracts

### Option A: Using Foundry (if installed)

```bash
cd contracts

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url base-sepolia \
  --broadcast \
  --verify

# Save the deployed addresses!
```

### Option B: Using Remix (if Foundry not installed)

1. Go to https://remix.ethereum.org/
2. Upload these files:
   - `src/ZkMLVerificationRegistry.sol`
   - `src/NewsClassificationOracle.sol`
   - `src/TradingAgent.sol`
   - All files in `src/interfaces/`

3. Compile with Solidity 0.8.20

4. Deploy in this order:

**Step 1: Deploy ZkMLVerificationRegistry**
   - No constructor arguments
   - Save the address

**Step 2: Deploy NewsClassificationOracle**
   - Constructor argument: `_verificationRegistry` = address from Step 1
   - Save the address

**Step 3: Register Oracle as ERC-8004 Agent**
   - Call `ZkMLVerificationRegistry.registerAgent("news_classification")`
   - Note the `tokenId` from the event logs

**Step 4: Set Oracle Token ID**
   - Call `NewsClassificationOracle.setOracleTokenId(tokenId)` with the ID from Step 3

**Step 5: Deploy TradingAgent**
   - Constructor arguments:
     - `_newsOracle`: NewsClassificationOracle address
     - `_verificationRegistry`: ZkMLVerificationRegistry address
     - `_swapRouter`: `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4` (Uniswap V3 on Base Sepolia)
     - `_usdc`: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (USDC on Base Sepolia)
   - Save the address

**Step 6: Register Trading Agent**
   - Call `ZkMLVerificationRegistry.registerAgent("autonomous_trading")`
   - Note the `tokenId` from the event logs

**Step 7: Set Agent Token ID**
   - Call `TradingAgent.setAgentTokenId(tokenId)` with the ID from Step 6

## 📝 Step 4: Update Configuration

**Update news-service/.env with deployed addresses:**
```bash
NEWS_ORACLE_CONTRACT_ADDRESS=0xYOUR_ORACLE_ADDRESS_HERE
VERIFICATION_REGISTRY_ADDRESS=0xYOUR_REGISTRY_ADDRESS_HERE
```

## 💰 Step 5: Fund the Contracts

### Fund Oracle Wallet
Your oracle wallet (the private key in ORACLE_PRIVATE_KEY) needs Base Sepolia ETH for gas:

```bash
# Check if you need more:
# Visit https://sepolia.base.org/faucet
# Or use Alchemy/Infura faucets
```

### Fund Trading Agent

The TradingAgent contract needs tokens to trade with:

1. **Wrap some ETH to WETH:**
   ```bash
   # Send Base Sepolia ETH to TradingAgent address
   # Then call TradingAgent.wrapETH() with 0.1 ETH value
   ```

2. **Or swap some of your USDC to WETH:**
   - Send USDC to TradingAgent address directly
   - The agent will use it for trades

**Recommended starting amounts:**
- 0.1 WETH (for buying)
- 10 USDC (for hedging)

## 🧪 Step 6: Test the System

### Test News Fetcher

```bash
cd news-service

# Test RSS fetching
node src/fetcher.js

# Should show latest CoinDesk headlines
```

### Test Feature Extraction

```bash
# Test classification pipeline
node src/featureExtractor.js

# Should show example classifications
```

### Test Full Classification

```bash
# Test end-to-end classification
node src/classifier.js

# Should extract features and generate proofs
```

### Test Oracle Poster

```bash
# Test blockchain connection
node src/poster.js

# Should show oracle status and balance
```

## ▶️ Step 7: Start the Service

```bash
cd news-service

# Start the service
npm start
```

You should see:
```
🚀 Initializing zkML News Service...
✅ Service initialized successfully

⏰ Running initial news cycle...
📰 Classifying: "Bitcoin price stable amid..."
✅ Proof generated in 702ms
✅ Classification posted! Block: 12345678
   BaseScan: https://sepolia.basescan.org/tx/0x...

⏰ Scheduling news cycles every 5 minutes
🌐 API server listening on http://localhost:3000

✨ Service is running! Press Ctrl+C to stop.
```

## 🎬 Step 8: Test Manual Classification (Demo Mode)

While the service is running, open a new terminal:

```bash
# Trigger manual classification
curl -X POST http://localhost:3000/api/demo/classify \
  -H "Content-Type: application/json" \
  -d '{"headline": "Bitcoin ETF approved by SEC"}'
```

Response:
```json
{
  "success": true,
  "classification": {
    "headline": "Bitcoin ETF approved by SEC",
    "sentiment": "GOOD",
    "confidence": 87,
    "proofHash": "0xabc123..."
  },
  "transaction": {
    "success": true,
    "txHash": "0xdef456...",
    "blockNumber": 12345679
  }
}
```

## 🤖 Step 9: Trigger Agent Reaction

Now manually trigger the agent to react:

1. Go to BaseScan: https://sepolia.basescan.org/address/YOUR_TRADING_AGENT_ADDRESS
2. Find the latest classification ID from NewsOracle events
3. Call `TradingAgent.reactToNews(classificationId)`
4. Watch the trade execute!

Or use cast:
```bash
cast send YOUR_TRADING_AGENT_ADDRESS \
  "reactToNews(bytes32)" \
  CLASSIFICATION_ID \
  --rpc-url https://sepolia.base.org \
  --private-key YOUR_KEY
```

## ✅ Verification

Check everything is working:

1. **Oracle is posting:**
   - Check BaseScan for NewsClassified events
   - https://sepolia.basescan.org/address/YOUR_ORACLE_ADDRESS#events

2. **Agent is trading:**
   - Check TradingAgent for TradeExecuted events
   - https://sepolia.basescan.org/address/YOUR_AGENT_ADDRESS#events

3. **Portfolio updates:**
   - Call `TradingAgent.getPortfolio()`
   - Should show changing WETH/USDC balances

## 🐛 Troubleshooting

### "Oracle wallet has no ETH"
→ Fund your oracle wallet with Base Sepolia ETH

### "Agent not authorized for trading"
→ Make sure you called `setAgentTokenId()` on TradingAgent

### "No new news items found"
→ This is normal! RSS only updates every few minutes. Use manual trigger:
```bash
curl -X POST http://localhost:3000/api/demo/classify \
  -H "Content-Type: application/json" \
  -d '{"headline": "Test headline about Bitcoin adoption"}'
```

### "Cannot estimate gas; transaction may fail"
→ TradingAgent might not have tokens. Fund it with WETH or USDC.

### "Uniswap pool doesn't exist"
→ Base Sepolia may have limited liquidity. Check:
   - Uniswap V3 Factory on Base Sepolia
   - Available pairs at https://app.uniswap.org/ (switch to Base Sepolia)

## 💳 Step 10: Test X402 Paid Classification Service (Optional)

The service includes a paid API endpoint using X402 protocol for external consumers.

### Get Pricing Information

```bash
curl http://localhost:3000/api/pricing
```

Response:
```json
{
  "service": "zkML News Classification",
  "price": "$0.25",
  "currency": "USDC",
  "usdcAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "recipient": "0xYourOracleWalletAddress",
  "network": "Base Mainnet (Chain ID: 8453)"
}
```

### Test Without Payment (Returns HTTP 402)

```bash
curl -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{"headline": "Bitcoin price hits new high"}'
```

Response:
```json
{
  "status": 402,
  "message": "Payment Required",
  "payment": { ...pricing details... }
}
```

### Send Payment and Get Classification

1. **Send $0.25 USDC on Base Mainnet** to the recipient address shown in pricing
   - Use MetaMask, Rainbow, or any Base wallet
   - USDC Contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - Amount: `0.25` USDC

2. **Request classification with payment proof:**

```bash
curl -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{
    "headline": "Bitcoin price hits new high",
    "paymentTx": "0xYOUR_TRANSACTION_HASH_HERE"
  }'
```

Response:
```json
{
  "success": true,
  "payment": {
    "verified": true,
    "txHash": "0x...",
    "from": "0xYourAddress",
    "amount": "0.25"
  },
  "classification": {
    "headline": "Bitcoin price hits new high",
    "sentiment": "GOOD_NEWS",
    "confidence": 89,
    "proofHash": "0x..."
  }
}
```

### Access X402 Widget in UI

Visit http://localhost:3001 and click the "💳 X402 Service $0.25" widget in the top-right corner to access the payment modal.

## 🎉 Next Steps

Once everything is working:

1. **Let it run for 24 hours** - Watch autonomous classifications and trades
2. **Monitor the dashboard** - See real-time updates
3. **Test different scenarios** - Good news, bad news, neutral
4. **Try the X402 API** - Test paid classification service
5. **Integrate JOLT-Atlas** - Replace mock proofs with real zkML proofs
6. **Build custom integrations** - Use the API in your own applications

## 📚 Additional Resources

- [Architecture Deep Dive](ARCHITECTURE.md)
- [Contract API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Base Sepolia Faucet](https://sepolia.base.org/faucet)
- [BaseScan Explorer](https://sepolia.basescan.org/)
- [Uniswap V3 Docs](https://docs.uniswap.org/contracts/v3/overview)

## 🚨 Important Notes

1. **This is a testnet demo** - All tokens are testnet tokens with no real value
2. **Gas costs are real** - You need Base Sepolia ETH for transactions
3. **Proofs are currently mocked** - JOLT-Atlas integration is Phase 2
4. **Liquidity may be limited** - Base Sepolia testnet has less liquidity than mainnet

---

**Need help?** Open an issue on GitHub or check the troubleshooting section above.
