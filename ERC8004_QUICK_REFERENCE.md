# ERC-8004 & X402 Integration - Quick Reference Guide

## Key Files at a Glance

### Smart Contracts (Base Mainnet)

| File | Contract | TokenID | Purpose |
|------|----------|---------|---------|
| `ZkMLVerificationRegistry.sol` | Identity Registry | N/A | Agent registration, reputation, proof tracking |
| `NewsClassificationOracle.sol` | Oracle | #1 | News classification posting with ERC-8004 identity |
| `ValidationRegistry.sol` | Validation | N/A | ERC-8004 validation request/response lifecycle |
| `TradingAgentBase.sol` | Trading Agent | #2 | Autonomous trading with reputation checks |
| `NewsVerifier.sol` | Validator | #3 | Groth16 proof verification |

### Off-Chain Services

| File | Service | Purpose |
|------|---------|---------|
| `news-service/src/x402Service.js` | X402 Payment | USDC verification on Base Mainnet |
| `news-service/src/index.js` | REST API | `.well-known/payment`, `/api/classify`, `/api/pricing` |
| `news-service/src/poster.js` | Oracle Poster | Calls NewsClassificationOracle.postClassification() |
| `news-service/src/classifier.js` | zkML Pipeline | ONNX → JOLT → Groth16 proof generation |
| `news-service/src/baseTrader.js` | Trading Service | Listens to NewsClassified events, checks reputation |
| `contracts/deploy-erc8004-v3.js` | Deployment | Deploys all contracts, registers agents |

---

## Agent TokenID Reference

```
Token #1: News Oracle (news_classification capability)
├─ Owner: Oracle wallet
├─ Reputation: Starts at 250, max 1000
├─ Used: Every classification stores this ID
└─ Verified by: TradingAgent checks reputation before trading

Token #2: Trading Agent (trading capability)
├─ Owner: Trading agent wallet
├─ Reputation: Not yet tracked
└─ Used: Autonomous trading execution

Token #3: Validator (validator capability)
├─ Owner: NewsVerifier contract
├─ Reputation: +1 per validation
└─ Used: Proof verification and validation submission
```

---

## Critical Flow Paths

### 1. Classification → Reputation Update

```
NewsClassificationOracle.postClassification()
  ├─ Store: NewsClassification.oracleTokenId = 1
  ├─ Call: verificationRegistry.submitProof(1, proofHash)
  └─ Request: validationRegistry.requestValidation(..., agentTokenId=1)
    └─ Validator verifies proof
      └─ Call: validationRegistry.submitValidation(..., approved)
        └─ Call: identityRegistry.increaseReputation(1, 10) or decreaseReputation(1, 5)
```

### 2. Payment → Classification → Trade

```
X402: POST /api/classify with paymentTx
  └─ verifyPayment(txHash)
    ├─ Check: Transfer TO oracle wallet in receipt
    ├─ Check: Amount >= 0.25 USDC
    └─ Check: Timestamp within 24 hours
  └─ NewsClassifier.classify(headline)
    └─ Generate proof
  └─ NewsClassificationOracle.postClassification(..., oracleTokenId=1)
    └─ Event: NewsClassified(..., oracleTokenId=1)
      └─ BaseTrader listener detects event
        └─ TradingAgentBase.reactToNews(classificationId)
          ├─ Get classification
          ├─ Check: getReputationScore(oracleTokenId=1) >= minOracleReputation
          └─ Execute trade (BUY/SELL)
```

### 3. Reputation-Based Access Control

```
Trading Decision:
  └─ TradingAgent.reactToNews(classificationId)
    ├─ Retrieve: NewsClassification.oracleTokenId = 1
    ├─ Query: getReputationScore(1, "news_classification")
    ├─ Require: reputation >= 50 (configurable minimum)
    └─ If pass: Execute trade
       If fail: Skip trade
```

---

## API Endpoints

### Free Endpoints (No Payment)

```
GET /.well-known/payment
  Response: X402 metadata with endpoints and pricing

GET /api/pricing
  Response: { price: "$0.25", currency: "USDC", network: "Base Mainnet" }

POST /api/demo/classify
  Body: { "headline": "news headline" }
  Response: { sentiment, confidence, proofHash } (mock proof)
  Note: No on-chain posting
```

### Paid Endpoints (X402)

```
POST /api/payment-request
  Body: { "headline": "news headline" }
  Response: { requestId, expiresAt, paymentInstructions }
  
  paymentInstructions includes:
    - Recipient: oracle wallet
    - Amount: 250000 wei (0.25 USDC)
    - USDC contract: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    - Calldata for transfer()

POST /api/classify
  Body: { "headline": "...", "paymentTx": "0x...", "requestId": "..." }
  
  Process:
    1. Verify USDC transfer in paymentTx
    2. Generate classification + Groth16 proof
    3. Post to NewsClassificationOracle (with oracleTokenId=1)
    4. Return: { sentiment, confidence, oracleTokenId, payment details }
```

---

## Reputation Mechanics

### Score Range: 0-1000

```
Initial Reputation: 250

Adjustments:
  +10 per correct prediction (validation approved)
  -20 * consecutiveFailures per incorrect prediction
  +50 per 10 consecutive correct predictions (streak bonus)
  +10 for approved validation (oracle receives)
  -5 for rejected validation (oracle receives)
  +1 per validation performed (validator receives)

Warning: 5+ consecutive failures → emit ConsecutiveFailureWarning
```

### Trading Requirements

```
// In TradingAgentBase.sol
require(oracleReputation >= minOracleReputation, "Oracle reputation too low");

// Default: minOracleReputation = 50
// Can be updated via: updateStrategy(uint256 minOracleReputation, ...)
```

---

## Proof Flow Details

### Generation Pipeline

```
// If USE_REAL_PROOFS=true:
Headline
  → ONNX Inference (JOLT-Atlas)
    → Sentiment (0=BAD, 1=NEUTRAL, 2=GOOD)
      → JOLT Proof Generation
        → Groth16 Wrapper
          → proofBytes, publicSignals
            → Store proofHash = keccak256(proof)

// If USE_REAL_PROOFS=false:
Headline
  → Heuristic Extraction
    → JOLT Hash
      → Store proofHash
```

### On-Chain Storage

```solidity
NewsClassification {
    bytes32 id;              // keccak256(headline, timestamp, block.number)
    string headline;
    Sentiment sentiment;     // 0=BAD, 1=NEUTRAL, 2=GOOD
    uint8 confidence;        // 0-100
    bytes32 proofHash;       // Submitted proof
    uint256 timestamp;       // Block timestamp
    uint256 oracleTokenId;   // CRITICAL: Agent ID (1)
}
```

---

## Configuration Environment Variables

```bash
# Blockchain (Base Mainnet)
BASE_MAINNET_RPC_URL=https://mainnet.base.org
ORACLE_PRIVATE_KEY=0x...

# Contract Addresses
NEWS_ORACLE_ADDRESS=0xe92c7aE9E894a8701583a43363676ff878d5b6ed
ZKML_VERIFICATION_REGISTRY=0x909fbFbFE9F7Bdb4d1a6e02F2E91d3f367555b07
VALIDATION_REGISTRY=0x04C6276830DA145ee465194131B7beC22aa2d0d3
TRADING_AGENT_ADDRESS=0x0D43DC16eFC1322Df3CE2B2852558993918A122B
NEWS_VERIFIER_ADDRESS=0x0590f2DFa80BCCc948aDb992737305f2FD01ceba

# News Sources
COINDESK_RSS_URL=https://www.coindesk.com/arc/outboundfeeds/rss/

# Service Configuration
POLL_INTERVAL_MINUTES=5
MIN_CONFIDENCE_THRESHOLD=60
USE_REAL_PROOFS=true
ENABLE_AUTO_TRADE=true

# UI
ALLOWED_ORIGINS=https://trustlessdefi.onrender.com
```

---

## Deployed Contracts (Base Mainnet)

```
ZkMLVerificationRegistry:   0x909fbFbFE9F7Bdb4d1a6e02F2E91d3f367555b07
NewsClassificationOracle:   0xe92c7aE9E894a8701583a43363676ff878d5b6ed
ValidationRegistry:         0x04C6276830DA145ee465194131B7beC22aa2d0d3
TradingAgentBase:           0x0D43DC16eFC1322Df3CE2B2852558993918A122B
NewsVerifier:               0x0590f2DFa80BCCc948aDb992737305f2FD01ceba
Groth16Verifier:            0xebE04Fa57C6cb7294DD7B3D16c166c3424092168

USDC (on Base):             0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
WETH (on Base):             0x4200000000000000000000000000000000000006
Uniswap V3 Router:          0x2626664c2603336E57B271c5C0b26F421741e481
```

---

## Common Tasks

### Deploy New Version

```bash
cd contracts
node deploy-erc8004-v3.js

# Output: New registry addresses
# Update .env with:
# ZKML_VERIFICATION_REGISTRY=0x...
# VALIDATION_REGISTRY=0x...
```

### Register Validator Agent

```bash
cd contracts
node register-validator-agent.js

# Output: Token ID #3 assigned to NewsVerifier
```

### Start News Service

```bash
cd news-service
npm install
node src/index.js

# Runs:
# 1. REST API on :3000
# 2. Cron job every 5 minutes
# 3. X402 payment service
# 4. Optional: auto-trading
```

### Start Trading Agent Listener

```bash
cd news-service
node src/startBaseTrader.js

# Continuously listens for NewsClassified events
# Checks oracle reputation
# Executes trades via Uniswap V3
```

### Check Oracle Reputation

```bash
# On-chain:
call getReputationScore(tokenId=1, "news_classification")

# Expected: 250 (initial) → up to 1000 based on validations
```

---

## Error Codes

### X402 Payment Verification

```
PAYMENT_ALREADY_USED:    Payment tx was already used
INVALID_REQUEST_ID:      Request ID doesn't exist
REQUEST_EXPIRED:         Request ID older than 10 minutes
TX_NOT_FOUND:           Transaction not found on blockchain
TX_FAILED:              Transaction status == 0
INVALID_RECIPIENT:      USDC transfer not to oracle wallet
INSUFFICIENT_PAYMENT:   Amount < 0.25 USDC
PAYMENT_EXPIRED:        Transaction older than 24 hours
VERIFICATION_ERROR:     General verification failure
```

### Trading Validation

```
Oracle reputation too low:     reputation < minOracleReputation
Confidence too low:            confidence < MIN_CONFIDENCE (60)
Already processed:             Classification already traded on
Not agent owner or authorized: Caller not authorized
```

---

## Tips & Debugging

1. **Check Oracle Tokenization:**
   ```bash
   curl http://localhost:3000/status
   # Look for: "oracleTokenId": 1
   ```

2. **Verify Payment Processing:**
   - Check X402 service logs for "Payment verified"
   - Confirm USDC transfer in tx receipt
   - Ensure recipient is oracle wallet

3. **Monitor Trade Execution:**
   ```bash
   # Watch TradingAgent logs for:
   # "Oracle Token ID: 1"
   # "reputation >= minOracleReputation"
   # "Trade executed"
   ```

4. **Reputation Updates:**
   - Check ValidationRegistry for requests
   - Monitor increaseReputation/decreaseReputation calls
   - Verify events emitted in ZkMLVerificationRegistry

5. **Proof Generation Issues:**
   - If JOLT-Atlas fails: Falls back to heuristic classification
   - Check USE_REAL_PROOFS env var
   - Review classifier.js fallback logic

---

## Resources

- **ERC-8004 Spec:** https://github.com/erc8004/erc8004
- **X402 Standard:** https://x402.org/
- **JOLT-Atlas:** Zero-knowledge proof system for verifiable ML
- **Groth16:** Efficient zero-knowledge proof verification
- **Base Mainnet:** https://mainnet.base.org

---

## Future Enhancements

1. Dynamic X402 pricing based on oracle reputation
2. Multi-oracle consensus with reputation weighting  
3. Tokenized reputation (mint/burn reputation points)
4. Automated reputation slashing for persistent failures
5. Decentralized validator network
6. Insurance/slashing for high-value predictions
7. Trading performance feedback to oracle reputation

