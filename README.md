# zkML News Oracle - ERC-8004 Autonomous Trading Agent

A production-ready implementation of **ERC-8004 (Verifiable AI Agents)** that combines zero-knowledge machine learning with autonomous on-chain trading.

## Overview

This system demonstrates a complete pipeline from AI inference to blockchain execution:

1. **zkML Classification**: ONNX sentiment model with JOLT zero-knowledge proofs
2. **On-Chain Verification**: Groth16 proof verification on Base Sepolia
3. **Autonomous Trading**: ERC-8004 compliant agent that executes trades based on verified classifications
4. **Real-Time Dashboard**: Live UI showing classifications, trades, and portfolio performance

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     zkML Classification Pipeline                 │
├─────────────────────────────────────────────────────────────────┤
│  News Article → ONNX Model → JOLT Proof → Groth16 Wrapper      │
│       (8ms)         (20s)         (1.5s)                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Base Sepolia Blockchain                       │
├─────────────────────────────────────────────────────────────────┤
│  NewsOracle.submitClassification()                              │
│  NewsVerifier.verify() ← Groth16 proof verification             │
│  VerificationRegistry ← ERC-8004 registry                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Autonomous Trading Agent                      │
├─────────────────────────────────────────────────────────────────┤
│  TradingAgent.reactToNews(classificationId)                     │
│    - Verify classification is verified via ERC-8004             │
│    - Check confidence threshold (≥60%)                          │
│    - Execute Uniswap V3 swap (WETH ↔ USDC)                     │
│    - Record trade on-chain                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Real-Time Dashboard UI                        │
├─────────────────────────────────────────────────────────────────┤
│  Express.js + Vanilla JS                                        │
│  Auto-refresh: 10s                                              │
│  Displays: Classifications, Trades, Portfolio, Stats            │
└─────────────────────────────────────────────────────────────────┘
```

## Contract Addresses (Base Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| NewsOracle | `0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a` | Stores classifications |
| NewsVerifier | `0x76a96c27BE6c96415f93514573Ee753582ebA5E6` | Verifies Groth16 proofs |
| TradingAgent | `0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44` | Executes autonomous trades |
| VerificationRegistry | `0xC9a94a1168eB7ad8146f26B8F5dFcdC50d0Eb33E` | ERC-8004 registry |

## Features

### 🔐 Zero-Knowledge ML
- ONNX sentiment classification with cryptographic proofs
- JOLT zkVM for ML inference verification (~20 seconds)
- Groth16 wrapper for on-chain verification (~1.5 seconds)
- Complete provenance from training data to blockchain

### 🤖 ERC-8004 Compliance
- Verifiable AI agent standard implementation
- On-chain reputation tracking (250 reputation)
- Proof-based action authorization
- Transparent decision-making

### 💹 Autonomous Trading
- Uniswap V3 integration (WETH/USDC pair)
- Confidence-based trade sizing (60% threshold)
- Balance and safety checks
- On-chain trade recording

### 📊 Real-Time Dashboard
- Live classification feed
- Trade execution history
- Portfolio performance metrics
- WebSocket-free auto-refresh (10s polling)

## Quick Start

### Prerequisites

```bash
# Node.js 18+ required
node --version

# Install dependencies
npm install
```

### Environment Setup

Create `.env` in project root:

```bash
# Blockchain Configuration
BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com
ORACLE_PRIVATE_KEY=your_private_key_here

# Contract Addresses
NEWS_ORACLE_ADDRESS=0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a
NEWS_VERIFIER_ADDRESS=0x76a96c27BE6c96415f93514573Ee753582ebA5E6
TRADING_AGENT_ADDRESS=0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44
VERIFICATION_REGISTRY_ADDRESS=0xC9a94a1168eB7ad8146f26B8F5dFcdC50d0Eb33E

# zkML Configuration
ZKML_CLASSIFIER_PATH=/path/to/agentkit/jolt-atlas/onnx-tracer
ZKML_CORE_PATH=/path/to/agentkit/jolt-atlas/target/release/zkml-jolt-core
```

### Running the Dashboard UI

```bash
cd ui
npm install
node server.js
```

The UI will be available at `http://localhost:3001`

**WSL2 Users**: Access from Windows browser via WSL2 IP (e.g., `http://172.30.160.70:3001`)

### E2E Demo: Submit Article → Trade

```bash
cd zkml-service
node submitArticle.js "Bitcoin Hits New Record High as Institutional Adoption Surges"
```

This will:
1. ✅ Generate zkML classification (JOLT + Groth16, ~26 seconds)
2. ✅ Post to Base Sepolia with on-chain verification
3. ✅ Return classification ID

Then execute the trade:

```bash
cd ../trading-service
# Edit tradeNewClassification.js with your classification ID
node tradeNewClassification.js
```

Watch the dashboard update in real-time with the new classification and trade!

## System Flow

### 1. zkML Classification (26 seconds)

```
Article Headline
    ↓
ONNX Tokenizer (8ms)
    ↓
ONNX Sentiment Model (8ms)
    → Output: sentiment=1 (bearish), confidence=60%
    ↓
JOLT zkVM Proof (20 seconds)
    → Proves correct execution of ML inference
    ↓
Groth16 Wrapper (1.5 seconds)
    → Blockchain-verifiable proof
    ↓
Classification Ready for On-Chain Submission
```

### 2. On-Chain Posting (8 seconds)

```
NewsOracle.submitClassification()
    → Posts headline, sentiment, confidence, proof hash
    → Gas: ~285k
    → TX: 0x839f59...
    ↓
NewsVerifier.verify(proof, publicSignals)
    → Verifies Groth16 proof on-chain
    → Gas: ~493k
    → TX: 0x14ec7e...
    ↓
Classification ID: 0xb742c9...
```

### 3. Autonomous Trade Execution (5 seconds)

```
TradingAgent.reactToNews(classificationId)
    ↓
Check 1: Is classification verified? ✅
    → VerificationRegistry.isVerified(classificationId)
    ↓
Check 2: Confidence ≥ 60%? ✅
    ↓
Check 3: Sufficient WETH balance? ✅
    → Requires: 0.001 WETH minimum
    ↓
Execute Uniswap V3 Swap
    → Bearish: Swap WETH → USDC
    → Bullish: Swap USDC → WETH
    → Amount: Scaled by confidence (60% = 0.0006 WETH)
    ↓
Record Trade On-Chain
    → Store: action, amount, price, timestamp
    → TX: 0x6e6d2f...
```

### 4. UI Update (automatic)

The dashboard polls every 10 seconds:
- `/api/classifications` - Fetches `NewsClassified` events
- `/api/trades` - Fetches trade state from contract
- `/api/stats` - Aggregated metrics
- `/api/portfolio` - Current holdings

## Dashboard UI Explanation

### 📊 Statistics Panel
- **Total Classifications**: Count of all sentiment analyses
- **Total Trades**: Executed swaps based on classifications
- **Success Rate**: Percentage of classifications that led to trades
- **Average Confidence**: Mean confidence across all classifications

### 📰 Recent Classifications
Each card shows:
- **Headline**: The news article analyzed
- **Sentiment**: GOOD (bullish) or BAD (bearish)
- **Confidence**: 0-100% (trades execute at ≥60%)
- **Verified**: ✓ if Groth16 proof verified on-chain
- **Timestamp**: When classification was posted
- **Classification ID**: On-chain identifier

### 💹 Recent Trades
Each card shows:
- **Action**: SELL WETH (bearish) or BUY WETH (bullish)
- **Amount**: WETH quantity traded
- **Price**: WETH/USDC exchange rate
- **Linked Classification**: Shows the news that triggered the trade
- **Timestamp**: Execution time

### 💰 Portfolio
Current holdings:
- **WETH Balance**: Wrapped Ether
- **USDC Balance**: Stablecoin
- **Total Value**: USD equivalent

### 🔗 ERC-8004 Registry
Shows all registered AI agents and verifiers in the ecosystem.

## Technical Deep Dive

### Why JOLT + Groth16?

**JOLT zkVM**:
- Proves correct execution of arbitrary computations
- Handles ONNX model inference
- Generates large proofs (~20 seconds)
- Not directly verifiable on-chain (gas too expensive)

**Groth16 Wrapper**:
- Wraps JOLT proof in blockchain-verifiable format
- Constant size proof (~256 bytes)
- Fast verification (~493k gas, 1.5 seconds)
- Enables on-chain trust

### Event vs State-Based Data Fetching

The UI server uses **hybrid approach**:

**Classifications**: Event-based
```javascript
// Fast: Query event logs
const filter = oracleContract.filters.NewsClassified();
const events = await oracleContract.queryFilter(filter);
```

**Trades**: State-based
```javascript
// Necessary: TradingAgent doesn't emit events
const classificationId = await oracleContract.getClassificationIdByIndex(i);
const trade = await agentContract.getTradeDetails(classificationId);
```

Why? The deployed TradingAgent contract has `TradeExecuted` event defined but doesn't emit it. Transaction receipts show `logs: []`. Solution: Iterate through classifications and fetch trade state directly.

### Why Some Trades Don't Execute

A classification can be verified but not traded if:
1. **Confidence too low**: <60% threshold
2. **Insufficient balance**: Agent needs ≥0.001 WETH
3. **Already processed**: Can't trade same classification twice
4. **Reputation too low**: Agent needs ≥100 reputation

The stats show `processedClassifications` count (classifications the agent checked) vs actual trades executed.

## Project Structure

```
zkml-erc8004/
├── contracts/              # Solidity smart contracts
│   ├── src/
│   │   ├── NewsClassificationOracleVerified.sol
│   │   ├── NewsClassificationVerifier.sol
│   │   ├── TradingAgent.sol
│   │   └── VerificationRegistry.sol
│   └── foundry.toml
├── zkml-service/          # zkML classification service
│   ├── classifier.js      # ONNX + JOLT + Groth16 pipeline
│   ├── submitArticle.js   # E2E article submission
│   └── blockchain.js      # On-chain posting logic
├── trading-service/       # Autonomous trading service
│   ├── monitor.js         # Event listener for new classifications
│   └── tradeNewClassification.js  # Manual trade execution
├── ui/                    # Dashboard frontend + backend
│   ├── server.js          # Express.js API server
│   ├── public/
│   │   ├── index.html     # Dashboard UI
│   │   └── style.css
│   └── .env
└── README.md
```

## Security Features

### zkML Provenance
- Every classification includes cryptographic proof
- Proof hash stored on-chain (0x96f931...)
- Verification result recorded in ERC-8004 registry
- Tamper-proof audit trail from training to execution

### Trading Safety
- Confidence threshold prevents low-certainty trades
- Balance checks prevent overdraft
- Single-execution guarantee (processed mapping)
- Reputation-based authorization

### Smart Contract Design
- Immutable proof verification logic
- Event-based transparency
- State recorded on-chain for all trades
- ERC-8004 compliant agent discovery

## Performance Metrics

**E2E Test Results** (Real CoinDesk article: "Huobi founder Li Lin..."):

| Phase | Time | Details |
|-------|------|---------|
| ONNX Inference | 8ms | Tokenization + model forward pass |
| JOLT Proof | 24.6s | zkVM proof generation |
| Groth16 Wrapper | 1.7s | Blockchain-verifiable proof |
| **Total Classification** | **26.3s** | Complete zkML pipeline |
| On-Chain Posting | 4.2s | Submit classification (285k gas) |
| On-Chain Verification | 4.5s | Verify proof (493k gas) |
| Trade Execution | 2.1s | Uniswap swap + record (varies) |
| **Total E2E** | **~37s** | Article → Trade on-chain |

## Known Limitations

1. **JOLT Proof Time**: 20+ seconds makes real-time trading challenging
2. **Gas Costs**: ~775k gas total (~$0.10 on Base Sepolia)
3. **No Trade Events**: Deployed contract doesn't emit `TradeExecuted` (requires state-based fetching)
4. **WSL2 Networking**: Windows users need WSL2 IP for browser access
5. **Vocabulary Limited**: Model trained on 60-word vocabulary

## Future Improvements

- [ ] Parallel proof generation for multiple articles
- [ ] Event emission for trades (contract upgrade)
- [ ] Dynamic confidence thresholds based on market volatility
- [ ] Multi-token support (beyond WETH/USDC)
- [ ] WebSocket for real-time UI updates
- [ ] Proof caching and batch verification

## License

MIT

## Links

- **Base Sepolia Explorer**: https://sepolia.basescan.org/
- **ERC-8004 Spec**: [Verifiable AI Agents Standard]
- **JOLT zkVM**: https://github.com/a16z/jolt
- **Groth16**: [Zero-Knowledge Proof System]

## Acknowledgments

Built with:
- Ethers.js v6
- ONNX Runtime
- JOLT zkVM
- snarkjs (Groth16)
- Foundry
- Uniswap V3
