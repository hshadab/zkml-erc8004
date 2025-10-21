# Migration to Base Mainnet - Funding & Plan

## 💰 FUNDING REQUIREMENTS

### Gas Cost Calculation (Base Mainnet)
Current Base gas prices: 0.001-0.1 Gwei (very low)
ETH price: ~$1,800

### Total ETH Needed: **0.06 ETH (~$108)**

#### Breakdown:

| Purpose | Gas Units | Cost @ 0.1 Gwei | Cost @ 1 Gwei | ETH Needed |
|---------|-----------|-----------------|---------------|------------|
| **Deployment (One-time)** |
| Groth16Verifier | 3,000,000 | $0.54 | $5.40 | 0.003 ETH |
| VerificationRegistry | 2,500,000 | $0.45 | $4.50 | 0.0025 ETH |
| NewsVerifier | 3,500,000 | $0.63 | $6.30 | 0.0035 ETH |
| NewsOracle | 4,000,000 | $0.72 | $7.20 | 0.004 ETH |
| TradingAgent | 2,000,000 | $0.36 | $3.60 | 0.002 ETH |
| **Deployment Subtotal** | **15,000,000** | **$2.70** | **$27.00** | **0.015 ETH** |
| **Operating Costs (Buffer)** |
| First 10 classifications | 5,000,000 | $0.90 | $9.00 | 0.005 ETH |
| First 10 trades | 4,820,000 | $0.87 | $8.70 | 0.00482 ETH |
| First 10 evaluations | 1,000,000 | $0.18 | $1.80 | 0.001 ETH |
| First 10 WPOL wraps | 500,000 | $0.09 | $0.90 | 0.0005 ETH |
| **Operating Subtotal** | **11,320,000** | **$2.04** | **$20.40** | **0.01132 ETH** |
| **Safety Buffer (2x)** |
| Additional buffer | - | - | - | 0.03 ETH |
| **GRAND TOTAL** | **26,320,000** | **~$5** | **~$47** | **≈0.06 ETH** |

---

## 📋 WALLETS TO FUND

### 1. Oracle/Deployer Wallet
**Address**: (from `ORACLE_PRIVATE_KEY` in your .env)

**Needs**: **0.06 ETH** on Base Mainnet

**Purpose**:
- Deploy all 5 contracts (0.015 ETH)
- Post classifications to NewsOracle (ongoing)
- Execute trades through TradingAgent (ongoing)
- Evaluate trade profitability (ongoing)

**How to Fund**:
```bash
# Option 1: Bridge from Ethereum Mainnet
# Use Base Bridge: https://bridge.base.org
# Send ETH from your Ethereum wallet to same address on Base
# Bridge fee: ~$5-10, takes 1-5 minutes

# Option 2: Buy on Coinbase, withdraw to Base
# Cheapest option, direct withdrawal to Base network
# No bridge fees

# Option 3: Use a CEX that supports Base
# Binance, OKX, etc. - withdraw directly to Base
```

### 2. Trading Agent Contract
**Address**: (will be deployed, needs funding after deployment)

**Needs**: **0.05 WETH + $10 USDC** (for trading)

**Purpose**:
- Initial trading capital
- WETH for buying USDC when good news
- USDC for buying WETH when bad news

**How to Fund** (after deployment):
```bash
# Option 1: Wrap ETH to WETH
# Send 0.05 ETH to contract, then call wrap function

# Option 2: Bridge USDC from Ethereum
# Use Base Bridge to send USDC

# Option 3: Swap on Base
# Use Uniswap on Base to swap ETH → USDC
```

---

## 🎯 TOTAL FUNDING NEEDED

| Item | Amount | USD Value | How to Get |
|------|--------|-----------|------------|
| Oracle Wallet (Base ETH) | 0.06 ETH | ~$108 | Bridge or buy on Coinbase |
| Agent Capital (WETH) | 0.05 ETH | ~$90 | From oracle wallet |
| Agent Capital (USDC) | $10 USDC | $10 | Swap or bridge |
| **TOTAL** | **≈0.11 ETH** | **≈$208** | |

### Cost Breakdown:
- **One-time**: $108 (oracle wallet) + $90 (agent WETH) = **$198**
- **Ongoing**: $10 USDC trading capital (reusable)
- **Per trade cycle**: ~$2-10 (replenish from agent capital)

---

## 🚀 MIGRATION PLAN

### Phase 1: Setup & Preparation (15 min)
- [ ] Get Base Mainnet RPC URL (free from Alchemy, Infura, or QuickNode)
- [ ] Fund oracle wallet with 0.06 ETH on Base
- [ ] Create Base-specific .env files
- [ ] Update contract deployment scripts

### Phase 2: Contract Deployment (30-45 min)
- [ ] Deploy Groth16Verifier
- [ ] Deploy VerificationRegistry
- [ ] Deploy NewsVerifier
- [ ] Deploy NewsOracle
- [ ] Deploy TradingAgentBase (updated for Base DEX)

### Phase 3: Initial Funding & Setup (15 min)
- [ ] Send 0.05 ETH to TradingAgent contract
- [ ] Wrap ETH → WETH in TradingAgent
- [ ] Acquire $10 USDC for TradingAgent
- [ ] Register oracle in VerificationRegistry

### Phase 4: UI & Service Updates (30 min)
- [ ] Update UI with Base contract addresses
- [ ] Update UI with Base explorer (Basescan)
- [ ] Update news service for Base RPC
- [ ] Update trader for Base DEX (Uniswap V3)

### Phase 5: Testing (30 min)
- [ ] Test classification posting
- [ ] Test trade execution on Uniswap V3
- [ ] Test profitability evaluation
- [ ] Verify UI displays correctly

### Phase 6: Archive Polygon (15 min)
- [ ] Move Polygon files to archive folder
- [ ] Update documentation
- [ ] Commit and push changes

**Total Time**: ~2.5-3 hours

---

## 📝 BASE MAINNET DETAILS

### Network Configuration
```javascript
{
  chainId: 8453,
  name: "Base Mainnet",
  rpc: "https://base-mainnet.g.alchemy.com/v2/YOUR_KEY",
  explorer: "https://basescan.org",
  nativeToken: "ETH"
}
```

### DEX Configuration (Uniswap V3)
```solidity
// Base Mainnet addresses
UNISWAP_V3_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481
SWAP_ROUTER_02 = 0x2626664c2603336E57B271c5C0b26F421741e481
WETH = 0x4200000000000000000000000000000000000006
USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
POOL_FEE = 500 // 0.05% for WETH/USDC pool
```

### Key Differences from Polygon
| Aspect | Polygon | Base |
|--------|---------|------|
| Native Token | POL/MATIC | ETH |
| Wrapped Token | WPOL | WETH |
| DEX | QuickSwap V2 | Uniswap V3 |
| Router | V2 router | V3 router (different interface) |
| Pool Fee | 0.3% fixed | 0.05% (or 0.3%, 1%) |
| Gas Token | POL | ETH |
| Explorer | PolygonScan | BaseScan |

---

## 🔧 TECHNICAL CHANGES NEEDED

### 1. Create TradingAgentBase.sol
Need to update swap function for Uniswap V3 instead of V2:

```solidity
// Uniswap V3 uses exactInputSingle instead of swapExactTokensForTokens
function _swapV3(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) internal returns (uint256) {
    _approveToken(tokenIn, swapRouter, amountIn);

    ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: 500, // 0.05%
        recipient: address(this),
        deadline: block.timestamp + 300,
        amountIn: amountIn,
        amountOutMinimum: amountOutMin,
        sqrtPriceLimitX96: 0
    });

    uint256 amountOut = ISwapRouter(swapRouter).exactInputSingle(params);
    return amountOut;
}
```

### 2. Update Environment Variables
```bash
# Base Mainnet
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_CHAIN_ID=8453
BASE_ORACLE=<deployed_address>
BASE_REGISTRY=<deployed_address>
BASE_AGENT=<deployed_address>
ORACLE_PRIVATE_KEY=<same_as_polygon>

# Token addresses on Base
WETH_BASE=0x4200000000000000000000000000000000000006
USDC_BASE=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
```

### 3. Update UI Configuration
```javascript
// ui/server.js
const CHAIN_ID = 8453;
const RPC_URL = process.env.BASE_RPC_URL;
const EXPLORER_URL = 'https://basescan.org';
const NATIVE_TOKEN = 'ETH';
```

---

## ⚠️ IMPORTANT NOTES

### Before Starting:
1. ✅ **Backup everything** - Polygon deployment works, don't lose it yet
2. ✅ **Test on Base Sepolia first** if you want to be extra safe (FREE)
3. ✅ **Get Base RPC URL** from Alchemy/Infura before starting
4. ✅ **Have 0.06 ETH ready** on Base before deployment

### During Migration:
- Keep Polygon running until Base is fully tested
- Save all Base contract addresses
- Test each contract after deployment
- Verify contracts on Basescan for transparency

### After Migration:
- Archive Polygon deployment (don't delete)
- Update all documentation
- Monitor first few trades carefully
- Keep some ETH in oracle wallet for ongoing ops

---

## 📊 COST COMPARISON: Polygon vs Base

| Operation | Polygon Cost | Base Cost | Difference |
|-----------|--------------|-----------|------------|
| Deployment | $0.30 | $27 | +$26.70 (one-time) |
| Per Trade Cycle | $0.02 | $2 | +$1.98 |
| 100 Trades | $2 | $200 | +$198 |
| 1000 Trades | $20 | $2,000 | +$1,980 |

**Trade-off**: Pay more for Base, but get:
- ✅ ETH instead of POL (more recognizable)
- ✅ Coinbase backing (more credible)
- ✅ Better liquidity ($50M vs $5M)
- ✅ Faster growing ecosystem

---

## 🎬 READY TO START?

### Quick Checklist:
- [ ] I have 0.06 ETH on Base Mainnet in my oracle wallet
- [ ] I have a Base RPC URL from Alchemy/Infura
- [ ] I've backed up my Polygon deployment info
- [ ] I'm ready to spend 2-3 hours on migration
- [ ] I understand this will cost ~$200 total vs Polygon's $0.30

**If all checked, let's begin! I'll guide you through each step.**

### Next Steps:
1. Confirm you have funding ready
2. Confirm you have Base RPC URL
3. I'll create TradingAgentBase.sol with Uniswap V3 integration
4. I'll create deployment scripts
5. I'll update all configurations
6. We'll deploy and test
7. We'll archive Polygon setup

Ready to proceed?
