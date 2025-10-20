# Base Mainnet - Quick Start (5-Minute Checklist)

## What You Need
- [ ] 0.5 ETH on Base Mainnet (~$1,500)
- [ ] Private key with funds
- [ ] Base Mainnet RPC URL (https://mainnet.base.org)

---

## 5 Commands to Deploy

### 1. Deploy Contracts (2 min)
```bash
cd /home/hshadab/zkml-erc8004/contracts

# Add to .env:
# DEPLOYER_PRIVATE_KEY=0x...
# BASE_MAINNET_RPC_URL=https://mainnet.base.org

forge script script/DeployComplete.s.sol:DeployComplete \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

📝 **SAVE THE ADDRESSES PRINTED!**

### 2. Fund TradingAgent (30 sec)
```bash
AGENT=0xYOUR_AGENT_ADDRESS_FROM_STEP_1

cast send $AGENT --value 0.1ether \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### 3. Update news-service .env (1 min)
```bash
cd /home/hshadab/zkml-erc8004/news-service

# Edit .env with deployed addresses from Step 1:
# NEWS_ORACLE_CONTRACT_ADDRESS=0x...
# TRADING_AGENT_ADDRESS=0x...
# VERIFICATION_REGISTRY_ADDRESS=0x...
# etc.
```

### 4. Test One Classification (30 sec)
```bash
node src/testRealArticle.js "Bitcoin ETF Approved by SEC"

# Copy the classification ID from output
```

### 5. Execute Trade (30 sec)
```bash
# Create and run test trade script from the guide
node testMainnetTrade.js 0xCLASSIFICATION_ID_FROM_STEP_4
```

---

## ✅ Success Looks Like

```
🚀 Executing trade on Base Mainnet...
   📤 TX submitted: 0x...
   ✅ Trade executed! Gas used: 287543
   🔗 https://basescan.org/tx/0x...

📊 Trade Details:
   Action: BUY_ETH
   Amount In: 0.01 ETH
   Amount Out: 32.45 USDC

✅ SUCCESS! Your zkML trading agent is live!
```

---

## Cost Summary

| Item | Amount |
|------|--------|
| Deploy contracts | ~0.01 ETH ($30) |
| Trading capital | 0.1 ETH ($300) |
| Per classification | ~0.001 ETH ($3) |
| Per trade | ~0.002 ETH ($6) |
| **TOTAL to start** | **~0.5 ETH ($1,500)** |

---

## Monitor Your Agent

Archived note: For current Polygon usage, see POLYGON_README.md. The sections below may reference Base Sepolia and are kept for historical context.

**View on BaseScan:**
```
https://basescan.org/address/YOUR_TRADING_AGENT_ADDRESS
```

**Start automated service:**
```bash
cd /home/hshadab/zkml-erc8004/news-service
npm start
```

---

## Emergency Stop

```bash
cast send $TRADING_AGENT_ADDRESS "pause()" \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## 📖 Full Guide

See [DEPLOY_TO_MAINNET_GUIDE.md](./DEPLOY_TO_MAINNET_GUIDE.md) for detailed instructions, troubleshooting, and safety checklist.
