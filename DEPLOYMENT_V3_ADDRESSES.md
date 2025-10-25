# Deployment V3 - Base Mainnet (SECURE)

**Date:** October 25, 2025
**Deployer/Oracle:** `0x0aBc756976d67D8BC72a7e45A506C433b1C01c0a` (SECURE - never committed to git)

---

## ✅ Deployed Contract Addresses

| Contract | Address | Status |
|----------|---------|--------|
| **Groth16Verifier** | `0x3091e39961c170bE852C95fb4AaDf7E5D0F27d31` | ✅ Deployed |
| **NewsVerifier** | `0xFe134cEB397699fd276b1bd1439159F7b18e5819` | ✅ Deployed |
| **ZkMLVerificationRegistry** | `0x1d935B8083D5B337bF4C4BD76211882E1141F82C` | ✅ Deployed |
| **NewsClassificationOracle** | `0x5569373A599B34f644Dd16B52184820787Dcf07F` | ✅ Deployed |
| **TradingAgentBase** | `0x5F367B6A04c181530B7ed3933FE3f7CDBeb8b48A` | ✅ Deployed |

---

## 🔧 Render Environment Variables

**Update these in both services:**
- trustlessdefi (web service)
- zkml-base-trader (worker)

```bash
# Oracle Wallet (NEVER commit - get from .oracle-wallet-SECURE-v3.json)
ORACLE_PRIVATE_KEY=[GET FROM LOCAL FILE ONLY]

# Contract Addresses (V3 Deployment)
NEWS_ORACLE_CONTRACT_ADDRESS=0x5569373A599B34f644Dd16B52184820787Dcf07F
NEWS_ORACLE_ADDRESS=0x5569373A599B34f644Dd16B52184820787Dcf07F
VERIFICATION_REGISTRY_ADDRESS=0x1d935B8083D5B337bF4C4BD76211882E1141F82C
ZKML_VERIFICATION_REGISTRY=0x1d935B8083D5B337bF4C4BD76211882E1141F82C
TRADING_AGENT_ADDRESS=0x5F367B6A04c181530B7ed3933FE3f7CDBeb8b48A
NEWS_VERIFIER_ADDRESS=0xFe134cEB397699fd276b1bd1439159F7b18e5819
GROTH16_VERIFIER=0x3091e39961c170bE852C95fb4AaDf7E5D0F27d31
GROTH16_VERIFIER_ADDRESS=0x3091e39961c170bE852C95fb4AaDf7E5D0F27d31

# Uniswap V3 (Base Mainnet - unchanged)
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
WETH_ADDRESS=0x4200000000000000000000000000000000000006
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

---

## 💰 Funding Required

### 1. Oracle Wallet (for gas)
**Address:** `0x0aBc756976d67D8BC72a7e45A506C433b1C01c0a`
**Amount:** 0.005-0.01 ETH (~$19.50-$39)
**Purpose:** Pay gas for posting classifications and evaluating trades

### 2. Trading Agent (for trading)
**Address:** `0x5F367B6A04c181530B7ed3933FE3f7CDBeb8b48A`
**Amount:** $20-50 USDC
**Purpose:** Execute trades based on news sentiment

---

## 🔗 Useful Links

**BaseScan (Block Explorer):**
- Oracle Wallet: https://basescan.org/address/0x0aBc756976d67D8BC72a7e45A506C433b1C01c0a
- NewsOracle: https://basescan.org/address/0x5569373A599B34f644Dd16B52184820787Dcf07F
- TradingAgent: https://basescan.org/address/0x5F367B6A04c181530B7ed3933FE3f7CDBeb8b48A
- Registry: https://basescan.org/address/0x1d935B8083D5B337bF4C4BD76211882E1141F82C

**Dashboard:**
- https://trustlessdefi.onrender.com/

---

## 🔐 Security Notes

✅ **Private key stored ONLY in:**
- Local file `.oracle-wallet-SECURE-v3.json` (gitignored)
- Render environment variables
- Your password manager

❌ **NEVER commit private keys to:**
- Git repository
- Documentation files
- Config files
- Commit messages

---

## 📊 Previous Compromised Deployments

| Version | Oracle Address | Status | Compromised Date |
|---------|---------------|--------|------------------|
| V1 | `0x4E3eD682f723DD133252aae032D32f1Ef7EEafb4` | ❌ COMPROMISED | Oct 21, 2025 |
| V2 | `0x38187b1671324b8Ac4b2db397E1D7ac391f5ead9` | ❌ COMPROMISED | Oct 24, 2025 |
| **V3** | `0x0aBc756976d67D8BC72a7e45A506C433b1C01c0a` | ✅ **SECURE** | Active |

---

**All private keys are kept OUT of git. This deployment is SECURE!** 🔒
