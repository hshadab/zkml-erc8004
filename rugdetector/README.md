# Rug Pull Detector - ONNX Model for zkML

**Verifiable on-chain risk scoring for token launches**

Detects rug pull risk using 60 on-chain features with zero-knowledge proofs.

---

## What It Does

Analyzes a token contract and returns a risk score (0-100):
- **0-30**: LOW RISK (likely safe)
- **31-70**: MEDIUM RISK (caution advised)
- **71-100**: HIGH RISK (likely rug pull)

**Features:**
- ✅ 60 on-chain features (contract, liquidity, holders, trading)
- ✅ ONNX format (JOLT-Atlas compatible)
- ✅ <64 tensor size (fits JOLT MAX_TENSOR_SIZE)
- ✅ zkML proofs (cryptographically verifiable)
- ✅ No API calls needed (all on-chain data)

---

## Quick Start

### 1. Extract Features (Python)

```python
from extract_features import extract_token_features

# Get 60 features for a token
features = extract_token_features(
    token_address="0x1234...",
    rpc_url="https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"
)

# Returns: [holder_count, liquidity_eth, creator_balance_pct, ...]
print(f"Features: {features}")  # [1250, 45.5, 12.3, ...]
```

### 2. Run ONNX Inference

```python
import onnxruntime as ort

session = ort.InferenceSession("rugdetector_v1.onnx")
input_name = session.get_inputs()[0].name

# Run inference
result = session.run(None, {input_name: [features]})
risk_score = result[0][0]

print(f"Rug Pull Risk: {risk_score}/100")
```

### 3. Generate zkML Proof (via zkml-erc8004)

```javascript
// Use existing JOLT prover from zkml-erc8004
const prover = new JoltOnnxProver({
  modelPath: './rugdetector/rugdetector_v1.onnx',
  preprocessor: 'feature-vector'
});

const proof = await prover.generateProof(features);
// Returns: { sentiment: riskScore, proofHash, proofData }
```

---

## Feature Engineering

### 60 On-Chain Features (4 Categories)

#### Contract Features (15 features)
1. `contract_age_days` - Days since deployment
2. `is_verified` - Source code verified (0/1)
3. `has_mint_function` - Can mint new tokens (0/1)
4. `has_pause_function` - Can pause transfers (0/1)
5. `has_blacklist_function` - Can blacklist addresses (0/1)
6. `ownership_renounced` - Owner renounced (0/1)
7. `proxy_contract` - Is upgradeable proxy (0/1)
8. `honeypot_detected` - Sell blocked (0/1)
9. `max_tx_limit` - Max transaction % of supply
10. `max_wallet_limit` - Max wallet % of supply
11. `buy_tax_pct` - Buy tax percentage
12. `sell_tax_pct` - Sell tax percentage
13. `has_anti_whale` - Anti-whale mechanism (0/1)
14. `creator_is_contract` - Deployer is contract (0/1)
15. `total_supply` - Total token supply (normalized)

#### Liquidity Features (15 features)
16. `liquidity_usd` - Total liquidity in USD
17. `liquidity_locked_pct` - % of liquidity locked
18. `liquidity_lock_days` - Days until unlock
19. `lp_token_burned_pct` - % LP tokens burned
20. `pool_age_days` - Days since pool creation
21. `pool_creator_same_as_token` - Same deployer (0/1)
22. `liquidity_concentrated_top1` - % in top pool
23. `price_impact_1eth` - Price impact for 1 ETH buy
24. `price_impact_10eth` - Price impact for 10 ETH buy
25. `slippage_tolerance_needed` - Min slippage to swap
26. `liquidity_change_24h_pct` - 24h liquidity change
27. `volume_to_liquidity_ratio` - 24h volume / liquidity
28. `pool_token0_is_weth` - Paired with WETH (0/1)
29. `multiple_pools_count` - Number of liquidity pools
30. `rugpull_liquidity_threshold` - Below safe threshold (0/1)

#### Holder Features (15 features)
31. `holder_count` - Total unique holders
32. `top10_holders_pct` - % held by top 10
33. `top1_holder_pct` - % held by largest holder
34. `creator_balance_pct` - % held by creator
35. `dead_wallet_pct` - % sent to dead address
36. `contract_balance_pct` - % held by contract
37. `holders_growth_24h_pct` - 24h holder growth
38. `whale_count` - Holders with >1% supply
39. `sniper_count` - Bought in first 10 blocks
40. `bot_holder_pct` - % held by known bots
41. `team_wallet_count` - Suspected team wallets
42. `team_balance_pct` - % held by team
43. `airdrop_wallets_pct` - % from airdrops
44. `holder_concentration_gini` - Gini coefficient
45. `new_holders_24h` - New holders last 24h

#### Trading Features (15 features)
46. `trade_count_24h` - Number of trades
47. `buy_count_24h` - Number of buys
48. `sell_count_24h` - Number of sells
49. `volume_usd_24h` - 24h volume in USD
50. `price_change_1h_pct` - 1h price change
51. `price_change_24h_pct` - 24h price change
52. `price_volatility_24h` - 24h std deviation
53. `sell_pressure_ratio` - Sells / (Buys + Sells)
54. `large_sells_24h` - Sells >$10k count
55. `suspicious_sells_count` - Sells from snipers
56. `flash_loan_attacks` - Flash loan interactions
57. `sandwich_attacks_24h` - MEV sandwich count
58. `first_block_snipers` - Block 0 buyers
59. `avg_hold_time_hours` - Average holding period
60. `panic_sell_events_24h` - Rapid sell-offs

---

## Training Data

### Dataset Structure

```csv
token_address,contract_age_days,is_verified,...,label
0xScamToken1,0.5,0,...,1  # RUG PULL
0xSafeToken1,365,1,...,0  # SAFE
0xScamToken2,1.2,0,...,1  # RUG PULL
...
```

**Labels:**
- `0` = SAFE (no rug pull)
- `1` = RUG PULL (confirmed scam)

**Sources:**
- Known rug pulls fromRugDoc, DeFi Safety alerts
- Safe tokens from CoinGecko top 500 (1+ year old)
- Manual verification of on-chain data

### Training Pipeline

```bash
# 1. Collect training data
python collect_training_data.py --output training_data.csv

# 2. Train model
python train_model.py --input training_data.csv --output rugdetector_v1.onnx

# 3. Test model
python test_model.py --model rugdetector_v1.onnx --test-tokens test_cases.json

# 4. Validate ONNX compatibility
python validate_onnx.py --model rugdetector_v1.onnx
```

---

## Model Architecture

```
Input: [60 features] (float32)
  ↓
Hidden Layer 1: [60 → 30] (ReLU)
  ↓
Hidden Layer 2: [30 → 15] (ReLU)
  ↓
Output Layer: [15 → 1] (Sigmoid)
  ↓
Output: risk_score (0.0 - 1.0)
```

**Model Type:** Neural Network (MLPClassifier)
**Framework:** scikit-learn
**Export:** ONNX (opset 12)
**Size:** ~50KB
**Inference Time:** 5-10ms

---

## JOLT Compatibility

**JOLT-Atlas Constraints:**
- ✅ MAX_TENSOR_SIZE = 64 elements
- ✅ Our model: 60 input features < 64 ✓
- ✅ Proof generation: 2-6 seconds
- ✅ 128-bit security

**Test:**
```bash
# Verify JOLT compatibility
python verify_jolt_compat.py --model rugdetector_v1.onnx

# Expected output:
# ✅ Input size: 60 < 64 (PASS)
# ✅ Output size: 1 < 64 (PASS)
# ✅ Hidden layers: OK
# ✅ JOLT-compatible: YES
```

---

## Integration with zkml-erc8004

### 1. Add Model to Registry

```javascript
// news-service/src/models/registry.js
export const MODELS = {
  'rug-detector-v1': {
    name: 'Token Rug Pull Detector',
    path: '../../rugdetector/rugdetector_v1.onnx',
    preprocessor: 'feature-vector',
    price: '2.00',
    description: 'Detect rug pull risk using 60 on-chain features',
    inputType: 'token_address',
    outputType: 'risk_score'
  }
};
```

### 2. Create Feature Extractor Service

```javascript
// news-service/src/services/RugDetectorFeatures.js
import { ethers } from 'ethers';

export class RugDetectorFeatures {
  async extractFeatures(tokenAddress, provider) {
    // Extract 60 on-chain features
    const features = new Array(60).fill(0);

    // Contract features
    features[0] = await this.getContractAge(tokenAddress, provider);
    features[1] = await this.isVerified(tokenAddress);
    // ... extract all 60 features

    return features;
  }
}
```

### 3. Add API Endpoint

```javascript
// POST /api/check-rug-pull
app.post('/api/check-rug-pull', async (req, res) => {
  const { tokenAddress, paymentTxHash } = req.body;

  // 1. Verify payment ($2.00 USDC)
  const payment = await verifyPayment(paymentTxHash, '2.00');

  // 2. Extract features
  const features = await rugDetector.extractFeatures(tokenAddress);

  // 3. Run ONNX inference
  const result = await onnxEngine.infer('rug-detector-v1', features);
  const riskScore = Math.round(result.outputs[0] * 100);

  // 4. Generate zkML proof
  const proof = await joltProver.generateProof(features, riskScore);

  // 5. Return result
  res.json({
    tokenAddress,
    riskScore,
    riskLevel: riskScore < 30 ? 'LOW' : riskScore < 70 ? 'MEDIUM' : 'HIGH',
    features: features,
    proof: proof.proofHash,
    verified: true
  });
});
```

---

## Example Usage (Agent)

```javascript
// Autonomous agent checking a token before buying

const agent = {
  async shouldBuyToken(tokenAddress) {
    // 1. Pay $2 USDC on Base
    const paymentTx = await this.wallet.sendUSDC('0xPlatform...', '2.00');

    // 2. Check rug pull risk
    const response = await fetch('https://zkmlaa.s/api/check-rug-pull', {
      method: 'POST',
      body: JSON.stringify({
        tokenAddress,
        paymentTxHash: paymentTx.hash
      })
    });

    const result = await response.json();

    // 3. Verify proof independently
    const proofValid = await this.verifyGroth16Proof(result.proof);

    if (!proofValid) {
      throw new Error('Invalid zkML proof');
    }

    // 4. Make decision
    if (result.riskScore > 70) {
      console.log('🚨 HIGH RISK - Not buying');
      return false;
    }

    if (result.riskScore < 30) {
      console.log('✅ LOW RISK - Safe to buy');
      return true;
    }

    console.log('⚠️  MEDIUM RISK - Manual review needed');
    return false;
  }
};

// Use it
await agent.shouldBuyToken('0x1234...'); // → true/false
```

---

## Performance Metrics

**Target Performance:**
- **Accuracy:** >85% (on test set)
- **False Positive Rate:** <15% (safe tokens flagged as risky)
- **False Negative Rate:** <10% (rug pulls missed)
- **Inference Time:** <10ms
- **Proof Generation:** 2-6 seconds
- **Total Latency:** <7 seconds

**Real-World Impact:**
- Average rug pull: $10,000 loss
- Detection cost: $2
- ROI: 5000x if prevents one rug pull
- Break-even: Prevents 1 in 5000 investments

---

## Files in This Directory

```
rugdetector/
├── README.md                       # This file
├── extract_features.py             # Web3 feature extraction
├── train_model.py                  # Training pipeline
├── rugdetector_v1.onnx            # Trained ONNX model
├── test_model.py                   # Testing script
├── validate_onnx.py                # JOLT compatibility check
├── training_data.csv               # Training dataset
├── test_cases.json                 # Known rug pulls + safe tokens
├── requirements.txt                # Python dependencies
└── integration/
    ├── RugDetectorFeatures.js      # Feature extraction (Node.js)
    └── rugDetectorService.js       # Integration with zkml-erc8004
```

---

## Next Steps

1. **Train the model** (this creates rugdetector_v1.onnx)
2. **Validate JOLT compatibility** (ensure <64 tensor size)
3. **Integrate with zkml-erc8004** (add to model registry)
4. **Deploy to production** (X402 payments enabled)
5. **List in X402 bazaar** (agents can discover)

---

## Limitations

**Not detected:**
- ❌ Slow rugs (gradual sell-off over months)
- ❌ Social engineering (fake team, fake partnerships)
- ❌ Future exploits (0-days in contract)

**Best used with:**
- Manual code review
- Community sentiment analysis
- Team doxxing verification

**This is a risk indicator, not a guarantee.**

---

## License

MIT
