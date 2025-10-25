# ERC-8004 & X402 Integration Documentation

## Start Here

This project contains comprehensive documentation of how the **ERC-8004 (Verifiable AI Agents Standard)** is integrated with the **X402 payment system** in a zkML news oracle.

### Quick Navigation

**I want to understand the architecture:**
→ Read: [ERC8004_X402_INTEGRATION_ANALYSIS.md](ERC8004_X402_INTEGRATION_ANALYSIS.md)
- 1,273 lines of detailed architectural analysis
- Complete contract documentation
- Proof verification flows
- Payment system mechanics

**I need quick reference material:**
→ Use: [ERC8004_QUICK_REFERENCE.md](ERC8004_QUICK_REFERENCE.md)
- Tables with key files and contracts
- Agent TokenID reference
- API endpoints
- Configuration and addresses
- Error codes and debugging

**I want an overview:**
→ Read: [DOCUMENTATION_SUMMARY.md](DOCUMENTATION_SUMMARY.md)
- Index of all documentation
- Key concepts explained
- File organization
- Quick start guide
- Critical integration points

---

## Project Overview

This zkML news oracle system combines four major technologies:

1. **ERC-8004**: Agent identity, capability tracking, and reputation management
2. **X402**: HTTP 402 Payment Required protocol for pay-per-use services
3. **zkML**: JOLT-Atlas + Groth16 zero-knowledge proofs
4. **Base Mainnet**: Autonomous trading with Uniswap V3

### System Architecture

```
┌─────────────────────────────────────────┐
│  ERC-8004 Agents (Base Mainnet)        │
├─────────────────────────────────────────┤
│  Token #1: Oracle (news classification) │
│  Token #2: Trading Agent                │
│  Token #3: Validator (proof verifier)   │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼──────────────┐
        │  X402 Payment       │
        │  System             │
        │                     │
        │ • Discovery API     │
        │ • Payment Request   │
        │ • Verification     │
        └──────┬──────────────┘
               │
        ┌──────▼──────────────┐
        │  News Service       │
        │  (Off-Chain)        │
        │                     │
        │ • Classifier       │
        │ • Poster            │
        │ • Trader            │
        └─────────────────────┘
```

---

## Key Concepts

### ERC-8004: Verifiable AI Agent Standard

Each agent is represented by an NFT token:
- **Token #1 (Oracle)**: News classification capability with reputation tracking
- **Token #2 (Trading Agent)**: Executes trades based on oracle reputation
- **Token #3 (Validator)**: Verifies proofs and updates oracle reputation

Reputation is tracked on a scale of 0-1000:
- Initial: 250
- Rewards: +10 per correct prediction
- Penalties: -20 × consecutive_failures per incorrect prediction
- Bonuses: +50 per 10 consecutive correct predictions

### X402: HTTP 402 Payment Required

The oracle offers a pay-per-use classification service:

1. **Discovery**: `GET /.well-known/payment` - Service discovery endpoint (RFC 5785)
2. **Pricing**: `GET /api/pricing` - Returns price ($0.25 USDC)
3. **Payment Request**: `POST /api/payment-request` - Creates payment instructions
4. **Verification**: Post USDC transfer to oracle wallet
5. **Service**: `POST /api/classify` - Receive classification after payment

### zkML Proofs

Three-stage proof generation:
1. **ONNX Inference**: JOLT-Atlas generates JOLT proof
2. **Groth16 Wrapping**: JOLT proof wrapped in Groth16
3. **On-Chain Verification**: Groth16 proof verified in contract

---

## Critical Integration Points

### 1. Agent Identity in Classifications

Every classification stores the oracle's ERC-8004 token ID:
```solidity
NewsClassification {
    ...
    uint256 oracleTokenId;  // Links to Token #1
}
```

This creates an immutable link between the classification and the agent's identity.

### 2. Reputation-Based Trading

Before executing trades, the trading agent checks the oracle's reputation:
```solidity
uint256 oracleReputation = getReputationScore(news.oracleTokenId, "news_classification");
require(oracleReputation >= minOracleReputation, "Oracle reputation too low");
```

Only oracles with reputation >= 50 have their classifications acted upon.

### 3. Payment Verification

X402 payment verification uses on-chain data:
```javascript
// Verify USDC transfer from transaction receipt
1. Get receipt from Base Mainnet
2. Parse USDC Transfer logs
3. Check recipient = oracle wallet
4. Check amount >= 0.25 USDC
5. Check timestamp within 24 hours
```

### 4. Proof Validation Chain

```
Proof submitted → Validator verifies → submitValidation(approved)
  → increaseReputation(oracleTokenId, 10) if approved
  → decreaseReputation(oracleTokenId, 5) if rejected
```

---

## Deployed Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| ZkMLVerificationRegistry | 0x909fbFbFE9F7Bdb4d1a6e02F2E91d3f367555b07 |
| NewsClassificationOracle | 0xe92c7aE9E894a8701583a43363676ff878d5b6ed |
| ValidationRegistry | 0x04C6276830DA145ee465194131B7beC22aa2d0d3 |
| TradingAgentBase | 0x0D43DC16eFC1322Df3CE2B2852558993918A122B |
| NewsVerifier | 0x0590f2DFa80BCCc948aDb992737305f2FD01ceba |

---

## Key Files Reference

### Smart Contracts

- `contracts/src/ZkMLVerificationRegistry.sol` - Identity registry and reputation tracking
- `contracts/src/NewsClassificationOracle.sol` - Oracle that posts classifications with tokenId
- `contracts/src/ValidationRegistry.sol` - Validation request/response lifecycle
- `contracts/src/TradingAgentBase.sol` - Trading agent that checks oracle reputation
- `contracts/src/NewsVerifier.sol` - Proof verifier contract

### Off-Chain Services

- `news-service/src/x402Service.js` - X402 payment verification service
- `news-service/src/index.js` - REST API with payment endpoints
- `news-service/src/poster.js` - Posts classifications to oracle contract
- `news-service/src/classifier.js` - ONNX → JOLT → Groth16 pipeline
- `news-service/src/baseTrader.js` - Listens for classifications and executes trades

---

## API Endpoints

### Free (No Payment)

```
GET /.well-known/payment
  → X402 metadata and service discovery

GET /api/pricing
  → Pricing information

POST /api/demo/classify
  → Free classification (mock proof)
```

### Paid (X402)

```
POST /api/payment-request
  Body: { "headline": "..." }
  → Payment instructions with calldata

POST /api/classify
  Body: { "headline": "...", "paymentTx": "0x...", "requestId": "..." }
  → Verified classification after payment
```

---

## Complete Data Flow

```
1. NEWS INGESTION
   CoinDesk RSS → News items

2. CLASSIFICATION (OPTIONAL PAYMENT)
   Headline → ONNX → JOLT → Groth16 Proof
   If paid: Verify USDC transfer on Base Mainnet

3. ON-CHAIN POSTING
   newsOracle.postClassification(..., oracleTokenId=1)
   Stores: classificationId linked to oracle identity

4. VALIDATION REQUEST
   validationRegistry.requestValidation(..., agentTokenId=1)

5. AUTONOMOUS TRADING
   NewsClassified event detected
   Get oracle reputation from registry
   If reputation >= 50: Execute trade

6. PROOF VERIFICATION
   Validator verifies Groth16 proof
   submitValidation(approved)
   Oracle reputation updated: ±10 points

7. PROFITABILITY EVALUATION
   Trade evaluated after delay
   Results stored in contract
```

---

## Configuration

Essential environment variables:

```bash
# Blockchain
BASE_MAINNET_RPC_URL=https://mainnet.base.org
ORACLE_PRIVATE_KEY=0x...

# Contracts
ZKML_VERIFICATION_REGISTRY=0x909fbFbFE9F7Bdb4d1a6e02F2E91d3f367555b07
NEWS_ORACLE_ADDRESS=0xe92c7aE9E894a8701583a43363676ff878d5b6ed
VALIDATION_REGISTRY=0x04C6276830DA145ee465194131B7beC22aa2d0d3
TRADING_AGENT_ADDRESS=0x0D43DC16eFC1322Df3CE2B2852558993918A122B

# Service
POLL_INTERVAL_MINUTES=5
MIN_CONFIDENCE_THRESHOLD=60
USE_REAL_PROOFS=true
ENABLE_AUTO_TRADE=true
```

---

## Documentation Quick Links

| Document | Purpose | Length |
|----------|---------|--------|
| [ERC8004_X402_INTEGRATION_ANALYSIS.md](ERC8004_X402_INTEGRATION_ANALYSIS.md) | Complete architectural analysis | 1,273 lines |
| [ERC8004_QUICK_REFERENCE.md](ERC8004_QUICK_REFERENCE.md) | Quick lookup tables and snippets | 300+ lines |
| [DOCUMENTATION_SUMMARY.md](DOCUMENTATION_SUMMARY.md) | Overview and navigation guide | 300+ lines |

---

## Next Steps

1. **Read the full analysis**: [ERC8004_X402_INTEGRATION_ANALYSIS.md](ERC8004_X402_INTEGRATION_ANALYSIS.md) (Sections 1-5)
2. **Reference the quick guide**: [ERC8004_QUICK_REFERENCE.md](ERC8004_QUICK_REFERENCE.md)
3. **Review contract code**: `/contracts/src/`
4. **Review services**: `/news-service/src/`
5. **Test locally**: Follow deployment instructions

---

## Questions?

- **Architecture questions**: See ERC8004_X402_INTEGRATION_ANALYSIS.md
- **Quick lookup**: Use ERC8004_QUICK_REFERENCE.md
- **Navigation help**: Check DOCUMENTATION_SUMMARY.md
- **Code**: Review source files in `/contracts/src/` and `/news-service/src/`

---

Generated with Claude Code | October 25, 2024
