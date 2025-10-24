# New Deployment - Base Mainnet
**Date:** October 24, 2025
**Deployer/Oracle:** 0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9 (NEW SECURE WALLET)

---

## ✅ Deployed Contract Addresses

| Contract | Address | Status |
|----------|---------|--------|
| **Groth16Verifier** | `0x8037baea7F82A1CDEcb076C232E26257DEadD00d` | ✅ Deployed |
| **NewsVerifier** | `0xe7EC788d95e67c6ddb888A2d18fBa6151f59E202` | ✅ Deployed |
| **ZkMLVerificationRegistry** | `0x6991dce2152D2b24E8D33132F7ce2ed000F9333c` | ✅ Deployed |
| **NewsClassificationOracle** | `0x9f3bE0d8f6FE5472605307eE2bcA54cf796A7436` | ✅ Deployed |
| **TradingAgentBase** | `0x7e31e8aC345a3852DA6Fa175A49c5f3CB786f1a2` | ✅ Deployed |

---

## 🔧 Render Environment Variables

Update these in Render Dashboard → trustlessdefi → Environment:

```bash
# Oracle Wallet (NEW - already updated)
ORACLE_PRIVATE_KEY=0xc7cf100767aac9ba157d7023ac135d54de55e639ba204c711192cf058ce0cb28

# Contract Addresses (NEW DEPLOYMENT)
NEWS_ORACLE_CONTRACT_ADDRESS=0x9f3bE0d8f6FE5472605307eE2bcA54cf796A7436
NEWS_ORACLE_ADDRESS=0x9f3bE0d8f6FE5472605307eE2bcA54cf796A7436
VERIFICATION_REGISTRY_ADDRESS=0x6991dce2152D2b24E8D33132F7ce2ed000F9333c
ZKML_VERIFICATION_REGISTRY=0x6991dce2152D2b24E8D33132F7ce2ed000F9333c
TRADING_AGENT_ADDRESS=0x7e31e8aC345a3852DA6Fa175A49c5f3CB786f1a2
NEWS_VERIFIER_ADDRESS=0xe7EC788d95e67c6ddb888A2d18fBa6151f59E202
GROTH16_VERIFIER=0x8037baea7F82A1CDEcb076C232E26257DEadD00d
GROTH16_VERIFIER_ADDRESS=0x8037baea7F82A1CDEcb076C232E26257DEadD00d

# Uniswap V3 (Base Mainnet - unchanged)
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
WETH_ADDRESS=0x4200000000000000000000000000000000000006
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

---

## 💰 Funding Required

### 1. Oracle Wallet (for gas)
**Address:** `0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9`
**Amount:** 0.005-0.01 ETH (~$19.50-$39)
**Purpose:** Pay gas for posting classifications and evaluating trades

### 2. Trading Agent (for trading)
**Address:** `0x7e31e8aC345a3852DA6Fa175A49c5f3CB786f1a2`
**Amount:** $20-50 USDC
**Purpose:** Execute trades based on news sentiment

**How to send USDC:**
```bash
# Use MetaMask or similar
Network: Base Mainnet
Token: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
To: 0x7e31e8aC345a3852DA6Fa175A49c5f3CB786f1a2
Amount: 20-50 USDC
```

---

## 🚀 Next Steps

### Step 1: Update Render Environment Variables
1. Go to https://dashboard.render.com/
2. Service: **trustlessdefi**
3. Tab: **Environment**
4. Update ALL contract addresses above
5. Click **Save Changes**

### Step 2: Also Update Worker Service
1. Service: **zkml-base-trader**
2. Tab: **Environment**
3. Update same variables
4. Click **Save Changes**

### Step 3: Wait for Redeploy
- Render will automatically redeploy (2-5 minutes)
- Both services need to restart

### Step 4: Fund Oracle Wallet
Send **0.005-0.01 ETH** to:
```
0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9
```
Network: Base Mainnet

### Step 5: Fund Trading Agent
Send **20-50 USDC** to:
```
0x7e31e8aC345a3852DA6Fa175A49c5f3CB786f1a2
```
Network: Base Mainnet
Token: USDC

### Step 6: Verify
Check https://trustlessdefi.onrender.com/ for new activity!

---

## 📊 Comparison: Old vs New

| Item | Old (Compromised) | New (Secure) |
|------|------------------|--------------|
| **Oracle Wallet** | 0x4E3e...afb4 ❌ | 0x3818...ead9 ✅ |
| **NewsOracle** | 0xe92c...073EFb6 | 0x9f3b...796A7436 |
| **TradingAgent** | 0x0D43...918A122B | 0x7e31...786f1a2 |
| **Registry** | 0x909f...367555b07 | 0x6991...000F9333c |
| **NewsVerifier** | 0x0590...FD01ceba | 0xe7EC...f59E202 |
| **Groth16Verifier** | 0xebE0...092168 | 0x8037...DEadD00d |

---

## ✅ Deployment Status

- [x] Contracts compiled
- [x] Contracts deployed to Base Mainnet
- [ ] Render environment variables updated (YOU DO THIS)
- [ ] Oracle wallet funded (YOU DO THIS)
- [ ] Trading agent funded with USDC (YOU DO THIS)
- [ ] Service verified working

---

## 🔗 Useful Links

**BaseScan (Block Explorer):**
- Oracle Wallet: https://basescan.org/address/0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9
- NewsOracle: https://basescan.org/address/0x9f3bE0d8f6FE5472605307eE2bcA54cf796A7436
- TradingAgent: https://basescan.org/address/0x7e31e8aC345a3852DA6Fa175A49c5f3CB786f1a2

**Dashboard:**
- https://trustlessdefi.onrender.com/

**Render:**
- https://dashboard.render.com/

---

**All contracts use the NEW secure wallet and will work properly once funded!**
