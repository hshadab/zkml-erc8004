# 🚀 Quick Start: ERC-8004 + X402 Integration

Deploy the complete ERC-8004 reputation-based dynamic pricing system in 5 minutes.

## Prerequisites

1. **Funded Base Mainnet Wallet**
   - At least 0.01 ETH for contract deployment
   - Private key in `.env` file

2. **RPC Access**
   - Alchemy, Infura, or public RPC URL
   - Add to `.env` as `BASE_MAINNET_RPC_URL`

3. **Environment Variables**
   Create `.env` file:
   ```bash
   # Required
   DEPLOYER_PRIVATE_KEY=0x...
   ORACLE_PRIVATE_KEY=0x...        # Same as deployer or separate
   BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

   # Optional (for Render auto-update)
   RENDER_API_KEY=rnd_...
   RENDER_SERVICE_ID=srv-...

   # Optional (for contract verification)
   BASESCAN_API_KEY=...
   ```

## Option 1: Automated Deployment (Recommended)

Run the deployment script:

```bash
./deploy-erc8004-x402-integration.sh
```

This will:
- ✅ Deploy all updated contracts to Base Mainnet
- ✅ Register oracle as ERC-8004 agent (get token ID)
- ✅ Authorize contracts in registry
- ✅ Update environment variables
- ✅ Update Render services (if configured)
- ✅ Run integration tests
- ✅ Save addresses to `deployed-addresses.json`

**Duration:** ~3-5 minutes

---

## Option 2: Manual Deployment

### Step 1: Deploy Contracts

```bash
cd contracts

# Build
forge build

# Deploy to Base Mainnet
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### Step 2: Get Contract Addresses

Check deployment output or:

```bash
cat broadcast/DeployAll.s.sol/8453/run-latest.json | jq '.transactions[] | select(.contractName) | {contract: .contractName, address: .contractAddress}'
```

### Step 3: Register Oracle

```javascript
// register-oracle.js
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

const REGISTRY_ABI = [
  'function registerAgent(string calldata capabilityType) external returns (uint256 tokenId)',
  'function authorizeContract(address contractAddress, bool authorized) external'
];

const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

// Register oracle
const tx1 = await registry.registerAgent('news_classification');
const receipt1 = await tx1.wait();
const tokenId = parseInt(receipt1.logs[0].topics[1], 16);
console.log(`Oracle Token ID: ${tokenId}`);

// Authorize oracle contract
const tx2 = await registry.authorizeContract(ORACLE_ADDRESS, true);
await tx2.wait();
console.log('Oracle authorized');
```

### Step 4: Update Environment Variables

Add to `.env`:

```bash
ORACLE_TOKEN_ID=1
ZKML_VERIFICATION_REGISTRY=0x...
NEWS_ORACLE_ADDRESS=0x...
NEWS_VERIFIER_ADDRESS=0x...
TRADING_AGENT_ADDRESS=0x...
GROTH16_VERIFIER=0x...
```

### Step 5: Deploy Services

**Local testing:**
```bash
cd news-service
npm install
npm start
```

**Render deployment:**

Go to https://dashboard.render.com/ and:
1. Update environment variables with new addresses
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait ~2-3 minutes for deployment

---

## Verification

### Test X402 Discovery Endpoint

```bash
curl https://trustlessdefi.onrender.com/.well-known/payment | jq .

# Should return:
{
  "protocol": "x402",
  "payment": {
    "price": 0.25,
    "dynamic_pricing": true,
    "reputation_tier": "standard"
  },
  "oracle": {
    "token_id": 1,
    "erc8004_registry": "0x...",
    "pricing_tiers": { ... }
  }
}
```

### Test Dynamic Pricing

```bash
curl https://trustlessdefi.onrender.com/api/pricing | jq .

# Should return:
{
  "service": "zkML News Classification",
  "price": "$0.25",
  "reputationTier": "standard",
  "oracleTokenId": 1,
  "features": [
    "JOLT-Atlas zkML inference",
    "Groth16 proof generation",
    "On-chain verifiable results",
    "Instant delivery",
    "Reputation-based dynamic pricing"
  ]
}
```

### Check On-Chain Reputation

```javascript
const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
const registry = new ethers.Contract(
  REGISTRY_ADDRESS,
  ['function getReputationScore(uint256, string) view returns (uint256)'],
  provider
);

const reputation = await registry.getReputationScore(1, 'news_classification');
console.log(`Reputation: ${reputation}/1000`);
```

---

## What's Different?

### Before Integration:
```
User pays $0.25 → Classification posted → No payment tracking
Oracle reputation: +10 per correct prediction
Price: Fixed at $0.25
```

### After Integration:
```
User pays $0.25 → Classification posted with payment metadata
                → Payment recorded on-chain
                → Oracle reputation: +15 per correct paid prediction
                → Dynamic price adjusts based on reputation

Reputation 900+: $0.15 (40% discount, attracts volume)
Reputation 700+: $0.20 (20% discount)
Reputation 500+: $0.25 (base price)
Reputation 300+: $0.40 (60% markup)
Reputation <300: $1.00 (300% markup)
```

---

## Troubleshooting

### Issue: Deployment fails with "Out of Gas"

**Fix:** Increase gas limit in deployment script or fund wallet with more ETH.

### Issue: Oracle not authorized

**Fix:**
```javascript
await registry.authorizeContract(oracleAddress, true);
```

### Issue: Dynamic pricing not updating

**Check logs:**
```bash
render logs --tail=100 YOUR_SERVICE_ID | grep "pricing"
```

**Fix:** Ensure `ORACLE_TOKEN_ID` and `ZKML_VERIFICATION_REGISTRY` are set correctly.

### Issue: Paid classifications not recorded

**Check:** Oracle contract must be authorized in registry:
```javascript
const authorized = await registry.authorizedContracts(oracleAddress);
console.log(`Authorized: ${authorized}`); // Should be true
```

---

## Next Steps

1. **Fund Wallets**
   - Send 0.01 ETH to oracle wallet for gas
   - Send 25 USDC to trading agent for trades

2. **Test Paid Classification**
   - Send 0.25 USDC to oracle wallet
   - Call `/api/classify` with payment tx hash
   - Check PaymentRecorded event on BaseScan

3. **Monitor Growth**
   - Watch reputation score increase
   - See price tier adjust dynamically
   - Track payment statistics on-chain

4. **Scale Up**
   - Add more users
   - Build reputation to 700+ (proven tier)
   - Benefit from increased volume at lower price

---

## Resources

- **Full Guide:** `ERC8004_X402_INTEGRATION_GUIDE.md`
- **Architecture:** `ERC8004_X402_INTEGRATION_ANALYSIS.md`
- **Quick Reference:** `ERC8004_QUICK_REFERENCE.md`
- **Deployed Addresses:** `deployed-addresses.json` (created after deployment)

---

## Support

If you encounter issues:

1. Check logs: `render logs --tail=100`
2. Verify environment variables are set
3. Ensure contracts are deployed and authorized
4. Test with curl commands above

**Happy building!** 🚀
