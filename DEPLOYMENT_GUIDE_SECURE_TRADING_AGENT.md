# Deployment Guide: Secure Trading Agent with Security Fixes

## Overview

This guide walks you through deploying the new `TradingAgentBase` contract with all security fixes:
- ✅ Access control (onlyAuthorized)
- ✅ Slippage protection (1% default)
- ✅ Chainlink price oracles
- ✅ Stop-loss mechanism (10% default)

---

## Prerequisites

1. **Foundry installed** (`forge --version`)
2. **Base Mainnet RPC** (Alchemy recommended)
3. **Deployer wallet** with ETH for gas (~0.01 ETH)
4. **Existing contracts** deployed (Oracle, Registry, etc.)

---

## Step 1: Prepare Environment

### Update `contracts/.env`

Ensure you have these variables set:

```bash
# RPC (use full Alchemy URL)
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_FULL_API_KEY

# Wallet (deployer = owner)
DEPLOYER_PRIVATE_KEY=0x...
ORACLE_PRIVATE_KEY=0x...  # Same as deployer for now
ORACLE_ADDRESS=0x...       # Your backend wallet address

# Existing contracts
NEWS_ORACLE_ADDRESS=0x5569373A599B34f644Dd16B52184820787Dcf07F
ZKML_VERIFICATION_REGISTRY=0x1d935B8083D5B337bF4C4BD76211882E1141F82C

# Uniswap V3 (Base Mainnet)
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
WETH_ADDRESS=0x4200000000000000000000000000000000000006
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Chainlink Price Feeds (Base Mainnet) - OPTIONAL
# Leave blank or set to 0x0000000000000000000000000000000000000000 to disable
ETH_USD_PRICE_FEED=0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70
USDC_USD_PRICE_FEED=0x7e860098F58bBFC8648a4311b374B1D669a2bc6B
```

**Chainlink Price Feeds on Base Mainnet:**
- ETH/USD: `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`
- USDC/USD: `0x7e860098F58bBFC8648a4311b374B1D669a2bc6B`

If you don't set these, the contract will use `address(0)` and fallback to hardcoded $3,000 ETH price.

---

## Step 2: Deploy New TradingAgentBase

```bash
cd /home/hshadab/zkml-erc8004/contracts

# Deploy the contract
forge script script/DeployTradingAgentOnly.s.sol:DeployTradingAgentOnly \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://base.blockscout.com/api \
  -vvv
```

### Expected Output:

```
========================================
DEPLOY TRADING AGENT ONLY
========================================
Deployer: 0x0aBc756976d67D8BC72a7e45A506C433b1C01c0a
Chain ID: 8453

Using existing contracts:
  NewsOracle: 0x5569373A599B34f644Dd16B52184820787Dcf07F
  Registry: 0x1d935B8083D5B337bF4C4BD76211882E1141F82C
  Uniswap Router: 0x2626664c2603336E57B271c5C0b26F421741e481
  ETH/USD Feed: 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70
  USDC/USD Feed: 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B

Deploying TradingAgentBase with security features...
  - Access control (onlyAuthorized)
  - Slippage protection (1% default)
  - Chainlink price oracles
  - Stop-loss mechanism (10% default)

   TradingAgent: 0xNEW_ADDRESS_HERE

========================================
DEPLOYMENT COMPLETE
========================================
TradingAgent: 0xNEW_ADDRESS_HERE
Owner: 0x0aBc756976d67D8BC72a7e45A506C433b1C01c0a
```

**📝 SAVE THE NEW ADDRESS:** `0xNEW_ADDRESS_HERE`

---

## Step 3: Authorize Backend Wallet

The backend service needs permission to trigger trades and record validations.

```bash
# Update .env with new address first
export TRADING_AGENT_ADDRESS=0xNEW_ADDRESS_HERE

# Run authorization script
forge script script/AuthorizeBackend.s.sol:AuthorizeBackend \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  -vvv
```

### Expected Output:

```
========================================
AUTHORIZE BACKEND SERVICE
========================================

Contract addresses:
  TradingAgent: 0xNEW_ADDRESS_HERE
  Registry: 0x1d935B8083D5B337bF4C4BD76211882E1141F82C
  Backend/Oracle: 0x0aBc756976d67D8BC72a7e45A506C433b1C01c0a

1. Authorizing backend to trigger trades...
   ✅ Backend authorized for trading

2. Authorizing backend as validator...
   ✅ Backend authorized as validator

3. Verifying authorizations...
   Trading caller authorized: true
   Registry validator authorized: true

4. Trading Agent Configuration:
   Min Oracle Reputation: 50
   Min Confidence: 60
   Trade Percentage: 10 %
   Max Slippage: 100 bps
   Stop Loss: 1000 bps
   Is Paused: false

========================================
AUTHORIZATION COMPLETE
========================================

✅ Backend can now:
   - Trigger trades via reactToNews()
   - Record validations in registry
```

---

## Step 4: Fund the Trading Agent

The new contract needs ETH/WETH to execute trades:

```bash
# Send ETH to the contract (e.g., 0.01 ETH)
cast send 0xNEW_ADDRESS_HERE \
  --value 0.01ether \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Verify balance
cast balance 0xNEW_ADDRESS_HERE --rpc-url $BASE_MAINNET_RPC_URL
```

---

## Step 5: Update Render Environment Variables

Go to your Render dashboard: https://dashboard.render.com

### Update Environment Variable:

```
Key: TRADING_AGENT_ADDRESS
Value: 0xNEW_ADDRESS_HERE  # Replace with your new address
```

### Click "Save Changes"

Render will automatically redeploy with the new address.

---

## Step 6: Verify Deployment

### Check Contract on Basescan:

https://basescan.org/address/0xNEW_ADDRESS_HERE

Verify:
- ✅ Contract is verified
- ✅ Constructor parameters show Chainlink feeds
- ✅ Owner is your deployer address

### Test Authorization:

```bash
# Check if backend is authorized
cast call 0xNEW_ADDRESS_HERE \
  "authorizedCallers(address)(bool)" \
  $ORACLE_ADDRESS \
  --rpc-url $BASE_MAINNET_RPC_URL

# Should return: true
```

### Check Configuration:

```bash
# Get trading parameters
cast call 0xNEW_ADDRESS_HERE "minOracleReputation()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL
cast call 0xNEW_ADDRESS_HERE "minConfidence()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL
cast call 0xNEW_ADDRESS_HERE "tradePercentage()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL
cast call 0xNEW_ADDRESS_HERE "maxSlippageBps()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL
cast call 0xNEW_ADDRESS_HERE "stopLossBps()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL
```

---

## Step 7: Test Trading Workflow

Once Render redeploys, test the full workflow:

1. **Wait for next news cycle** (every 5 minutes)
2. **Watch Render logs** for trade execution
3. **Check Basescan** for transactions
4. **Monitor dashboard** at your Render URL

### Expected Log Flow:

```
📰 Classifying: "Bitcoin Surges Past $100k..."
✅ Classification complete: GOOD (85%)
📤 Posting classification to oracle...
✅ Classification posted! ID: 0xabc...
🤖 Triggering TradingAgent for full demo...
✅ Autonomous trade complete! Tx: 0x123...
```

---

## Step 8: Monitor & Adjust

### View Trading Stats:

```bash
# Get trade statistics
cast call 0xNEW_ADDRESS_HERE "getTradeStats()(uint256,uint256,uint256,uint256)" \
  --rpc-url $BASE_MAINNET_RPC_URL

# Returns: (total, profitable, unprofitable, winRate)
```

### Adjust Strategy (Optional):

```bash
# Update trading parameters
cast send 0xNEW_ADDRESS_HERE \
  "updateStrategy(uint256,uint256,uint256,uint256,uint256)" \
  50 \      # minOracleReputation
  70 \      # minConfidence (raised to 70%)
  15 \      # tradePercentage (raised to 15%)
  150 \     # maxSlippageBps (raised to 1.5%)
  800 \     # stopLossBps (lowered to 8%)
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Emergency Pause (If Needed):

```bash
# Pause all trading
cast send 0xNEW_ADDRESS_HERE \
  "setPaused(bool)" \
  true \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Resume trading
cast send 0xNEW_ADDRESS_HERE "setPaused(bool)" false ...
```

---

## Troubleshooting

### Error: "TradingAgent: caller is not authorized"

**Solution:** Run Step 3 again to authorize the backend wallet.

### Error: "TradingAgent: slippage too high"

**Solution:** Market is volatile. The trade will be retried on next cycle.

### Error: "TradingAgent: stop-loss threshold exceeded"

**Solution:** Portfolio has lost >10%. Pause trading and investigate.

### Trades Not Executing

**Check:**
1. Is backend authorized? (`authorizedCallers[ORACLE_ADDRESS]`)
2. Does agent have balance? (`cast balance 0xNEW_ADDRESS_HERE`)
3. Is confidence ≥60%? (Check logs)
4. Is trading paused? (`isPaused()`)

---

## Security Checklist

Before going to production with larger amounts:

- [ ] Deployer wallet secured (hardware wallet recommended)
- [ ] Multi-sig wallet for owner (Gnosis Safe)
- [ ] Stop-loss threshold configured appropriately
- [ ] Slippage tolerance not too high (max 2-3%)
- [ ] Monitoring and alerts set up
- [ ] Emergency contacts documented
- [ ] Backup plan for pausing trading
- [ ] Private keys stored in AWS Secrets Manager (see SECURITY_BEST_PRACTICES.md)

---

## Contract Addresses

### Current Deployment (OLD - No Security Fixes):
```
TradingAgent (OLD): 0x42510Ab38351EDf65D2cD7dd970622f903d9CEd5
```

### New Deployment (SECURE):
```
TradingAgent (NEW): 0xNEW_ADDRESS_HERE  # Replace after deployment
```

### Supporting Contracts (No Changes):
```
NewsOracle:         0x5569373A599B34f644Dd16B52184820787Dcf07F
Registry:           0x1d935B8083D5B337bF4C4BD76211882E1141F82C
UniswapV3 Router:   0x2626664c2603336E57B271c5C0b26F421741e481
WETH:               0x4200000000000000000000000000000000000006
USDC:               0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
ETH/USD Feed:       0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70
USDC/USD Feed:      0x7e860098F58bBFC8648a4311b374B1D669a2bc6B
```

---

## Rollback Plan

If something goes wrong, revert to old contract:

```bash
# In Render dashboard, set:
TRADING_AGENT_ADDRESS=0x42510Ab38351EDf65D2cD7dd970622f903d9CEd5

# Restart service
```

Note: Old contract has no access control, so be cautious.

---

## Summary

You've deployed a secure trading agent with:
- ✅ Access control preventing unauthorized trades
- ✅ Slippage protection preventing MEV attacks
- ✅ Real-time Chainlink price feeds
- ✅ Stop-loss limiting maximum losses
- ✅ Comprehensive NatSpec documentation
- ✅ Emergency pause mechanism

**Next:** Monitor performance and adjust parameters as needed!
