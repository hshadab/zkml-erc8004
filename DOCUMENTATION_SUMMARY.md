# zkML News Oracle - Complete Documentation Index

## Overview

This repository implements a fully autonomous, verifiable, and monetized AI oracle system combining:
- **ERC-8004**: Verifiable AI Agent standard for on-chain identity and reputation
- **X402**: HTTP 402 Payment Required protocol for pay-per-use services
- **zkML**: JOLT-Atlas + Groth16 for zero-knowledge proof verification
- **Base Mainnet**: Deployed contracts for autonomous trading

## Documentation Files

### 1. **ERC8004_X402_INTEGRATION_ANALYSIS.md** (1273 lines)
**Comprehensive architectural deep-dive covering:**

- **Section 1**: ERC-8004 Contract Architecture
  - ZkMLVerificationRegistry (identity registry, reputation tracking)
  - NewsClassificationOracle (oracle posting with tokenId)
  - ValidationRegistry (proof validation lifecycle)
  - TradingAgentBase (reputation-aware autonomous trading)

- **Section 2**: Agent TokenID Usage
  - Token #1: News Oracle
  - Token #2: Trading Agent
  - Token #3: Validator
  - Registration, configuration, and runtime usage

- **Section 3**: Proof Submission & Verification
  - End-to-end classification flow
  - ONNX → JOLT → Groth16 pipeline
  - On-chain proof storage with tokenId linkage

- **Section 4**: X402 Payment System
  - Payment discovery endpoint (/.well-known/payment)
  - Payment request creation
  - On-chain payment verification
  - Replay protection and timing checks

- **Section 5**: Integration Points
  - X402 payment verification
  - Classification posting
  - Reputation-based access control

- **Section 6-12**: Architecture diagrams, deployment details, security, future enhancements

**Use this file for:**
- Understanding complete system architecture
- Learning how ERC-8004 and X402 work together
- Detailed contract interactions
- Proof verification flows
- Payment mechanics

### 2. **ERC8004_QUICK_REFERENCE.md** (300+ lines)
**Fast lookup guide with tables and code snippets:**

- Key files and contracts at a glance
- Agent TokenID quick reference
- Critical flow paths (3 main flows)
- API endpoints (free and paid)
- Reputation mechanics
- Proof flow details
- Environment variables
- Deployed addresses
- Common tasks
- Error codes
- Debugging tips

**Use this file for:**
- Quick lookups during development
- API endpoint reference
- Configuration checklist
- Deployed address reference
- Troubleshooting

## Key Concepts Explained

### ERC-8004: Verifiable AI Agent Standard

```
What it provides:
├─ Agent Identity: NFT token (tokenId) for each agent
├─ Capability Tracking: What each agent can do (e.g., "news_classification")
├─ Reputation System: Score from 0-1000 based on accuracy
├─ Proof Registry: Track proofs submitted by agents
└─ Validation Lifecycle: Request → Verify → Update Reputation

In this project:
├─ Oracle (tokenId=1): Classifies news with JOLT-Atlas proofs
├─ TradingAgent (tokenId=2): Executes trades based on oracle reputation
└─ Validator (tokenId=3): Verifies Groth16 proofs
```

### X402: HTTP 402 Payment Protocol

```
What it provides:
├─ Service Discovery: /.well-known/payment endpoint
├─ Payment Instructions: How to pay for service
├─ Pricing: Fixed or dynamic pricing
└─ Payment Verification: On-chain transaction validation

In this project:
├─ Payment: $0.25 USDC on Base Mainnet
├─ Method: Direct USDC transfer to oracle wallet
├─ Verification: Parse receipt for Transfer logs
└─ Idempotency: Track used payments to prevent replay
```

### zkML Proofs

```
Architecture:
ONNX Model (classifier)
  → JOLT-Atlas (generates JOLT proof)
    → Groth16 Wrapper (wraps JOLT in Groth16)
      → On-chain Verification (Groth16Verifier contract)

Storage:
├─ Off-chain: Full proofs (Groth16)
├─ On-chain: Proof hash only (gas efficient)
└─ Classification: Linked to oracle tokenId
```

## System Architecture Summary

```
BASE MAINNET BLOCKCHAIN
├─ ZkMLVerificationRegistry: Agent registry & reputation
├─ NewsClassificationOracle: Oracle (token #1)
├─ ValidationRegistry: Validation request/response
├─ TradingAgentBase: Trading agent (token #2)
├─ NewsVerifier: Validator (token #3)
└─ Groth16Verifier: Proof verification

OFF-CHAIN SERVICES
├─ News Service (port 3000)
│  ├─ X402 Payment Service
│  ├─ News Fetcher (CoinDesk RSS)
│  ├─ zkML Classifier (JOLT + Groth16)
│  ├─ Oracle Poster
│  └─ REST API
│
└─ Trading Service
   ├─ Event Listener (NewsClassified)
   ├─ Reputation Checker
   ├─ Trade Executor (Uniswap V3)
   └─ Profitability Evaluator
```

## Data Flow: Complete Cycle

```
1. NEWS INGESTION
   CoinDesk RSS → News items

2. CLASSIFICATION
   Headline → ONNX Inference → JOLT Proof → Groth16 Proof
   Output: sentiment, confidence, proofHash

3. OPTIONAL PAYMENT (X402)
   POST /api/payment-request
   → POST USDC transfer
   → POST /api/classify (with txHash)

4. ON-CHAIN POSTING
   newsOracle.postClassification(headline, sentiment, confidence, proofHash)
   Stores: classificationId, oracleTokenId=1

5. VALIDATION REQUEST
   ValidationRegistry.requestValidation(classificationId, workHash, tokenId=1)

6. TRADING (Optional)
   Event: NewsClassified emitted
   Listener: Detects event, extracts oracleTokenId
   Trading Agent: 
     - Get reputation(tokenId=1)
     - If reputation >= minOracleReputation:
       - Execute trade (BUY/SELL)
       - Evaluate profitability

7. REPUTATION UPDATE
   Validator verifies proof → submitValidation(approved)
   Registry updates: increaseReputation(1, 10) or decreaseReputation(1, 5)

8. CYCLE COMPLETE
   Reputation score reflects oracle accuracy
   Affects future trading decisions and X402 pricing
```

## File Organization

```
zkml-erc8004/
├─ ERC8004_X402_INTEGRATION_ANALYSIS.md    ← Deep architectural guide
├─ ERC8004_QUICK_REFERENCE.md               ← Fast lookup reference
├─ DOCUMENTATION_SUMMARY.md                 ← This file
│
├─ contracts/
│  ├─ src/
│  │  ├─ ZkMLVerificationRegistry.sol       ← ERC-8004 registry
│  │  ├─ NewsClassificationOracle.sol       ← Oracle contract
│  │  ├─ ValidationRegistry.sol             ← Validation lifecycle
│  │  ├─ TradingAgentBase.sol              ← Trading contract
│  │  ├─ NewsVerifier.sol                  ← Proof verifier
│  │  └─ interfaces/
│  │     ├─ IERC8004.sol                   ← ERC-8004 interface
│  │     └─ IZkMLVerificationRegistry.sol  ← Extended interface
│  │
│  └─ deploy-erc8004-v3.js                 ← Deployment script
│
├─ news-service/
│  ├─ src/
│  │  ├─ index.js                          ← REST API + X402
│  │  ├─ x402Service.js                    ← Payment verification
│  │  ├─ poster.js                         ← Oracle posting
│  │  ├─ classifier.js                     ← zkML pipeline
│  │  ├─ baseTrader.js                     ← Trading service
│  │  └─ featureExtractor.js               ← Feature extraction
│  │
│  └─ package.json                         ← Dependencies
│
├─ ui/                                      ← Frontend dashboard
└─ render.yaml                              ← Deployment config
```

## Quick Start

### 1. View the Architecture
Read: `ERC8004_X402_INTEGRATION_ANALYSIS.md` (Sections 1-5)

### 2. Understand Token Usage
Read: `ERC8004_QUICK_REFERENCE.md` (Agent TokenID Reference section)

### 3. Check Key Contracts
- `contracts/src/ZkMLVerificationRegistry.sol` - Identity registry
- `contracts/src/NewsClassificationOracle.sol` - Oracle posting
- `contracts/src/TradingAgentBase.sol` - Reputation-aware trading

### 4. Check Off-Chain Services
- `news-service/src/x402Service.js` - Payment verification
- `news-service/src/index.js` - REST API
- `news-service/src/baseTrader.js` - Trading automation

### 5. Deploy Locally
See: `ERC8004_QUICK_REFERENCE.md` (Common Tasks section)

## Critical Integration Points

### 1. Oracle Identity (ERC-8004)
```
Every classification stores:
  NewsClassification.oracleTokenId = 1
This immutably links the news to the oracle agent.
```

### 2. Payment Verification (X402)
```
Verify on-chain USDC transfer:
  1. Get receipt from Base Mainnet
  2. Parse USDC Transfer logs
  3. Check recipient = oracle wallet
  4. Check amount >= 0.25 USDC
  5. Check timestamp within 24 hours
```

### 3. Reputation-Based Trading
```
Before executing trade:
  1. Get oracle tokenId from classification
  2. Query reputation(tokenId, "news_classification")
  3. Require reputation >= minOracleReputation (50)
  4. Only trade if reputation passes threshold
```

### 4. Proof Verification
```
Classification → Proof Hash → ValidationRegistry
  → Validator verifies full proof
    → submitValidation(approved)
      → Update oracle reputation
        → Affects future trading decisions
```

## Deployed Addresses (Base Mainnet)

| Contract | Address |
|----------|---------|
| ZkMLVerificationRegistry | 0x909fbFbFE9F7Bdb4d1a6e02F2E91d3f367555b07 |
| NewsClassificationOracle | 0xe92c7aE9E894a8701583a43363676ff878d5b6ed |
| ValidationRegistry | 0x04C6276830DA145ee465194131B7beC22aa2d0d3 |
| TradingAgentBase | 0x0D43DC16eFC1322Df3CE2B2852558993918A122B |
| NewsVerifier | 0x0590f2DFa80BCCc948aDb992737305f2FD01ceba |

## API Endpoints Summary

```
Free (No Payment):
  GET /.well-known/payment
  GET /api/pricing
  POST /api/demo/classify

Paid (X402):
  POST /api/payment-request
  POST /api/classify (requires paymentTx)
```

## Key Metrics

- **Reputation Range**: 0-1000
- **Initial Reputation**: 250
- **Min Oracle Reputation for Trading**: 50
- **Payment Amount**: $0.25 USDC
- **Payment Deadline**: 24 hours from tx
- **Request Expiration**: 10 minutes
- **Poll Interval**: 5 minutes (configurable)
- **Confidence Threshold**: 60% (configurable)

## Support & Resources

### Architecture Questions
→ See: `ERC8004_X402_INTEGRATION_ANALYSIS.md`

### Implementation Details
→ See: `ERC8004_QUICK_REFERENCE.md`

### Contract Code
→ See: `/contracts/src/`

### Off-Chain Services
→ See: `/news-service/src/`

### Debugging
→ See: `ERC8004_QUICK_REFERENCE.md` (Tips & Debugging section)

## Version Info

- **Last Updated**: October 25, 2024
- **Network**: Base Mainnet (Chain ID: 8453)
- **zkML System**: JOLT-Atlas + Groth16
- **Payment Token**: USDC
- **ERC-8004 Version**: Implementation v1.0
- **X402 Standard**: HTTP 402 Payment Required

---

## Next Steps

1. **For Architecture Understanding**: Read ERC8004_X402_INTEGRATION_ANALYSIS.md
2. **For Quick Reference**: Use ERC8004_QUICK_REFERENCE.md
3. **For Implementation**: Check specific contract/service files
4. **For Deployment**: Run `contracts/deploy-erc8004-v3.js`
5. **For Testing**: Start news-service with `node src/index.js`

---

**This documentation provides complete coverage of ERC-8004 + X402 integration in the zkML news oracle system.**

