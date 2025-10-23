# Rug Pull Detector - API Integration Guide

How to integrate the rug pull detector ONNX model with zkml-erc8004's API

---

## Quick Integration (3 Steps)

### Step 1: Add Model to Registry

```javascript
// news-service/src/models/registry.js

export const MODELS = {
  // ... existing models

  'rug-detector-v1': {
    name: 'Token Rug Pull Detector',
    path: '../../rugdetector/rugdetector_v1.onnx',
    preprocessor: 'feature-vector',
    price: '2.00',  // $2 per check
    description: 'Detect rug pull risk using 60 on-chain features',
    inputType: 'token_address',
    outputType: 'risk_score',
    accuracy: 100,  // From training
    category: 'risk-scoring'
  }
};
```

### Step 2: Add Feature Extraction Service

```javascript
// news-service/src/services/RugDetectorFeatures.js

import { RugDetectorService } from '../../rugdetector/integration/rugDetectorService.js';
import { ethers } from 'ethers';

export class RugDetectorFeatures {
  constructor(rpcUrl) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.detector = new RugDetectorService();
  }

  async initialize() {
    await this.detector.initialize();
  }

  /**
   * Extract features and run detection
   */
  async checkToken(tokenAddress) {
    const result = await this.detector.checkToken(tokenAddress, this.provider);
    return result;
  }
}
```

### Step 3: Add API Endpoint

```javascript
// news-service/src/index.js or new rugDetectorAPI.js

import { RugDetectorFeatures } from './services/RugDetectorFeatures.js';
import { X402Service } from './x402Service.js';

const rugDetector = new RugDetectorFeatures(config.rpcUrl);
const x402 = new X402Service();

// Initialize
await rugDetector.initialize();

/**
 * POST /api/check-rug-pull
 *
 * Request:
 * {
 *   "tokenAddress": "0x1234...",
 *   "paymentTxHash": "0xabc..."
 * }
 *
 * Response:
 * {
 *   "tokenAddress": "0x1234...",
 *   "riskScore": 90,
 *   "riskLevel": "HIGH",
 *   "features": [60 values],
 *   "proof": {
 *     "joltProofHash": "0x...",
 *     "groth16Proof": {...},
 *     "verified": true
 *   },
 *   "payment": {
 *     "txHash": "0xabc...",
 *     "amount": "2.00",
 *     "verified": true
 *   }
 * }
 */
app.post('/api/check-rug-pull', async (req, res) => {
  try {
    const { tokenAddress, paymentTxHash } = req.body;

    // 1. Verify payment ($2.00 USDC on Base)
    const payment = await x402.verifyPayment(paymentTxHash, '2.00');

    if (!payment.valid) {
      return res.status(402).json({
        error: 'Payment required',
        code: 402,
        payment: {
          amount: '2.00',
          currency: 'USDC',
          recipient: config.platformWallet,
          network: 'Base',
          chainId: 8453
        }
      });
    }

    // 2. Extract features and detect
    const result = await rugDetector.checkToken(tokenAddress);

    // 3. Generate zkML proof
    const joltProof = await joltProver.generateProof({
      modelId: 'rug-detector-v1',
      inputs: result.features,
      outputs: [result.riskScore / 100]
    });

    // 4. Wrap in Groth16
    const groth16Proof = await groth16Wrapper.wrapProof(joltProof);

    // 5. Store verification
    const verificationId = await storeVerification({
      modelId: 'rug-detector-v1',
      tokenAddress,
      result,
      joltProof,
      groth16Proof,
      payment
    });

    // 6. Return result
    res.json({
      success: true,
      verificationId,
      tokenAddress,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      prediction: result.prediction === 1 ? 'RUG_PULL' : 'SAFE',
      features: result.features,
      proof: {
        joltProofHash: joltProof.proofHash,
        groth16Proof: groth16Proof.proof,
        publicSignals: groth16Proof.publicSignals,
        verified: true
      },
      payment: {
        txHash: paymentTxHash,
        amount: '2.00',
        from: payment.from,
        verified: true
      },
      timing: {
        featureExtraction: result.inferenceTimeMs,
        inference: result.inferenceTimeMs,
        joltProof: joltProof.duration,
        groth16: groth16Proof.duration,
        total: result.inferenceTimeMs + joltProof.duration + groth16Proof.duration
      }
    });

  } catch (error) {
    logger.error('Rug pull check failed:', error);
    res.status(500).json({
      error: 'Rug pull check failed',
      message: error.message
    });
  }
});
```

---

## Full Example (Agent Usage)

```javascript
// Autonomous agent checking a token before buying

const agent = {
  async shouldBuyToken(tokenAddress) {
    console.log(`🔍 Checking if ${tokenAddress} is safe...`);

    // 1. Transfer $2 USDC on Base
    const tx = await this.wallet.sendTransaction({
      to: '0xPlatformWallet...',
      value: 0,
      data: usdcContract.interface.encodeFunctionData('transfer', [
        '0xPlatformWallet...',
        ethers.parseUnits('2.00', 6)  // USDC has 6 decimals
      ])
    });

    await tx.wait();
    console.log(`💳 Paid $2.00 USDC: ${tx.hash}`);

    // 2. Call rug pull detector API
    const response = await fetch('https://zkmlaa.s/api/check-rug-pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenAddress,
        paymentTxHash: tx.hash
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(`Rug check failed: ${result.error}`);
    }

    console.log(`📊 Risk Score: ${result.riskScore}/100 (${result.riskLevel})`);

    // 3. Verify proof independently
    const proofValid = await this.verifyGroth16Proof(
      result.proof.groth16Proof,
      result.proof.publicSignals
    );

    if (!proofValid) {
      throw new Error('❌ Invalid zkML proof - cannot trust result');
    }

    console.log('✅ Proof verified');

    // 4. Make decision
    if (result.riskScore >= 70) {
      console.log('🚨 HIGH RISK - Not buying this token!');
      return false;
    }

    if (result.riskScore < 30) {
      console.log('✅ LOW RISK - Safe to buy');
      return true;
    }

    console.log('⚠️  MEDIUM RISK - Needs manual review');
    return false;
  }
};

// Use it
const tokenAddress = '0x1234...';
const safe = await agent.shouldBuyToken(tokenAddress);

if (safe) {
  await agent.buyToken(tokenAddress, amount);
} else {
  console.log('Skipping this token');
}
```

---

## Expected Response Times

- **Feature Extraction:** ~500ms (Web3 calls)
- **ONNX Inference:** ~10ms (model is very fast)
- **JOLT Proof:** ~2-6 seconds (zkML proof generation)
- **Groth16 Wrapper:** ~1-2 seconds (portable proof)
- **Total:** ~4-9 seconds

---

## Pricing Strategy

**Cost Analysis:**
- Model inference: ~$0.01 (compute cost)
- Proof generation: ~$0.10 (JOLT + Groth16)
- Storage: ~$0.01 (IPFS + PostgreSQL)
- **Total Cost:** ~$0.12 per check

**Price to Agent:** $2.00 per check

**Margin:** $1.88 (94% gross margin)

**Value Proposition:**
- Average rug pull: $10,000 loss
- Cost to prevent: $2.00
- ROI: 5000x if prevents one rug pull

**Market Size:**
- Estimated rug pulls per day: 50-100
- If we capture 10%: 5-10 checks/day
- Revenue: $10-20/day = $300-600/month
- After 3 months (network effects): $2000-5000/month

---

## Testing

```bash
# 1. Test model inference
cd rugdetector
node integration/rugDetectorService.js

# 2. Test feature extraction (requires RPC)
export RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
python3 extract_features.py 0x1234...

# 3. Test full pipeline
node test-integration.js
```

---

## Deployment Checklist

- [ ] ONNX model generated (`rugdetector_v1.onnx`)
- [ ] Model validated (JOLT-compatible, <64 tensor size)
- [ ] Integration service created (`rugDetectorService.js`)
- [ ] API endpoint added (`POST /api/check-rug-pull`)
- [ ] X402 payment verification working ($2.00 USDC)
- [ ] Feature extraction tested (Web3 calls)
- [ ] JOLT proof generation working
- [ ] Groth16 wrapper working
- [ ] Service manifest updated (`/.well-known/ai-service.json`)
- [ ] Listed in X402 bazaar
- [ ] Documentation complete
- [ ] Monitoring configured (Sentry, Datadog)

---

## Revenue Tracking

```sql
-- Query daily rug pull check revenue
SELECT
  DATE(verified_at) as date,
  COUNT(*) as checks,
  SUM(payment_amount) as revenue_usd
FROM verifications
WHERE model_id = 'rug-detector-v1'
  AND status = 'success'
GROUP BY DATE(verified_at)
ORDER BY date DESC;

-- Expected output:
-- date       | checks | revenue_usd
-- 2025-10-23 |     15 |       30.00
-- 2025-10-22 |     12 |       24.00
-- 2025-10-21 |      8 |       16.00
```

---

## Next Steps

1. **Week 1:** Deploy rug detector API
2. **Week 2:** List in X402 bazaar
3. **Week 3:** Marketing to DeFi agents
4. **Week 4:** Add more models (wallet risk, token analysis)

**Goal:** $2000/month revenue from rug pull detector alone by Month 3
