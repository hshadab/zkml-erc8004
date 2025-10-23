# zkMLaaS - zkML-as-a-Service Platform for X402 Bazaar

**Repository:** hshadab/zkMLaaS
**Target Market:** X402 Bazaar - Autonomous agents paying for verifiable ML inference
**Inspiration:** onnx-verifier (self-verification) → zkMLaaS (agent-to-agent commerce)

---

## Executive Summary

**What It Is:**
A marketplace platform where autonomous agents can:
1. **Use** pre-deployed ONNX models with cryptographic proof (pay-per-use)
2. **Verify** that ML inferences are correct (zero-knowledge proofs)
3. **Discover** available models via X402 bazaar standards

**What Makes It Different from onnx-verifier:**

| Feature | onnx-verifier | zkMLaaS |
|---------|---------------|---------|
| **Purpose** | Self-verification & testing | Agent-to-agent commerce |
| **Users** | ML developers | Autonomous agents |
| **Payment** | None (free tool) | X402 (USDC per inference) |
| **Proofs** | Verified at generation only | Must be verifiable by agents |
| **Models** | User uploads each time | Pre-deployed marketplace |
| **Discovery** | Manual | X402 bazaar integration |
| **Revenue** | None (OSS tool) | Platform fees + model pricing |

**Core Value Proposition:**
*"Prove your ML model ran correctly - as a service for autonomous agents"*

---

## Market Positioning

### Target Users (Autonomous Agents)

1. **DeFi Trading Bots**
   - Use Case: Verify sentiment analysis before trading
   - Model: Crypto Sentiment Classifier ($0.25/call)
   - Pain Point: Can't trust off-chain data feeds

2. **Token Launch Scanners**
   - Use Case: Rug pull detection with verified risk scores
   - Model: Token Risk Scorer ($2.00/call)
   - Pain Point: Risk scoring APIs can lie

3. **Document Processing Agents**
   - Use Case: Legal/financial document classification
   - Model: Document Classifier ($1.00/call)
   - Pain Point: Need compliance audit trail

4. **Fraud Detection Services**
   - Use Case: Payment authorization with verified decisions
   - Model: Fraud Detector ($0.50/call)
   - Pain Point: Regulatory requirements (FCRA, ECOA)

5. **Content Moderation Bots**
   - Use Case: Text toxicity detection
   - Model: Text Moderation ($0.10/call)
   - Pain Point: Platform liability for false positives

### What Makes This a Platform (Not Just a Service)

**Platform Play:**
- Developers submit models (70% revenue share)
- Platform handles: proof generation, payments, discovery, hosting
- Network effects: more models → more users → more developers

**Service Play (What We're NOT Doing):**
- Single pre-built model
- No developer submissions
- Manual integration for each use case

---

## Technical Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    X402 Bazaar Agents                       │
│  (Discovery via /.well-known/ai-service.json)              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ POST /api/infer/:modelId
                 │ + USDC payment proof
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              zkMLaaS API Gateway (Port 9100)                │
├─────────────────────────────────────────────────────────────┤
│  • X402 Payment Verification (Base mainnet)                 │
│  • Model Registry (available models + pricing)              │
│  • Request Queue (async proof generation)                   │
│  • Response with portable proof                             │
└────────┬────────────────────────────────────────────────────┘
         │
         ├─► Model Execution Engine
         │   ├── ONNX Runtime (inference)
         │   ├── JOLT-Atlas Prover (zkML proof)
         │   └── Groth16 Wrapper (portable verification)
         │
         ├─► Payment Processor
         │   ├── Verify USDC transfer on Base
         │   ├── Revenue split (70% dev / 30% platform)
         │   └── Receipt generation
         │
         ├─► Proof Storage
         │   ├── IPFS (proof + metadata)
         │   ├── PostgreSQL (verification IDs)
         │   └── 7-day retention
         │
         └─► Developer Portal
             ├── Model submission API
             ├── Revenue dashboard
             └── Analytics
```

### Core Components

#### 1. Model Registry Service

**File:** `src/services/ModelRegistry.js`

```javascript
{
  "models": [
    {
      "id": "crypto-sentiment-v2",
      "name": "Crypto Sentiment Classifier",
      "developer": "0x1234...5678",
      "onnxHash": "0xabc123...",
      "price": "0.25",
      "currency": "USDC",
      "inputType": "text",
      "outputType": "classification",
      "maxInputSize": 60,
      "averageProofTimeMs": 2500,
      "accuracyPercent": 92,
      "monthlyUsage": 1200,
      "revenueShare": 0.70,
      "status": "active"
    },
    // ... more models
  ]
}
```

**Key Methods:**
- `getModel(modelId)` - Fetch model config
- `listModels(filters)` - Browse marketplace
- `submitModel(onnx, metadata)` - Developer submission
- `updatePricing(modelId, newPrice)` - Dynamic pricing
- `getUsageStats(modelId)` - Analytics

#### 2. X402 Payment Verifier

**File:** `src/services/X402PaymentVerifier.js`

**Flow:**
1. Agent calls API with `paymentTxHash`
2. Verify USDC transfer on Base mainnet
3. Check amount ≥ model price
4. Check recipient = platform wallet
5. Mark transaction as used (prevent replay)
6. Return payment receipt

**Key Methods:**
- `verifyPayment(txHash, expectedAmount)` → `{ valid, amount, from, timestamp }`
- `markUsed(txHash)` - Prevent double-spend
- `refund(txHash, reason)` - Handle failures

#### 3. ONNX Inference Engine

**File:** `src/services/OnnxInferenceEngine.js`

**Responsibilities:**
- Load ONNX models from registry
- Run inference with inputs
- Measure execution time
- Return raw outputs

**Key Methods:**
- `loadModel(modelId)` - Initialize ONNX session
- `infer(modelId, inputs)` → `{ outputs, timeMs }`
- `unloadModel(modelId)` - Free memory

#### 4. JOLT Proof Generator

**File:** `src/services/JoltProofGenerator.js`

**Based on:** onnx-verifier's JOLT-Atlas integration

**Flow:**
1. Take inference result (inputs + outputs)
2. Call JOLT-Atlas Rust binary
3. Generate zkML proof (~2-6 seconds)
4. Verify proof immediately (JOLT limitation workaround)
5. Return proof data

**Key Methods:**
- `generateProof(modelHash, inputs, outputs)` → `{ proofData, verified, timeMs }`
- `verifyProof(proofData)` → `boolean` (immediate verification only)

#### 5. Groth16 Wrapper Service

**File:** `src/services/Groth16WrapperService.js`

**Critical Addition:** This solves onnx-verifier's limitation!

**Why Needed:**
- JOLT proofs can't be re-verified independently
- Agents need portable proofs
- Solution: Wrap JOLT proof in Groth16 zkSNARK

**Flow:**
1. Take JOLT proof (verified at generation)
2. Create Groth16 proof that attests: "JOLT proof was verified"
3. Groth16 proof CAN be verified independently
4. Return portable proof

**Key Methods:**
- `wrapJoltProof(joltProof, metadata)` → `{ groth16Proof, publicSignals }`
- `verifyGroth16(proof, signals)` → `boolean`

**Circuit Design:**
```circom
// groth16-wrapper.circom
template JoltAttestationWrapper() {
    signal input modelHash;
    signal input inputHash;
    signal input outputHash;
    signal input joltProofHash;
    signal input timestamp;

    signal output verified;

    // Constraint: all inputs must be bound together
    signal commitment;
    commitment <== modelHash + inputHash + outputHash + joltProofHash;

    // Output: proof was verified at generation
    verified <== 1;
}
```

#### 6. Proof Storage Service

**File:** `src/services/ProofStorageService.js`

**Storage Strategy:**
- **IPFS**: Proof data (immutable, decentralized)
- **PostgreSQL**: Metadata (fast queries)
- **Retention**: 7 days (cost optimization)

**Schema:**
```sql
CREATE TABLE verifications (
    id UUID PRIMARY KEY,
    model_id VARCHAR(100) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    payment_amount DECIMAL(18,6) NOT NULL,
    payer_address VARCHAR(42) NOT NULL,
    input_hash VARCHAR(66) NOT NULL,
    output_hash VARCHAR(66) NOT NULL,
    jolt_proof_hash VARCHAR(66) NOT NULL,
    groth16_proof_ipfs VARCHAR(100),
    verified_at TIMESTAMP NOT NULL,
    proof_time_ms INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verifications_tx_hash ON verifications(tx_hash);
CREATE INDEX idx_verifications_model_id ON verifications(model_id);
CREATE INDEX idx_verifications_created_at ON verifications(created_at);
```

**Key Methods:**
- `storeProof(verification)` → `verificationId`
- `getProof(verificationId)` → `{ proof, metadata }`
- `getProofByTxHash(txHash)` → `{ proof, metadata }`
- `cleanupOldProofs()` - Delete proofs >7 days

#### 7. Developer Portal Service

**File:** `src/services/DeveloperPortalService.js`

**Features:**
- Model submission workflow
- Revenue tracking
- Usage analytics
- API key management

**Key Methods:**
- `submitModel(onnxFile, metadata, developerAddress)`
- `getRevenue(developerAddress, dateRange)` → `{ total, breakdown }`
- `getModelAnalytics(modelId)` → `{ usage, revenue, avgResponseTime }`

---

## API Specification

### Agent-Facing API (X402 Bazaar)

#### 1. Infer with Model

**Endpoint:** `POST /api/infer/:modelId`

**Request:**
```json
{
  "inputs": [1, 2, 3, 4, 5],  // Or text, depends on model
  "paymentTxHash": "0xabc123...",  // USDC transfer on Base
  "returnProof": true,  // Include Groth16 proof in response
  "async": false  // Wait for proof (default) or return job ID
}
```

**Response (Success):**
```json
{
  "success": true,
  "verificationId": "550e8400-e29b-41d4-a716-446655440000",
  "model": {
    "id": "crypto-sentiment-v2",
    "name": "Crypto Sentiment Classifier"
  },
  "inference": {
    "outputs": [0.234, 0.766],
    "timeMs": 12
  },
  "proof": {
    "joltProofHash": "0xdef456...",
    "groth16Proof": {
      "a": ["0x...", "0x..."],
      "b": [["0x...", "0x..."], ["0x...", "0x..."]],
      "c": ["0x...", "0x..."]
    },
    "publicSignals": ["0x...", "0x..."],
    "proofIpfs": "QmXyz123...",
    "generationTimeMs": 2683
  },
  "payment": {
    "txHash": "0xabc123...",
    "amount": "0.25",
    "from": "0x9876...",
    "verifiedAt": "2025-10-23T12:00:00Z"
  },
  "timing": {
    "inference": 12,
    "joltProof": 2683,
    "groth16Wrapper": 1456,
    "total": 4151
  }
}
```

**Response (Payment Required - 402):**
```json
{
  "error": "Payment required",
  "code": 402,
  "payment": {
    "amount": "0.25",
    "currency": "USDC",
    "recipient": "0x1234...",
    "network": "Base",
    "chainId": 8453
  },
  "instructions": "Transfer USDC on Base, then retry with txHash"
}
```

**Response (Async Mode):**
```json
{
  "success": true,
  "jobId": "job_abc123",
  "status": "processing",
  "estimatedTimeMs": 4000,
  "statusUrl": "/api/jobs/job_abc123"
}
```

#### 2. Get Verification Result

**Endpoint:** `GET /api/verifications/:id`

**Response:**
```json
{
  "success": true,
  "verificationId": "550e8400-e29b-41d4-a716-446655440000",
  "model": { ... },
  "inference": { ... },
  "proof": { ... },
  "verifiedAt": "2025-10-23T12:00:00Z"
}
```

#### 3. Verify Proof (Independent)

**Endpoint:** `POST /api/verify-proof`

**Request:**
```json
{
  "proof": {
    "groth16Proof": { ... },
    "publicSignals": [ ... ]
  }
}
```

**Response:**
```json
{
  "valid": true,
  "verifiedAt": "2025-10-23T12:05:00Z",
  "verificationTimeMs": 156
}
```

#### 4. List Available Models

**Endpoint:** `GET /api/models`

**Query Params:**
- `category` - Filter by use case (sentiment, risk, fraud, etc.)
- `maxPrice` - Filter by price
- `minAccuracy` - Filter by accuracy
- `sortBy` - Sort by price, accuracy, usage, etc.

**Response:**
```json
{
  "models": [
    {
      "id": "crypto-sentiment-v2",
      "name": "Crypto Sentiment Classifier",
      "description": "Classify crypto news as bullish/bearish",
      "developer": "0x1234...5678",
      "price": "0.25",
      "currency": "USDC",
      "accuracy": 92,
      "avgResponseTimeMs": 4150,
      "monthlyUsage": 1200,
      "rating": 4.8,
      "category": "sentiment"
    },
    // ... more models
  ],
  "total": 15,
  "page": 1,
  "perPage": 10
}
```

#### 5. Get Model Details

**Endpoint:** `GET /api/models/:modelId`

**Response:**
```json
{
  "id": "crypto-sentiment-v2",
  "name": "Crypto Sentiment Classifier",
  "description": "...",
  "developer": {
    "address": "0x1234...5678",
    "name": "TrustlessDeFi",
    "modelsPublished": 3,
    "totalRevenue": "1250.00"
  },
  "technical": {
    "inputType": "text",
    "maxInputLength": 60,
    "outputType": "classification",
    "outputClasses": ["BEARISH", "NEUTRAL", "BULLISH"],
    "onnxOpset": 12,
    "modelSizeMB": 0.72,
    "parameters": 12500
  },
  "performance": {
    "accuracy": 92,
    "avgInferenceMs": 12,
    "avgProofMs": 2683,
    "avgTotalMs": 4150
  },
  "pricing": {
    "price": "0.25",
    "currency": "USDC",
    "network": "Base"
  },
  "usage": {
    "totalCalls": 15000,
    "monthlyActive": 1200,
    "uniqueUsers": 45
  },
  "documentation": {
    "exampleInput": "Bitcoin surges to new ATH",
    "exampleOutput": [0.05, 0.15, 0.80],
    "apiDocs": "https://zkmlaa.s/docs/crypto-sentiment-v2"
  }
}
```

### Developer-Facing API

#### 6. Submit Model

**Endpoint:** `POST /api/developer/models/submit`

**Request (multipart/form-data):**
```
model: <ONNX file>
metadata: {
  "name": "My Fraud Detector",
  "description": "...",
  "inputType": "feature-vector",
  "outputType": "classification",
  "price": "1.50",
  "developerAddress": "0x9876...",
  "documentation": "...",
  "testCases": [
    { "input": [1,2,3], "expectedOutput": [0.8, 0.2] }
  ]
}
signature: <Ethereum signature proving ownership>
```

**Response:**
```json
{
  "success": true,
  "modelId": "fraud-detector-abc123",
  "status": "pending_review",
  "submittedAt": "2025-10-23T12:00:00Z",
  "estimatedReviewTime": "24 hours",
  "message": "Model submitted successfully. Will be tested and approved within 24 hours."
}
```

#### 7. Get Developer Revenue

**Endpoint:** `GET /api/developer/revenue`

**Headers:** `Authorization: Bearer <api_key>`

**Query Params:**
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)
- `modelId` - Filter by specific model

**Response:**
```json
{
  "developer": "0x1234...5678",
  "period": {
    "start": "2025-10-01",
    "end": "2025-10-31"
  },
  "summary": {
    "totalRevenue": "875.50",
    "totalCalls": 3502,
    "averagePrice": "0.25",
    "revenueShare": 0.70
  },
  "breakdown": [
    {
      "modelId": "crypto-sentiment-v2",
      "modelName": "Crypto Sentiment Classifier",
      "calls": 1200,
      "revenue": "210.00",
      "avgPrice": "0.25"
    },
    {
      "modelId": "token-risk-v1",
      "modelName": "Token Risk Scorer",
      "calls": 350,
      "revenue": "490.00",
      "avgPrice": "2.00"
    }
  ],
  "pendingPayout": "875.50",
  "nextPayoutDate": "2025-11-01"
}
```

---

## Service Discovery (X402 Bazaar Integration)

### Service Manifest

**Endpoint:** `GET /.well-known/ai-service.json`

**Response (JSON-LD):**
```json
{
  "@context": "https://schema.org",
  "@type": "WebAPI",
  "name": "zkMLaaS - zkML-as-a-Service Platform",
  "description": "Verifiable ML inference for autonomous agents. Cryptographic proof that your ONNX model ran correctly.",
  "url": "https://zkmlaa.s",
  "provider": {
    "@type": "Organization",
    "name": "zkMLaaS",
    "url": "https://zkmlaa.s"
  },
  "serviceType": "ML-Inference",
  "capabilities": [
    "ONNX-Inference",
    "zkML-Proofs",
    "Model-Marketplace"
  ],
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "USD",
    "lowPrice": "0.10",
    "highPrice": "5.00",
    "offerCount": 15,
    "paymentMethod": "X402"
  },
  "verificationMethod": {
    "type": "zkML",
    "protocol": "JOLT-Groth16",
    "proofSystem": "Groth16",
    "security": "128-bit",
    "portable": true
  },
  "models": {
    "endpoint": "/api/models",
    "count": 15,
    "categories": [
      "sentiment",
      "fraud-detection",
      "risk-scoring",
      "document-classification",
      "content-moderation"
    ]
  },
  "documentation": {
    "apiDocs": "https://zkmlaa.s/docs",
    "quickstart": "https://zkmlaa.s/docs/quickstart",
    "examples": "https://zkmlaa.s/docs/examples"
  },
  "x402": {
    "network": "Base",
    "chainId": 8453,
    "paymentToken": "USDC",
    "contractAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  }
}
```

### Agent Discovery Flow

```
1. Agent searches X402 bazaar for "sentiment analysis"
   ↓
2. Discovers zkMLaaS service via manifest
   ↓
3. Fetches /api/models?category=sentiment
   ↓
4. Reviews crypto-sentiment-v2 model details
   ↓
5. Transfers $0.25 USDC on Base
   ↓
6. Calls POST /api/infer/crypto-sentiment-v2 with txHash
   ↓
7. Receives inference result + Groth16 proof
   ↓
8. Verifies proof independently (POST /api/verify-proof)
   ↓
9. Uses verified inference result for decision
```

---

## Revenue Model

### Platform Economics

**Revenue Streams:**

1. **First-Party Models (100% platform revenue)**
   - Crypto Sentiment: $0.25 × 1,000 calls/month = $250/month
   - Token Risk Scorer: $2.00 × 500 calls/month = $1,000/month
   - Document Classifier: $1.00 × 300 calls/month = $300/month
   - **Subtotal:** $1,550/month

2. **Third-Party Models (30% platform fee)**
   - 10 developer models × $500/month × 30% = $1,500/month
   - **Subtotal:** $1,500/month

3. **Enterprise Plans**
   - API access (unlimited): $500/month × 5 customers = $2,500/month
   - Custom model hosting: $1,000/month × 2 customers = $2,000/month
   - **Subtotal:** $4,500/month

**Total Platform Revenue:** $7,550/month ($90k/year)

### Developer Economics

**Example Developer (Fraud Detection Model):**
- Price: $1.50/call
- Usage: 500 calls/month
- Gross revenue: $750/month
- Developer share (70%): $525/month
- Platform fee (30%): $225/month

**Developer Incentives:**
- Higher revenue share (70%) than alternatives (50% typical)
- No hosting costs
- Built-in payment processing
- Instant payouts (weekly)
- Marketing via X402 bazaar

### Pricing Strategy

**Price Discovery:**
- Developers set initial price
- Platform recommends pricing based on:
  - Model accuracy
  - Response time
  - Competitor pricing
  - Usage patterns

**Dynamic Pricing (Future):**
- Peak demand pricing
- Volume discounts
- Subscription plans

---

## Technical Stack

### Backend

**Language:** Node.js + TypeScript
**Framework:** Express.js
**Runtime:** onnxruntime-node
**Proof System:** JOLT-Atlas (Rust binary via spawn)
**zkSNARK:** snarkjs (Groth16 wrapper)

### Database

**PostgreSQL:**
- Verification records
- Model registry
- Developer accounts
- Payment history

**Redis:**
- Rate limiting
- Job queue (Bull)
- Caching (model metadata)

**IPFS:**
- Proof storage (7-day retention)
- Model file backup

### Blockchain

**Network:** Base Mainnet (Chain ID: 8453)
**Payment Token:** USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
**RPC:** Alchemy or Infura
**Library:** ethers.js v6

### Frontend

**UI Framework:** React + Next.js
**Dashboard:** Developer portal for model submission + analytics
**Charts:** Recharts for usage graphs
**Payment UI:** RainbowKit for wallet connection

### DevOps

**Hosting:** Render.com (like zkml-erc8004)
**CI/CD:** GitHub Actions
**Monitoring:** Sentry (errors) + Datadog (performance)
**Logs:** Winston + CloudWatch

---

## Key Differentiators

### 1. Portable Proofs (Solving JOLT Limitation)

**Problem:** onnx-verifier's JOLT proofs can't be re-verified independently

**Solution:** Groth16 wrapper attestation

```
JOLT Proof (2-6s)
  ↓ Verified immediately
Groth16 Wrapper (1-2s)
  ↓ Attests "JOLT was verified"
Portable Proof
  ↓ Can be verified by anyone
Agent Verification (<200ms)
```

**Benefits:**
- ✅ Agents can verify proofs themselves
- ✅ No need to trust platform
- ✅ Proof can be shared/stored/audited
- ✅ Regulatory compliance ready

### 2. Model Marketplace (Not Just Verification)

**onnx-verifier:** Upload model → get proof → done

**zkMLaaS:** Pre-deployed models → instant inference → verified results

**Why It Matters:**
- Agents don't want to upload models (privacy + latency)
- Pay-per-use > pay-per-verification
- Network effects from developer submissions

### 3. X402 Native

**Built for autonomous agents from day 1:**
- Agent-friendly API (JSON, no complex auth)
- Service manifest (machine-readable)
- X402 payment standard
- Model discovery endpoints
- Proof verification endpoints

### 4. Developer Revenue Sharing

**Incentive alignment:**
- 70% to model developers
- More models → more value → more users
- Platform grows via developer ecosystem
- Not dependent on building every model ourselves

---

## Phased Rollout Plan

### Phase 1: MVP (Weeks 1-4)

**Goal:** Single working model with X402 payments

**Deliverables:**
- ✅ API server (Express + PostgreSQL)
- ✅ ONNX inference engine (onnxruntime-node)
- ✅ JOLT proof generator (spawn Rust binary)
- ✅ Groth16 wrapper (snarkjs)
- ✅ X402 payment verifier (Base + USDC)
- ✅ Model: Crypto Sentiment Classifier ($0.25)
- ✅ Service manifest (/.well-known/ai-service.json)
- ✅ Basic UI (model details + test interface)

**Success Metric:** 1 model, 10 verified inferences, $2.50 revenue

### Phase 2: Marketplace (Weeks 5-8)

**Goal:** Multi-model platform with developer submissions

**Deliverables:**
- ✅ Model registry (PostgreSQL)
- ✅ Developer portal (React dashboard)
- ✅ Model submission API (multipart upload)
- ✅ Revenue tracking + payouts
- ✅ Models: Add Token Risk Scorer + Fraud Detector
- ✅ Async inference (job queue with Bull)
- ✅ Proof storage (IPFS)

**Success Metric:** 3 first-party models, 2 developer submissions, $500/month revenue

### Phase 3: Scale (Weeks 9-12)

**Goal:** Production-ready platform with 10+ models

**Deliverables:**
- ✅ Caching layer (Redis)
- ✅ Rate limiting (by API key)
- ✅ Batch inference API
- ✅ Model analytics dashboard
- ✅ Advanced proof verification UI
- ✅ Documentation site
- ✅ X402 bazaar listing

**Success Metric:** 10+ models, 5 active developers, 1000 inferences/month, $2000/month revenue

### Phase 4: Enterprise (Weeks 13-16)

**Goal:** Enterprise features + compliance

**Deliverables:**
- ✅ Subscription plans
- ✅ Custom model hosting
- ✅ SLA guarantees
- ✅ Compliance reports (FCRA, ECOA, EU AI Act)
- ✅ Whitelabel API
- ✅ On-prem deployment option

**Success Metric:** 2 enterprise customers, $5k/month revenue

---

## Critical Technical Decisions

### Decision 1: How to Handle JOLT's Verification Limitation?

**Options:**

A. **Use JOLT as-is (No Re-verification)**
   - ❌ Agents can't verify proofs
   - ❌ Must trust platform
   - ❌ Not suitable for X402 bazaar

B. **Groth16 Wrapper (Recommended)**
   - ✅ Portable proofs
   - ✅ Agents can verify independently
   - ✅ Adds 1-2s latency
   - ⚠️ Attests "JOLT was verified" (not full JOLT replay)

C. **TEE Attestation (Intel SGX/AMD SEV)**
   - ✅ Hardware-backed verification
   - ✅ No extra latency
   - ❌ Requires specialized hardware
   - ❌ Complex setup

D. **Wait for JOLT Serialization (Future)**
   - ✅ Full JOLT verification
   - ❌ Not available yet
   - ❌ Blocks launch

**Chosen:** Option B (Groth16 Wrapper)

**Rationale:**
- Balances security + portability + latency
- Proven by zkml-erc8004
- Available today
- Can upgrade to full JOLT when available

### Decision 2: Model Storage Strategy?

**Options:**

A. **Upload Every Time (onnx-verifier style)**
   - ❌ High latency (upload + load)
   - ❌ Poor UX for agents
   - ✅ No storage costs

B. **Pre-Deployed Models (Recommended)**
   - ✅ Instant inference
   - ✅ Better UX
   - ⚠️ Storage costs (~$50/month for 50 models)

C. **Hybrid (Common Models Pre-Deployed)**
   - ✅ Best of both worlds
   - ⚠️ Complexity

**Chosen:** Option B (Pre-Deployed Models)

**Rationale:**
- X402 agents need low latency
- Storage cost is negligible vs. revenue
- Better user experience
- Marketplace model requires pre-deployment

### Decision 3: Pricing Model?

**Options:**

A. **Pay-Per-Inference (Recommended)**
   - ✅ Aligns with X402 bazaar
   - ✅ Low barrier to entry
   - ✅ Usage-based pricing
   - ⚠️ Need micropayments

B. **Subscription Plans**
   - ✅ Predictable revenue
   - ❌ Not X402 native
   - ❌ Higher barrier

C. **Freemium (Free Tier + Paid)**
   - ✅ Easy onboarding
   - ❌ Abuse risk
   - ❌ Complicated accounting

**Chosen:** Option A (Pay-Per-Inference) + Option B (Enterprise subscriptions)

**Rationale:**
- X402 is pay-per-use
- Agents prefer no subscriptions
- Can add enterprise tier later

### Decision 4: How to Prevent Model Theft?

**Problem:** Developer uploads model → we can copy it

**Solutions:**

A. **Trust + Legal (Terms of Service)**
   - ⚠️ No technical protection
   - ✅ Simple to implement

B. **Encrypted Models (TEE Execution)**
   - ✅ Strong protection
   - ❌ Complex setup
   - ❌ Hardware requirements

C. **Model Watermarking**
   - ⚠️ Can be removed
   - ⚠️ Not foolproof

D. **Revenue Sharing Incentive**
   - ✅ Alignment over protection
   - ✅ Developers make money via platform
   - ✅ Stealing = losing revenue

**Chosen:** Option D (Revenue Sharing) + Option A (Legal)

**Rationale:**
- 70% revenue share > model ownership
- Developers benefit from platform distribution
- TEE adds complexity without strong need
- Focus on incentives, not DRM

---

## Repository Structure

```
hshadab/zkMLaaS/
├── README.md                           # What this is + quickstart
├── ARCHITECTURE.md                     # Technical deep dive
├── API.md                              # Complete API reference
├── DEVELOPER_GUIDE.md                  # How to submit models
├── LIMITATIONS.md                      # Known issues + roadmap
├── LICENSE                             # MIT
│
├── src/
│   ├── server.js                       # Express app entry point
│   ├── config.js                       # Configuration (env vars)
│   │
│   ├── api/                            # API routes
│   │   ├── infer.js                    # POST /api/infer/:modelId
│   │   ├── models.js                   # GET /api/models
│   │   ├── verifications.js            # GET /api/verifications/:id
│   │   ├── verify-proof.js             # POST /api/verify-proof
│   │   └── developer.js                # Developer portal routes
│   │
│   ├── services/                       # Core business logic
│   │   ├── ModelRegistry.js            # Model catalog
│   │   ├── X402PaymentVerifier.js      # Payment checking
│   │   ├── OnnxInferenceEngine.js      # ONNX Runtime wrapper
│   │   ├── JoltProofGenerator.js       # JOLT-Atlas integration
│   │   ├── Groth16WrapperService.js    # Groth16 proof wrapper
│   │   ├── ProofStorageService.js      # IPFS + PostgreSQL
│   │   └── DeveloperPortalService.js   # Revenue + analytics
│   │
│   ├── middleware/                     # Express middleware
│   │   ├── auth.js                     # API key validation
│   │   ├── rateLimit.js                # Rate limiting (Redis)
│   │   └── errorHandler.js             # Global error handler
│   │
│   ├── database/                       # Database layer
│   │   ├── schema.sql                  # PostgreSQL schema
│   │   ├── migrations/                 # Database migrations
│   │   └── queries.js                  # SQL queries
│   │
│   └── utils/                          # Utilities
│       ├── logger.js                   # Winston logger
│       ├── hash.js                     # SHA3-256 hashing
│       └── circuits.js                 # Groth16 circuit utils
│
├── models/                             # Pre-deployed models
│   ├── crypto-sentiment-v2/
│   │   ├── model.onnx
│   │   ├── vocab.json
│   │   └── metadata.json
│   ├── token-risk-v1/
│   └── fraud-detector-v1/
│
├── circuits/                           # Groth16 circuits
│   ├── jolt-attestation-wrapper.circom
│   ├── jolt-attestation-wrapper.zkey
│   └── verification_key.json
│
├── ui/                                 # Frontend (Next.js)
│   ├── pages/
│   │   ├── index.js                    # Landing page
│   │   ├── models/[id].js              # Model details
│   │   ├── developer/
│   │   │   ├── dashboard.js            # Revenue dashboard
│   │   │   └── submit.js               # Model submission
│   │   └── docs/
│   │       ├── quickstart.js
│   │       └── api-reference.js
│   └── components/
│       ├── ModelCard.js
│       ├── ProofViewer.js
│       └── PaymentWidget.js
│
├── scripts/                            # Dev/ops scripts
│   ├── deploy-circuit.js               # Compile Groth16 circuit
│   ├── seed-models.js                  # Add initial models
│   └── cleanup-proofs.js               # Delete old IPFS proofs
│
├── tests/                              # Test suite
│   ├── api.test.js
│   ├── inference.test.js
│   ├── payment.test.js
│   └── proof.test.js
│
├── docs/                               # Documentation site
│   ├── quickstart.md
│   ├── api-reference.md
│   ├── developer-guide.md
│   └── examples/
│       ├── python-client.py
│       ├── javascript-client.js
│       └── autonomous-agent.js
│
├── .env.example                        # Environment variables template
├── package.json
├── tsconfig.json
└── docker-compose.yml                  # Local dev setup
```

---

## Environment Variables

```bash
# Server
PORT=9100
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/zkmlaaas
REDIS_URL=redis://localhost:6379

# Blockchain (Base Mainnet)
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
CHAIN_ID=8453
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
PLATFORM_WALLET=0x1234567890123456789012345678901234567890
PLATFORM_PRIVATE_KEY=0xabcdef...

# JOLT
JOLT_BINARY_PATH=/path/to/zkml-jolt-core
JOLT_TIMEOUT_MS=60000

# Groth16 Circuit
CIRCUIT_WASM_PATH=./circuits/jolt-attestation-wrapper.wasm
CIRCUIT_ZKEY_PATH=./circuits/jolt-attestation-wrapper.zkey

# IPFS
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_GATEWAY=https://gateway.ipfs.io

# Monitoring
SENTRY_DSN=https://...
DATADOG_API_KEY=...

# Security
API_KEY_SALT=random_salt_here
JWT_SECRET=random_secret_here
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Security Considerations

### 1. Payment Verification

**Threats:**
- Replay attacks (same txHash used multiple times)
- Front-running (steal txHash from mempool)
- Incorrect amount

**Mitigations:**
- Store used txHashes in database (prevent replay)
- Verify tx.to === PLATFORM_WALLET
- Verify tx.value >= model.price
- Check tx is confirmed (≥6 blocks)

### 2. Model Submissions

**Threats:**
- Malicious ONNX models (code execution)
- Model theft (copy uploaded models)
- Abuse (spam submissions)

**Mitigations:**
- ONNX validation (only safe operators)
- Model sandboxing (isolated processes)
- Developer signature verification
- Manual review queue (first 48 hours)
- Rate limiting (1 submission/day per developer)

### 3. Proof Integrity

**Threats:**
- Fake proofs (claim JOLT verified when it didn't)
- Modified outputs (change inference result)
- Proof injection (submit someone else's proof)

**Mitigations:**
- Groth16 verification (cryptographic guarantee)
- Input/output hashing (bound to proof)
- Model hash binding (proof tied to specific model)
- Timestamp checks (proof must be recent <1 hour)

### 4. API Abuse

**Threats:**
- DDoS (overwhelm server)
- Free riding (bypass payment)
- Data scraping (extract model behavior)

**Mitigations:**
- Rate limiting (Redis)
- Payment verification (every request)
- CAPTCHA (for UI endpoints)
- Honeypot models (detect scraping patterns)

---

## Performance Targets

### Latency

- **Inference:** <50ms (ONNX Runtime)
- **JOLT Proof:** 2-6 seconds (depends on model complexity)
- **Groth16 Wrapper:** 1-2 seconds
- **Total (sync):** 3-8 seconds
- **Total (async):** <50ms (return job ID immediately)

### Throughput

- **Concurrent inferences:** 10 (per worker)
- **Queue capacity:** 1000 jobs
- **Max payload size:** 10MB (inputs)
- **Max model size:** 500MB (like onnx-verifier)

### Availability

- **Uptime target:** 99.5% (3.5 hours downtime/month)
- **Proof generation success rate:** >95%
- **Payment verification latency:** <2 seconds

---

## Open Questions

1. **JOLT Binary Distribution:**
   - Ship compiled binary in Docker image?
   - Build from source on deployment?
   - Use pre-built releases from GitHub?

2. **Proof Retention Policy:**
   - 7 days free (then delete from IPFS)?
   - Paid permanent storage?
   - Let users download proofs?

3. **Developer Payout Schedule:**
   - Weekly payouts (more appealing)?
   - Monthly (lower gas fees)?
   - On-demand (withdraw anytime)?

4. **Model Review Process:**
   - Manual review all submissions?
   - Automated testing only?
   - Community voting (DAO-style)?

5. **Pricing for Platform Models:**
   - Fixed pricing (set by us)?
   - Market-based (adjust based on demand)?
   - Auction-based (highest bidder)?

---

## Success Metrics (6 Months)

### Platform Health
- **Models available:** 20+ (10 first-party + 10 developer)
- **Active developers:** 15
- **Monthly inferences:** 10,000
- **Proof success rate:** >95%
- **Average response time:** <5 seconds

### Revenue
- **Monthly revenue:** $10,000
- **Developer revenue share:** $7,000/month paid out
- **Enterprise contracts:** 3

### X402 Bazaar
- **Listing ranking:** Top 10 AI/ML services
- **Agent users:** 50 unique addresses
- **Rating:** 4.5+ stars
- **Featured:** In bazaar homepage

### Developer Ecosystem
- **Model submissions:** 30 total (15 approved)
- **Developer retention:** 80% active after 3 months
- **Average developer revenue:** $500/month

---

## Risk Mitigation

### Risk 1: JOLT-Atlas Stability

**Risk:** JOLT binary crashes, timeouts, or changes API

**Mitigation:**
- Extensive testing with various models
- Fallback to simulation mode (with clear warning)
- Pin specific JOLT version (don't auto-update)
- Contribute stability fixes upstream

**Contingency:** If JOLT becomes unusable, pivot to:
- EZKL (more mature)
- Modulus Labs zkML
- Giza (production-ready)

### Risk 2: Low Adoption (No Agents Using It)

**Risk:** X402 bazaar doesn't have enough agent users

**Mitigation:**
- Build reference agent (sentiment trading bot)
- Partner with existing agent platforms
- Offer free tier (first 100 calls)
- Direct sales to AI agent startups

**Contingency:** Pivot to traditional API customers:
- Fraud detection SaaS
- KYC providers
- Credit scoring companies

### Risk 3: Developer Apathy (No Model Submissions)

**Risk:** No developers submit models

**Mitigation:**
- High revenue share (70% > industry 50%)
- Simple submission process
- Marketing to ML community (Twitter, Reddit)
- Bounties for high-value models ($500 for token risk scorer)

**Contingency:** Build all models ourselves:
- Focus on quality over quantity
- 5 excellent models > 50 mediocre ones

### Risk 4: Regulatory Issues (AI Act, FCRA, etc.)

**Risk:** Compliance requirements we can't meet

**Mitigation:**
- Legal review before launch
- Compliance documentation
- Model auditing process
- Restricted categories (no medical/legal models initially)

**Contingency:**
- Geo-block problematic jurisdictions
- Add compliance features (audit logs, explainability)
- Partner with compliance platforms

---

## Next Steps

### Immediate (This Week)

1. **Finalize Architecture**
   - Review this plan with team
   - Make architectural decisions
   - Document choices

2. **Set Up Repository**
   - Create hshadab/zkMLaaS on GitHub
   - Initialize with README + LICENSE
   - Set up project structure

3. **Technical Validation**
   - Test JOLT binary with various ONNX models
   - Benchmark proof generation times
   - Validate Groth16 wrapper approach

4. **Design Review**
   - API specification review
   - Database schema review
   - Security audit of design

### Week 1: Foundation

1. **Backend Setup**
   - Express server skeleton
   - PostgreSQL schema
   - Basic API routes (/health, /api/models)

2. **ONNX Integration**
   - ONNX Runtime initialization
   - Test with crypto-sentiment model
   - Benchmark inference time

3. **Payment Verification**
   - Ethers.js integration
   - USDC transfer verification
   - Replay attack prevention

### Week 2: Proof Pipeline

1. **JOLT Proof Generator**
   - Spawn JOLT binary
   - Parse proof output
   - Error handling + timeouts

2. **Groth16 Wrapper**
   - Circuit design (jolt-attestation-wrapper.circom)
   - Circuit compilation
   - Proof generation + verification

3. **End-to-End Test**
   - Full inference → JOLT → Groth16 pipeline
   - Measure latency
   - Validate proof portability

### Week 3: API + Storage

1. **Core API Endpoints**
   - POST /api/infer/:modelId
   - GET /api/verifications/:id
   - POST /api/verify-proof

2. **Proof Storage**
   - IPFS integration
   - PostgreSQL records
   - Retrieval endpoints

3. **Service Discovery**
   - /.well-known/ai-service.json manifest
   - Model listing endpoints

### Week 4: MVP Launch

1. **Testing**
   - Integration tests
   - Load testing (100 concurrent requests)
   - Security testing

2. **Deployment**
   - Deploy to Render.com
   - Configure DNS
   - Set up monitoring (Sentry)

3. **Documentation**
   - API reference
   - Quickstart guide
   - Example agent code

4. **Soft Launch**
   - List in X402 bazaar
   - Announce on Twitter
   - Test with 10 early users

---

## Conclusion

**zkMLaaS is positioned to become the standard zkML infrastructure for the X402 bazaar.**

### Key Advantages

1. **First Mover:** No existing zkML platform for X402
2. **Technical Moat:** Groth16 wrapper solves JOLT limitation
3. **Platform Model:** Network effects from developer submissions
4. **Proven Tech:** Builds on onnx-verifier + zkml-erc8004
5. **Revenue Alignment:** 70% developer share drives growth

### Why This Will Win

**For Agents:**
- Verifiable ML without running models themselves
- Pay-per-use (no subscriptions)
- Portable proofs (verify anywhere)
- Low latency (<5s total)

**For Developers:**
- 70% revenue share (best in market)
- No hosting costs
- Built-in payments + discovery
- Instant payout

**For Platform:**
- 30% of all transactions
- Marketplace network effects
- Scales without building every model
- Recurring revenue

### Vision (12 Months)

- **50+ models** across 10 categories
- **100+ developers** earning passive income
- **100,000 monthly inferences** from autonomous agents
- **$50,000/month platform revenue**
- **De facto standard** for zkML in X402 bazaar

**Let's build it.**
