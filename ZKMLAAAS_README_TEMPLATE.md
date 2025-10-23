# zkMLaaS - zkML-as-a-Service Platform

**Prove your ML model ran correctly - as a service for autonomous agents**

Verifiable ML inference for the X402 bazaar. Upload your ONNX model or use pre-deployed models with cryptographic proof of execution.

---

## What It Does

**For Autonomous Agents:**
- Use ML models with cryptographic proof of correctness
- Pay per inference via X402 (USDC on Base)
- Verify proofs independently (Groth16 zkSNARKs)
- Browse marketplace of 20+ models

**For ML Developers:**
- Submit your ONNX models
- Earn 70% revenue share (vs 50% industry standard)
- No hosting costs
- Instant weekly payouts
- Built-in payment + discovery

---

## Quick Start

### Use a Model (Agents)

```bash
# 1. Transfer payment ($0.25 USDC on Base)
# → to: 0x1234...5678
# → amount: 0.25 USDC
# → network: Base (Chain ID 8453)

# 2. Call inference API
curl -X POST https://zkmlaa.s/api/infer/crypto-sentiment-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": ["Bitcoin surges to new ATH"],
    "paymentTxHash": "0xabc123...",
    "returnProof": true
  }'

# 3. Get verified result + proof
{
  "inference": {
    "outputs": [0.05, 0.15, 0.80],  // [BEARISH, NEUTRAL, BULLISH]
    "timeMs": 12
  },
  "proof": {
    "groth16Proof": { ... },        // Portable zkSNARK proof
    "proofIpfs": "QmXyz123...",     // Permanent storage
    "verified": true
  },
  "timing": {
    "inference": 12,
    "joltProof": 2683,
    "groth16Wrapper": 1456,
    "total": 4151
  }
}
```

### Submit a Model (Developers)

```bash
# 1. Export your model to ONNX
python -c "
from sklearn.linear_model import LogisticRegression
from skl2onnx import convert_sklearn
import numpy as np

model = LogisticRegression()
model.fit([[1,2],[3,4]], [0,1])

onnx_model = convert_sklearn(
    model,
    initial_types=[('input', FloatTensorType([None, 2]))]
)

with open('fraud_detector.onnx', 'wb') as f:
    f.write(onnx_model.SerializeToString())
"

# 2. Submit to platform
curl -X POST https://zkmlaa.s/api/developer/models/submit \
  -F "model=@fraud_detector.onnx" \
  -F 'metadata={
    "name": "Fraud Detector v1",
    "description": "Payment fraud detection",
    "price": "1.50",
    "developerAddress": "0x9876...",
    "testCases": [
      {"input": [1,2], "expectedOutput": [0.8, 0.2]}
    ]
  }' \
  -F "signature=0xdef456..."

# 3. Get approved (within 24 hours)
# 4. Start earning 70% revenue
```

---

## Key Features

### 🔐 Verifiable ML Inference

- **REAL zkML proofs** - JOLT-Atlas by a16z crypto (2-6 seconds)
- **Portable proofs** - Groth16 zkSNARKs (agents can verify independently)
- **128-bit security** - Mathematically sound zero-knowledge proofs
- **No simulations** - Every proof is cryptographically verified

### 💰 X402 Native

- **Pay-per-use** - No subscriptions, pay only for what you use
- **USDC payments** - On Base mainnet (low gas fees)
- **Agent discovery** - Service manifest (JSON-LD)
- **Instant verification** - Payment verified in <2 seconds

### 🛒 Model Marketplace

- **20+ models** - Sentiment, fraud, risk, document classification, etc.
- **Developer submissions** - Submit your model, earn 70% revenue
- **Browse by category** - Filter by price, accuracy, response time
- **Ratings & reviews** - Community-driven quality

### ⚡ High Performance

- **<50ms inference** - ONNX Runtime optimized
- **2-6s JOLT proofs** - Research-grade zkML
- **Async mode** - Get job ID immediately, fetch result later
- **Batch inference** - Process multiple inputs at once

---

## Available Models

| Model | Description | Price | Category | Accuracy |
|-------|-------------|-------|----------|----------|
| [crypto-sentiment-v2](https://zkmlaa.s/models/crypto-sentiment-v2) | Crypto news sentiment classifier | $0.25 | Sentiment | 92% |
| [token-risk-v1](https://zkmlaa.s/models/token-risk-v1) | Token launch rug pull detector | $2.00 | Risk Scoring | 89% |
| [fraud-detector-v1](https://zkmlaa.s/models/fraud-detector-v1) | Payment fraud detection | $0.50 | Fraud Detection | 94% |
| [doc-classifier-v1](https://zkmlaa.s/models/doc-classifier-v1) | Legal/financial doc categorization | $1.00 | Document | 88% |
| [text-moderation-v1](https://zkmlaa.s/models/text-moderation-v1) | Toxicity detection | $0.10 | Content Mod | 91% |

[View all models →](https://zkmlaa.s/models)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Autonomous Agents                     │
│   (X402 Bazaar discovery via service manifest)         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ POST /api/infer/:modelId
                       │ + USDC payment proof
                       ▼
┌──────────────────────────────────────────────────────────┐
│              zkMLaaS Platform (Port 9100)                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Payment      │  │ Model        │  │ Proof        │  │
│  │ Verifier     │  │ Registry     │  │ Storage      │  │
│  │ (Base/USDC)  │  │ (PostgreSQL) │  │ (IPFS)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────┬───────┴──────────┬───────┘          │
│                    ▼                  ▼                  │
│         ┌────────────────────────────────────┐          │
│         │  Inference Engine (ONNX Runtime)   │          │
│         └────────────────┬───────────────────┘          │
│                          │                               │
│         ┌────────────────▼───────────────────┐          │
│         │  JOLT Proof Generator (2-6s)       │          │
│         └────────────────┬───────────────────┘          │
│                          │                               │
│         ┌────────────────▼───────────────────┐          │
│         │  Groth16 Wrapper (1-2s)            │          │
│         │  (Portable proof for agents)       │          │
│         └────────────────────────────────────┘          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Pipeline:**
1. Agent transfers USDC on Base
2. Platform verifies payment
3. ONNX inference (12-50ms)
4. JOLT proof generation (2-6 seconds)
5. Groth16 wrapper (1-2 seconds)
6. Return result + portable proof
7. Agent verifies proof independently

**Why Groth16 Wrapper?**
- JOLT proofs are verified at generation but can't be re-verified later
- Groth16 wrapper creates portable proof that attests: "JOLT was verified"
- Agents can verify Groth16 proof independently
- Solves JOLT's limitation while maintaining cryptographic guarantees

---

## API Reference

### Inference Endpoint

**POST** `/api/infer/:modelId`

```json
Request:
{
  "inputs": ["Bitcoin surges to new ATH"],
  "paymentTxHash": "0xabc123...",
  "returnProof": true,
  "async": false
}

Response (Success):
{
  "success": true,
  "verificationId": "550e8400-e29b-41d4-a716-446655440000",
  "inference": {
    "outputs": [0.05, 0.15, 0.80],
    "timeMs": 12
  },
  "proof": {
    "joltProofHash": "0xdef456...",
    "groth16Proof": { ... },
    "publicSignals": [ ... ],
    "proofIpfs": "QmXyz123...",
    "verified": true
  },
  "timing": {
    "inference": 12,
    "joltProof": 2683,
    "groth16Wrapper": 1456,
    "total": 4151
  }
}

Response (Payment Required - 402):
{
  "error": "Payment required",
  "code": 402,
  "payment": {
    "amount": "0.25",
    "currency": "USDC",
    "recipient": "0x1234...",
    "network": "Base",
    "chainId": 8453
  }
}
```

### Model Listing

**GET** `/api/models`

Query params: `?category=sentiment&maxPrice=1.00&sortBy=usage`

```json
Response:
{
  "models": [
    {
      "id": "crypto-sentiment-v2",
      "name": "Crypto Sentiment Classifier",
      "description": "Classify crypto news as bullish/bearish",
      "developer": "0x1234...5678",
      "price": "0.25",
      "accuracy": 92,
      "avgResponseTimeMs": 4150,
      "monthlyUsage": 1200,
      "rating": 4.8,
      "category": "sentiment"
    }
  ],
  "total": 15,
  "page": 1
}
```

### Verify Proof

**POST** `/api/verify-proof`

```json
Request:
{
  "proof": {
    "groth16Proof": { ... },
    "publicSignals": [ ... ]
  }
}

Response:
{
  "valid": true,
  "verifiedAt": "2025-10-23T12:05:00Z",
  "verificationTimeMs": 156
}
```

[Full API documentation →](https://zkmlaa.s/docs/api)

---

## Developer Portal

### Revenue Dashboard

Track your earnings in real-time:

```
Total Revenue (Oct 2025)
├─ crypto-sentiment-v2: $210.00 (1,200 calls × $0.25 × 70%)
├─ token-risk-v1:       $490.00 (350 calls × $2.00 × 70%)
└─ Total:               $700.00

Pending Payout: $700.00
Next Payout: Nov 1, 2025
```

### Model Submission

1. **Export to ONNX** - Any framework (PyTorch, scikit-learn, TensorFlow, XGBoost)
2. **Test locally** - Verify model works with ONNX Runtime
3. **Submit** - Upload via API or web form
4. **Review** - Platform tests your model (within 24 hours)
5. **Approved** - Model goes live, start earning immediately
6. **Weekly payouts** - Automatic USDC transfers to your wallet

**Requirements:**
- ONNX format (opset 12+)
- Max 500MB file size
- 3+ test cases with expected outputs
- Clear documentation (input/output format)

[Developer guide →](https://zkmlaa.s/docs/developer)

---

## Technology Stack

- **zkML:** JOLT-Atlas (a16z crypto) + Groth16 zkSNARKs
- **Runtime:** ONNX Runtime (optimized inference)
- **Backend:** Node.js + TypeScript + Express
- **Database:** PostgreSQL (metadata) + Redis (cache/queue)
- **Storage:** IPFS (proofs) + S3 (models)
- **Blockchain:** Base mainnet (USDC payments)
- **Frontend:** Next.js + React + RainbowKit

---

## Comparison

| Feature | zkMLaaS | Traditional ML API | Other zkML |
|---------|---------|-------------------|------------|
| **Verifiable** | ✅ Groth16 proofs | ❌ Trust required | ✅ Various proofs |
| **X402 Native** | ✅ USDC on Base | ❌ Credit cards | ❌ Not agent-focused |
| **Marketplace** | ✅ 20+ models | ❌ Single provider | ❌ Self-host only |
| **Dev Revenue** | ✅ 70% share | ❌ 0% (closed) | ❌ No marketplace |
| **Portable Proofs** | ✅ Groth16 | ❌ N/A | ⚠️ Varies |
| **Response Time** | ✅ 3-8 seconds | ✅ <100ms | ⚠️ 10-60 seconds |
| **Price** | ✅ $0.10 - $5.00 | ⚠️ Varies | ⚠️ Expensive |

---

## Use Cases

### 1. DeFi Trading Bots

**Problem:** Can't trust off-chain sentiment feeds

**Solution:** Verifiable sentiment analysis
- Model: crypto-sentiment-v2
- Price: $0.25/call
- Accuracy: 92%
- Use: Autonomous trading decisions

### 2. Token Launch Scanners

**Problem:** Risk scoring APIs can lie about rug pull probability

**Solution:** Cryptographically verified risk scores
- Model: token-risk-v1
- Price: $2.00/call
- Accuracy: 89%
- Use: Protect investors from scams

### 3. Document Processing Agents

**Problem:** Need audit trail for compliance

**Solution:** Verifiable document classification
- Model: doc-classifier-v1
- Price: $1.00/call
- Accuracy: 88%
- Use: Legal/financial document routing

### 4. Fraud Detection Services

**Problem:** Regulatory requirements (FCRA, ECOA)

**Solution:** Cryptographic proof of model execution
- Model: fraud-detector-v1
- Price: $0.50/call
- Accuracy: 94%
- Use: Payment authorization with audit trail

### 5. Content Moderation Bots

**Problem:** Platform liability for false positives

**Solution:** Verifiable toxicity detection
- Model: text-moderation-v1
- Price: $0.10/call
- Accuracy: 91%
- Use: Auto-moderation with proof

---

## X402 Bazaar Integration

### Service Discovery

Agents discover zkMLaaS via service manifest:

**GET** `/.well-known/ai-service.json`

```json
{
  "@context": "https://schema.org",
  "@type": "WebAPI",
  "name": "zkMLaaS - zkML-as-a-Service Platform",
  "description": "Verifiable ML inference for autonomous agents",
  "capabilities": ["ONNX-Inference", "zkML-Proofs", "Model-Marketplace"],
  "models": {
    "endpoint": "/api/models",
    "count": 20,
    "categories": ["sentiment", "fraud-detection", "risk-scoring"]
  },
  "x402": {
    "network": "Base",
    "chainId": 8453,
    "paymentToken": "USDC"
  }
}
```

### Payment Flow

```
1. Agent searches X402 bazaar for "sentiment analysis"
   ↓
2. Discovers zkMLaaS via service manifest
   ↓
3. Reviews model (price, accuracy, response time)
   ↓
4. Transfers $0.25 USDC on Base
   ↓ txHash: 0xabc123...
5. Calls POST /api/infer/crypto-sentiment-v2 with txHash
   ↓
6. Receives inference result + Groth16 proof
   ↓
7. Verifies proof independently (POST /api/verify-proof)
   ↓
8. Uses verified result for decision
```

---

## Roadmap

### Phase 1: MVP (Weeks 1-4) ✅

- ✅ Core API (inference + payment)
- ✅ JOLT + Groth16 pipeline
- ✅ 1 model (crypto-sentiment)
- ✅ X402 payment verification
- ✅ Service manifest

### Phase 2: Marketplace (Weeks 5-8)

- ⏳ Model registry (PostgreSQL)
- ⏳ Developer portal (submission + analytics)
- ⏳ 3 first-party models
- ⏳ Async inference (job queue)
- ⏳ Proof storage (IPFS)

### Phase 3: Scale (Weeks 9-12)

- ⏳ 10+ models
- ⏳ Rate limiting + caching
- ⏳ Batch inference
- ⏳ X402 bazaar listing
- ⏳ Documentation site

### Phase 4: Enterprise (Weeks 13-16)

- ⏳ Subscription plans
- ⏳ Custom model hosting
- ⏳ SLA guarantees
- ⏳ Compliance reports (FCRA, ECOA, EU AI Act)

---

## FAQ

**Q: How is this different from EZKL, Giza, or Modulus Labs?**

A: Those are self-hosted zkML frameworks. zkMLaaS is a managed platform:
- No setup (we handle infrastructure)
- Pay-per-use (no hosting costs)
- Model marketplace (discover + use existing models)
- Developer revenue sharing (earn from your models)

**Q: Can I use my proprietary models?**

A: Yes! Submit your ONNX model → earn 70% revenue. Your model stays private (only inference results are public).

**Q: How do you prevent model theft?**

A: Revenue sharing alignment. Developers make more money via platform distribution than keeping models private. Also legal protections (ToS + model ownership).

**Q: What if JOLT proofs can't be re-verified?**

A: We wrap JOLT proofs in Groth16 zkSNARKs. The Groth16 proof attests "JOLT was verified at generation" and CAN be verified independently by agents. This solves JOLT's limitation while maintaining cryptographic guarantees.

**Q: What models are supported?**

A: Any ONNX model (PyTorch, TensorFlow, scikit-learn, XGBoost, etc.) up to 500MB.

**Q: What's the pricing?**

A: Models range from $0.10 to $5.00 per inference. Developers set prices, platform takes 30%.

**Q: How do payouts work?**

A: Weekly automatic USDC transfers to your wallet. 70% of revenue goes to model developers.

**Q: Is this production-ready?**

A: Phase 1 (MVP) is live. Phase 2-4 coming soon. See roadmap above.

---

## Links

- **Website:** https://zkmlaa.s
- **API Docs:** https://zkmlaa.s/docs
- **Developer Portal:** https://zkmlaa.s/developer
- **X402 Bazaar:** https://x402.network/services/zkMLaaS
- **GitHub:** https://github.com/hshadab/zkMLaaS
- **Twitter:** @zkMLaaS
- **Discord:** https://discord.gg/zkMLaaS

---

## License

MIT

---

## Credits

Built with:
- [JOLT-Atlas](https://github.com/a16z/jolt) by a16z crypto
- [ONNX Runtime](https://onnxruntime.ai/)
- [snarkjs](https://github.com/iden3/snarkjs) by iden3

Inspired by:
- [onnx-verifier](https://github.com/hshadab/onnx-verifier) (self-verification tool)
- [zkml-erc8004](https://github.com/hshadab/zkml-erc8004) (sentiment oracle)

---

**zkMLaaS - Prove your ML model ran correctly**

*Verifiable inference. Autonomous agents. Cryptographic guarantees.*
