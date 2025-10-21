# Base Mainnet Deployment Guide

Complete guide for deploying the zkML Trading System to Base Mainnet.

## Prerequisites

### 1. Wallet Setup ✅
- **Oracle Wallet Address**: `0x4ef498973F8927c89c43830Ca5bB428b20000d2D`
- **Private Key**: Stored in `.env` files (new secure wallet after compromise)
- **Status**: Configured in all .env files

### 2. Funding Required

**Total Required**: **0.06 ETH (~$108)**

| Purpose | Amount | USD Equivalent |
|---------|--------|----------------|
| Contract Deployment | 0.03 ETH | ~$54 |
| Initial Operations | 0.02 ETH | ~$36 |
| Buffer | 0.01 ETH | ~$18 |

**Per Trade Cycle**: 0.002-0.006 ETH ($2-10)

### 3. Get ETH on Base Mainnet

**Option A: Buy Directly on Coinbase**
1. Buy ETH on Coinbase
2. Send to Base network (free transfer)
3. Wallet address: `0x4ef498973F8927c89c43830Ca5bB428b20000d2D`

**Option B: Bridge from Ethereum**
1. Use Base Bridge: https://bridge.base.org
2. Bridge ETH from Ethereum Mainnet to Base

**Option C: Buy on Exchange and Withdraw**
1. Buy ETH on exchange (Coinbase, Kraken, etc.)
2. Withdraw directly to Base network
3. Address: `0x4ef498973F8927c89c43830Ca5bB428b20000d2D`

## Deployment Steps

### Step 1: Verify Configuration

Check that all .env files have the new secure wallet:

```bash
# Check news-service/.env
grep "ORACLE_PRIVATE_KEY" news-service/.env

# Check contracts/.env
grep "DEPLOYER_PRIVATE_KEY" contracts/.env

# Check trading-service/.env
grep "ORACLE_PRIVATE_KEY" trading-service/.env

# Check ui/.env
grep "POLYGON_ORACLE" ui/.env  # Will update to BASE_ORACLE after deployment
```

**Expected**: All should show the new private key starting with `0x24f49321...`

### Step 2: Fund Wallet

Send **0.06 ETH** to: `0x4ef498973F8927c89c43830Ca5bB428b20000d2D`

Verify funding:
```bash
cast balance 0x4ef498973F8927c89c43830Ca5bB428b20000d2D --rpc-url https://mainnet.base.org
```

Should show: `60000000000000000` (0.06 ETH in wei)

### Step 3: Deploy Contracts to Base Mainnet

```bash
cd contracts

# Run deployment script
forge script script/DeployBase.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY

# Save deployment addresses
# The script will output all contract addresses
```

**Expected Output:**
```
========================================
DEPLOYMENT SUMMARY
========================================
Groth16Verifier:        0x...
NewsVerifier:           0x...
VerificationRegistry:   0x...
NewsOracle:             0x...
TradingAgentBase:       0x...
========================================
```

### Step 4: Update Configuration Files

Update the following files with deployed contract addresses:

#### `news-service/.env`
```bash
# Update these lines:
BASE_MAINNET_RPC_URL=https://mainnet.base.org
ORACLE_PRIVATE_KEY=0x24f49321aff04c4cfb5840a330bc15e4f7a8ee86cbee2aa0d274228a199b41a7

NEWS_ORACLE_CONTRACT_ADDRESS=<NewsOracle address from deployment>
VERIFICATION_REGISTRY_ADDRESS=<VerificationRegistry address>
TRADING_AGENT_ADDRESS=<TradingAgentBase address>
NEWS_VERIFIER_ADDRESS=<NewsVerifier address>
GROTH16_VERIFIER=<Groth16Verifier address>

# Remove Polygon configuration
# POLYGON_RPC_URL=...
# POLYGON_ORACLE=...
# POLYGON_AGENT=...
```

#### `ui/.env`
```bash
# Replace Polygon with Base:
BASE_MAINNET_RPC_URL=https://mainnet.base.org
ZKML_VERIFICATION_REGISTRY=<VerificationRegistry address>
NEWS_ORACLE_ADDRESS=<NewsOracle address>
NEWS_VERIFIER_ADDRESS=<NewsVerifier address>
TRADING_AGENT_ADDRESS=<TradingAgentBase address>
GROTH16_VERIFIER_ADDRESS=<Groth16Verifier address>
```

#### `contracts/.env`
```bash
# Base Mainnet deployment config
BASE_MAINNET_RPC_URL=https://mainnet.base.org
DEPLOYER_PRIVATE_KEY=0x24f49321aff04c4cfb5840a330bc15e4f7a8ee86cbee2aa0d274228a199b41a7
ORACLE_PRIVATE_KEY=0x24f49321aff04c4cfb5840a330bc15e4f7a8ee86cbee2aa0d274228a199b41a7

# Contract addresses (from deployment)
ZKML_VERIFICATION_REGISTRY=<address>
NEWS_CLASSIFICATION_ORACLE=<address>
TRADING_AGENT_ADDRESS=<address>
NEWS_VERIFIER_ADDRESS=<address>
GROTH16_VERIFIER=<address>

# Network
CHAIN_ID=8453
```

### Step 5: Update UI for Base

Update the following UI files:

#### `ui/server.js` - Update RPC and contract addresses
```javascript
// Change from Polygon to Base
const BASE_RPC = process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org';
const REGISTRY_ADDRESS = process.env.ZKML_VERIFICATION_REGISTRY;
const ORACLE_ADDRESS = process.env.NEWS_ORACLE_ADDRESS;
const AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS;

// Update explorer URLs
const EXPLORER_BASE = 'https://basescan.org';
```

#### `ui/public/index.html` - Update network references
- Change "Polygon" → "Base"
- Update chain ID: 137 → 8453
- Update native token: "POL" → "ETH"
- Update explorer links to basescan.org

### Step 6: Update News Service

Update `news-service/src/index.js`:

```javascript
// Change from PolygonTrader to BaseTrader
const BaseTrader = require('./baseTrader');

// Initialize trader
const trader = new BaseTrader({
  rpcUrl: process.env.BASE_MAINNET_RPC_URL,
  privateKey: process.env.ORACLE_PRIVATE_KEY,
  oracleAddress: process.env.NEWS_ORACLE_CONTRACT_ADDRESS,
  agentAddress: process.env.TRADING_AGENT_ADDRESS,
  registryAddress: process.env.VERIFICATION_REGISTRY_ADDRESS
});

// Start listening
await trader.startListening();
```

### Step 7: Fund Trading Agent

Send initial WETH/USDC to trading agent for operations:

```bash
# The deployment script automatically sends 0.01 ETH to the agent
# You may need to wrap some ETH to WETH and swap for USDC

# Optional: Add more USDC for trading
# 1. Wrap ETH to WETH on Base
# 2. Swap some WETH for USDC on Uniswap V3
# 3. Transfer to agent address
```

### Step 8: Test Deployment

```bash
# Terminal 1: Start News Service
cd news-service
npm install
node src/index.js

# Terminal 2: Start UI Server
cd ui
npm install
node server.js

# Terminal 3: Check logs
tail -f logs/news-service.log
tail -f logs/ui-server.log
```

**Expected Output:**
```
🔷 BaseTrader initialized
   Oracle: 0x...
   Agent: 0x...
   Wallet: 0x4ef498973F8927c89c43830Ca5bB428b20000d2D
🎧 Starting to listen for Base Mainnet trading signals...
✅ BaseTrader is now listening for events on Base Mainnet
```

### Step 9: Verify System

1. **Check UI**: http://localhost:3001
   - Should show "Base Mainnet" network
   - Contract addresses should be populated
   - Recent trades section should be empty

2. **Check Wallet Balance**:
   ```bash
   cast balance 0x4ef498973F8927c89c43830Ca5bB428b20000d2D --rpc-url https://mainnet.base.org
   ```

3. **Check Agent Portfolio**:
   ```bash
   cast call $TRADING_AGENT_ADDRESS "getPortfolio()(uint256,uint256)" --rpc-url https://mainnet.base.org
   ```

4. **Trigger Test Classification**:
   - News service will automatically classify new RSS feed items
   - Watch logs for classification and trading activity

### Step 10: Monitor Operations

**Logs to Watch:**
- `logs/news-service.log` - Classification and trading events
- `logs/ui-server.log` - UI server activity
- BaseScan: https://basescan.org/address/YOUR_AGENT_ADDRESS

**Key Metrics:**
- Classifications per hour: ~1-5 (depends on news frequency)
- Trades per hour: ~0-2 (only on high-confidence news)
- Gas cost per trade: ~0.002-0.006 ETH ($2-10)

## Network Information

### Base Mainnet
- **Chain ID**: 8453
- **RPC URL**: https://mainnet.base.org
- **Explorer**: https://basescan.org
- **Native Token**: ETH
- **Block Time**: ~2 seconds

### Uniswap V3 Contracts (Base)
- **SwapRouter**: `0x2626664c2603336E57B271c5C0b26F421741e481`
- **Factory**: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`
- **WETH**: `0x4200000000000000000000000000000000000006`
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Pool Fee**: 500 (0.05%)

### Liquidity
- WETH/USDC Pool: **$50M+ TVL**
- Daily Volume: **$100M+**
- Slippage: <0.1% for trades under $10,000

## Troubleshooting

### Wallet Has Insufficient Balance
```bash
# Check balance
cast balance 0x4ef498973F8927c89c43830Ca5bB428b20000d2D --rpc-url https://mainnet.base.org

# Fund wallet
# Send 0.06 ETH to 0x4ef498973F8927c89c43830Ca5bB428b20000d2D
```

### Deployment Failed
```bash
# Check gas price
cast gas-price --rpc-url https://mainnet.base.org

# Retry with higher gas
forge script script/DeployBase.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --gas-price 1000000 \
  --priority-gas-price 100000
```

### Agent Not Trading
1. Check agent has USDC balance
2. Verify news classifications are happening
3. Check confidence threshold (min 60%)
4. View logs: `tail -f logs/news-service.log`

### UI Not Loading
1. Check .env addresses are correct
2. Restart UI server: `node server.js`
3. Check browser console for errors

## Security Reminders

1. **NEVER** commit `.env` files with real private keys
2. **NEVER** push private keys to GitHub
3. **ALWAYS** use the new secure wallet (`0x24f49...`)
4. **DO NOT** use the old compromised wallet (`0x1f409...`)

## Cost Tracking

| Operation | Cost (ETH) | Cost (USD) |
|-----------|-----------|------------|
| Initial Deployment | 0.03 | $54 |
| Classification | 0.001-0.003 | $2-5 |
| Trade Execution | 0.002-0.006 | $4-10 |
| Trade Evaluation | 0.0005-0.001 | $1-2 |
| **Total per cycle** | **0.004-0.010** | **$7-17** |

**Monthly Estimate** (30 trades/month):
- Gas costs: 0.12-0.30 ETH ($216-540)
- Total operational cost: ~$400/month

## Next Steps

After successful deployment:

1. ✅ Archive Polygon deployment files
2. ✅ Update all documentation references
3. ✅ Test full classification → trading → evaluation cycle
4. ✅ Monitor first 24 hours of operation
5. ✅ Optimize trade parameters based on results

---

**Deployment Status**: Ready to deploy after wallet funding

**Required**: Send 0.06 ETH to `0x4ef498973F8927c89c43830Ca5bB428b20000d2D`
