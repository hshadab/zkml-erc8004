# zkML News Oracle - ERC-8004 Autonomous Trading Agent

**Live on Base Mainnet (Chain ID: 8453)**

A production-ready implementation of **ERC-8004 (Verifiable AI Agents)** integrated with **X402 (HTTP 402 Payment Required)** that combines zero-knowledge machine learning with micropayment-verified autonomous trading.

## What This App Does (Plain English)

Imagine an AI agent that:
1. **Reads crypto news** every 5 minutes from CoinDesk
2. **Analyzes sentiment** using a neural network ("Is this bullish or bearish?")
3. **Proves it did the analysis correctly** using zero-knowledge cryptography
4. **Posts the analysis on-chain** to Base Mainnet blockchain
5. **Automatically trades** based on the sentiment (buy ETH if bullish, sell if bearish)
6. **Tracks its performance** and builds reputation over time

All of this happens autonomously, without human intervention, and everything is verifiable on-chain.

### The ERC-8004 + X402 Synergy (Mutually Reinforcing Relationship)

This app showcases how **ERC-8004** (Verifiable AI Agents) and **X402** (HTTP 402 Payment Required) create a powerful feedback loop:

**ERC-8004** provides:
- **Agent Identity**: The AI is registered as agent #1 with a reputation score
- **Capability Tracking**: Records what the agent can do ("news_classification")
- **Proof Verification**: Validates that the AI's work is cryptographically correct
- **Reputation System**: Tracks accuracy over time (starts at 100, increases with verified predictions)

**X402** adds:
- **Payment Verification**: Users pay in USDC for each classification request
- **Economic Accountability**: Payments create a financial stake in accuracy
- **Dynamic Pricing**: Price adjusts based on ERC-8004 reputation (better reputation = higher price)
- **Revenue Stream**: The AI earns money, making it economically sustainable

**The Reinforcing Cycle**:
```
Higher Reputation (ERC-8004)
    ↓
Higher Price (X402)
    ↓
More Revenue
    ↓
Better Incentive to Maintain Accuracy
    ↓
More Verified Predictions
    ↓
Higher Reputation (ERC-8004)
    ↓
[CYCLE REPEATS]
```

**Payment Boosts Reputation**:
- Free classifications: Base reputation increase
- Paid classifications (X402): **+5 bonus reputation**
- This incentivizes the AI to serve paying customers well

**Reputation Sets Price**:
- Reputation 0-100: $0.15 per classification
- Reputation 100-200: $0.25
- Reputation 200-400: $0.50
- Reputation 400-700: $0.75
- Reputation 700+: $1.00

So as the AI proves itself (ERC-8004), it earns the right to charge more (X402), which funds continued operation and incentivizes accuracy. This creates a self-sustaining, economically rational AI agent.

## System Architecture

This system demonstrates a complete pipeline from AI inference to blockchain execution:

1. **zkML Classification**: ONNX sentiment model with JOLT zero-knowledge proofs
2. **On-Chain Verification**: Groth16 proof verification on Base Mainnet
3. **X402 Payment Integration**: HTTP 402 micropayments in USDC with reputation-based pricing
4. **Autonomous Trading**: ERC-8004 compliant agent that executes trades based on verified classifications
5. **Real-Time Dashboard**: Live UI showing classifications, trades, portfolio, and reputation

## Live Demo

**Dashboard**: `http://localhost:3001` (after setup)

The system runs continuously:
- News service polls CoinDesk RSS every 5 minutes
- Classifies sentiment using ONNX neural network
- Generates real zkML proofs (JOLT + Groth16)
- Posts to Base Mainnet
- Executes autonomous trades on Uniswap V3
- Dashboard auto-refreshes every 10 seconds

## Contract Addresses (Base Mainnet)

**Latest Deployment: October 27, 2025** ✨

| Contract | Address | Purpose |
|----------|---------|---------|
| **ZkMLVerificationRegistry** | `0x0D5F44E626E56b928c273460C73bfe724aef977A` | ERC-8004 registry with payment tracking |
| **Groth16Verifier** | `0x8dEd762207A6493b229Ccd832E1445B51522807e` | Verifies zkSNARK proofs |
| **NewsVerifier** | `0xb4c9f9fDEBeD2cB8350E9165Dbd319b14e7cE1Af` | News classification verifier |
| **ValidationRegistry** | `0x0f556d976FA29f0BF678e2367F5E99fa1261f93e` | ERC-8004 validation registry |
| **NewsClassificationOracle** | `0xfe47ba256043617f4acaF0c74Af25ba95be61b95` | Oracle with X402 integration |
| **TradingAgentBase** | `0xA03cAdb9cfA3CD8048172f1C127706a9B7C88782` | Autonomous trading agent (WORKING) |

**Oracle Token ID**: `1` (ERC-8004 agent registration)
**Network**: Base Mainnet
**Chain ID**: 8453
**RPC**: Alchemy (free tier: 300M CU/month)
**Explorer**: https://basescan.org

### 🆕 New Features (ERC-8004 + X402 Integration)

- ✅ **Payment-Verified Reputation**: On-chain USDC payment tracking (+5 bonus reputation)
- ✅ **Dynamic Pricing**: Reputation-based pricing (5 tiers: $0.15 - $1.00)
- ✅ **X402 Protocol**: HTTP 402 Payment Required for autonomous agents
- ✅ **On-Chain Payment Records**: PaymentRecorded events for transparency

## How It Works - Step by Step

### Phase 1: News Ingestion (Every 5 Minutes)

```
News Service Polls CoinDesk RSS
    ↓
Fetches Latest Headlines
    → Example: "Bitcoin Surges Past $100k as ETFs Drive Demand"
    ↓
Extracts Article Text
    → Parses RSS feed
    → Grabs headline + summary
```

### Phase 2: zkML Classification (~20 Seconds)

```
Article Headline
    ↓
ONNX Tokenizer (8ms)
    → Converts text to numerical tokens
    → Uses 60-word vocabulary
    ↓
ONNX Sentiment Model (8ms)
    → Neural network inference
    → Output: sentiment (0=GOOD/bullish, 1=BAD/bearish)
    → Output: confidence (0-100%)
    ↓
JOLT zkVM Proof Generation (~20 seconds)
    → Proves correct execution of ML model
    → Generates cryptographic proof of inference
    → Hash: 0x96f931...
    ↓
Groth16 Wrapper (~1.5 seconds)
    → Wraps JOLT proof for blockchain verification
    → Creates compact proof (~256 bytes)
    → Verifiable on-chain in ~493k gas
    ↓
Classification Ready: {
  headline: "Bitcoin Surges...",
  sentiment: 0 (GOOD),
  confidence: 75,
  proofHash: "0x96f931..."
}
```

**Key Point**: This is REAL zkML. No mocks. The `.env` file has `USE_REAL_PROOFS=true`.

### Phase 3: On-Chain Posting (~8 Seconds)

```
NewsClassificationOracle.submitClassification()
    → Posts headline, sentiment, confidence, proof hash
    → Gas: ~285k
    → TX: https://basescan.org/tx/0x839f59...
    → Emits: NewsClassified(classificationId, ...)
    ↓
NewsVerifier.verify(proof, publicSignals)
    → Verifies Groth16 proof on-chain
    → Checks proof matches public signals
    → Gas: ~493k
    → TX: https://basescan.org/tx/0x14ec7e...
    ↓
ZkMLVerificationRegistry.recordVerification()
    → Records verified classification in ERC-8004 registry
    → Links classification to NewsVerifier contract
    → Updates oracle reputation
    ↓
Classification ID: 0xb742c9... (unique identifier)
```

### Phase 4: Autonomous Trade Decision

```
TradingAgent Monitors New Classifications
    ↓
Check 1: Is classification verified?
    → ZkMLVerificationRegistry.isVerified(classificationId)
    → Must return true (zkML proof passed)
    ↓
Check 2: Confidence ≥ 60%?
    → Below threshold = skip trade
    ↓
Check 3: Sufficient balance?
    → ETH trades require ≥0.001 ETH
    → USDC trades require ≥1 USDC
    ↓
Calculate Trade Amount
    → Base amount: 10% of balance
    → Scaled by confidence: amount = (baseAmount * confidence) / 100
    → Minimum: 0.001 ETH or 1 USDC
    ↓
Determine Trade Direction
    → Sentiment GOOD (0) = Bullish → Buy ETH (swap USDC → ETH)
    → Sentiment BAD (1) = Bearish → Sell ETH (swap ETH → USDC)
```

### Phase 5: Uniswap V3 Execution (~3 Seconds)

**Example: Bearish News (Sell ETH)**

```
Before Trade:
  Agent ETH: 0.01 ETH
  Agent USDC: 0 USDC
  Total Value: ~$35 (at $3500/ETH)

Trade Execution:
  Sentiment: BAD (1)
  Confidence: 75%
  Trade Amount: 0.001 ETH (10% of balance, min 0.001)

TradingAgent.reactToNews(classificationId)
    ↓
Approve Uniswap Router
    → WETH.approve(router, 0.001 ETH)
    ↓
Execute Swap
    → UniswapV3Router.exactInputSingle({
        tokenIn: WETH,
        tokenOut: USDC,
        fee: 500 (0.05%),
        amountIn: 0.001 ETH,
        amountOutMinimum: 3.40 USDC (slippage protection)
      })
    → Swap executes on Uniswap V3 WETH/USDC pool
    → Receives: 3.50 USDC
    ↓
Record Trade On-Chain
    → Stores: action (SELL_ETH), amount, timestamp
    → TX: https://basescan.org/tx/0x6e6d2f...
    ↓
After Trade:
  Agent ETH: 0.009 ETH
  Agent USDC: 3.50 USDC
  Total Value: ~$35 (unchanged immediately)
```

### Phase 6: Profitability Evaluation (11 Seconds Later)

```
Wait 11 Seconds
    → Allow market to react to trade
    ↓
TradingAgent.evaluateTradeProfitability(classificationId)
    ↓
Fetch Current Prices
    → Get ETH price from Uniswap pool
    → Calculate total portfolio value
    ↓
Compare Values
    → Value Before: $35.00
    → Value After: $34.85
    → P/L: -0.43% (ETH went up after we sold)
    ↓
Record Result
    → isProfitable: false
    → TX: https://basescan.org/tx/0x7f8a3b...
```

**Why Evaluate?**
The agent learns from its trades. If selling ETH on "BAD" news was unprofitable (ETH went up), this signals the sentiment model may need retraining or the news wasn't as bearish as classified.

## Dashboard UI - What You See

### Top Status Bar

```
Live on Base Mainnet
Last Updated: 2 seconds ago
```

Auto-refreshes every 10 seconds to show latest data.

### Statistics Panel

```
Total Classifications: 12
Total Trades: 8
Oracle Reputation: 250/1000
Average Confidence: 72%
```

- **Total Classifications**: All sentiment analyses posted on-chain
- **Total Trades**: Actual trades executed (some classifications don't trade if confidence <60%)
- **Oracle Reputation**: ERC-8004 reputation score (increases with verified proofs)
- **Average Confidence**: Mean confidence across all classifications

### Recent Classifications

Each card shows:

```
Bitcoin Surges Past $100k as ETFs Drive Demand
GOOD (Bullish)    Confidence: 75%    Verified ✓
Classification ID: 0xb742c9...
Posted: 2 minutes ago
zkML Proof: 0x96f931...
```

- **Headline**: The news article analyzed
- **Sentiment**:
  - GOOD (green) = Bullish = Model predicts price increase
  - BAD (red) = Bearish = Model predicts price decrease
- **Confidence**: 0-100% (trades execute only if ≥60%)
- **Verified**: Checkmark means Groth16 proof verified on-chain
- **Classification ID**: Unique identifier for this classification
- **zkML Proof**: Hash of the zero-knowledge proof

### Recent Trades

Each card shows:

```
Sold 0.001 ETH → 3.50 USDC
Sentiment: BAD    Confidence: 75%
Value Before: $35.00
Value After: $34.85
P/L: -0.43% (not profitable)
Status: Evaluated
TX: 0x6e6d2f...
Linked to: "Bitcoin Crashes to $50k..." (classification)
```

- **Action**:
  - "Sold X ETH → Y USDC" (bearish trade)
  - "Bought X ETH ← Y USDC" (bullish trade)
  - "Hold Position" (neutral or insufficient balance)
- **Sentiment**: The classification that triggered the trade
- **Value Before/After**: Portfolio value before and after trade
- **P/L**: Profit/loss percentage after 11 seconds
- **Status**:
  - "Pending Evaluation" (trade executed, waiting 11s)
  - "+0.57% (profitable)" (green)
  - "-0.43% (not profitable)" (red)
- **TX**: Link to Basescan transaction
- **Linked to**: Shows the news headline that triggered this trade

### Agent Portfolio

```
ETH Balance: 0.009 ETH
USDC Balance: 3.50 USDC
Total Value: $34.85
```

Current holdings of the trading agent contract.

**Note**: Agent starts with 0.01 ETH (funded during deployment). It accumulates USDC by selling ETH on bearish news. You don't need to add USDC manually.

### Contract Addresses Section

Shows all deployed smart contracts with links to Basescan.

```
BASE MAINNET
Groth16 Verifier: 0x80DA3C...
News Verifier: 0x42706c...
Registry: 0xb274D9...
Oracle: 0x93Efb9...
Trading Agent: 0xBC2a8f...
```

## Quick Start

### Prerequisites

```bash
# Node.js 18+ required
node --version

# Install dependencies
cd zkml-erc8004
npm install

# Install news-service dependencies
cd news-service
npm install

# Install UI dependencies
cd ../ui
npm install
```

### Environment Setup

This project has THREE `.env` files:

#### 1. `contracts/.env` (Foundry deployment)

```bash
# Base Mainnet RPC
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Your private key (for deployment)
DEPLOYER_PRIVATE_KEY=0x...
ORACLE_PRIVATE_KEY=0x...
ORACLE_ADDRESS=0x4ef498973F8927c89c43830Ca5bB428b20000d2D

# Contract Addresses (already deployed)
GROTH16_VERIFIER=0x80DA3C348D132172A21868cb318874b20FE1F177
NEWS_VERIFIER_ADDRESS=0x42706c5d80CC618e51d178bd9869894692A77a5c
ZKML_VERIFICATION_REGISTRY=0xb274D9bdbEFD5e645a1E6Df94F4ff62838625230
NEWS_CLASSIFICATION_ORACLE=0x93Efb961780a19052A2fBd186A86b7edf073EFb6
TRADING_AGENT_ADDRESS=0xBC2a8f872f02CCd2356F235675f756A4FdCAd81d

# Network Config
CHAIN_ID=8453
```

#### 2. `news-service/.env` (Backend service)

```bash
# Blockchain Connection (Base Mainnet)
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ORACLE_PRIVATE_KEY=0x...

# Contract Addresses (deployed on Base Mainnet)
NEWS_ORACLE_CONTRACT_ADDRESS=0x93Efb961780a19052A2fBd186A86b7edf073EFb6
VERIFICATION_REGISTRY_ADDRESS=0xb274D9bdbEFD5e645a1E6Df94F4ff62838625230
TRADING_AGENT_ADDRESS=0xBC2a8f872f02CCd2356F235675f756A4FdCAd81d
NEWS_VERIFIER_ADDRESS=0x42706c5d80CC618e51d178bd9869894692A77a5c
GROTH16_VERIFIER=0x80DA3C348D132172A21868cb318874b20FE1F177

# Service Configuration
POLL_INTERVAL_MINUTES=5
MIN_CONFIDENCE_THRESHOLD=60
MAX_CLASSIFICATIONS_PER_CYCLE=5

# zkML Proof Configuration
USE_REAL_PROOFS=true
JOLT_ATLAS_PATH=../zkml-model
PROOF_TIMEOUT_MS=5000

# Trading Configuration
ENABLE_AUTO_TRADE=true

# News Sources
COINDESK_RSS_URL=https://www.coindesk.com/arc/outboundfeeds/rss/
```

#### 3. `ui/.env` (Frontend dashboard)

```bash
# Base Mainnet (Chain ID: 8453)
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ZKML_VERIFICATION_REGISTRY=0xb274D9bdbEFD5e645a1E6Df94F4ff62838625230
NEWS_ORACLE_ADDRESS=0x93Efb961780a19052A2fBd186A86b7edf073EFb6
NEWS_VERIFIER_ADDRESS=0x42706c5d80CC618e51d178bd9869894692A77a5c
TRADING_AGENT_ADDRESS=0xBC2a8f872f02CCd2356F235675f756A4FdCAd81d
GROTH16_VERIFIER_ADDRESS=0x80DA3C348D132172A21868cb318874b20FE1F177
```

### Get Alchemy API Key (Recommended)

The free Base RPC (`https://mainnet.base.org`) has rate limits. Use Alchemy for better performance:

1. Go to https://dashboard.alchemy.com/
2. Sign up (free tier)
3. Create New App → Network: Base → Chain: Mainnet
4. Copy your API key
5. Update all three `.env` files with `https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY`

Alchemy free tier: 300 req/sec, perfect for this project.

### Running the System

#### Terminal 1: Start UI Dashboard

```bash
cd ui
node server.js
```

Dashboard will be available at `http://localhost:3001`

**WSL2 Users**: Find your WSL2 IP with `ip addr show eth0 | grep inet` and access from Windows browser (e.g., `http://172.30.160.70:3001`)

#### Terminal 2: Start News Service

```bash
cd news-service
node src/index.js
```

This will:
- Poll CoinDesk RSS every 5 minutes
- Classify sentiment with ONNX + zkML proofs
- Post to Base Mainnet
- Execute autonomous trades
- Log all activity

You'll see:

```
🚀 Starting zkML News Oracle Service on Base Mainnet
📡 Connected to Base Mainnet (Chain ID: 8453)
🔗 Oracle: 0x93Efb961780a19052A2fBd186A86b7edf073EFb6
🤖 Trading Agent: 0xBC2a8f872f02CCd2356F235675f756A4FdCAd81d
⚙️  zkML Mode: REAL PROOFS (JOLT + Groth16)
📰 News Source: CoinDesk RSS
⏱️  Poll Interval: 5 minutes
🎯 Min Confidence: 60%
💹 Auto-Trade: ENABLED

🔄 Polling for news...
```

#### Watch It Work

1. **First Poll** (0-5 minutes): Service fetches latest news
2. **Classification** (20 seconds): Generates real zkML proof
3. **On-Chain Post** (8 seconds): Submits to Base Mainnet
4. **Trade Execution** (3 seconds): Autonomous Uniswap swap
5. **Dashboard Update** (10 seconds): UI refreshes automatically

## Example Trade Flow

### Scenario: Bearish News Detected

```
15:00:00 - News Service polls CoinDesk RSS
15:00:01 - Fetches: "Bitcoin Crashes to $50k Amid Regulatory Concerns"
15:00:02 - ONNX classification begins...
15:00:02.008 - Sentiment: BAD (1), Confidence: 82%
15:00:02.010 - Generating JOLT proof...
15:00:24 - JOLT proof generated (hash: 0x96f931...)
15:00:25.5 - Groth16 wrapper complete
15:00:26 - Posting to Base Mainnet...
15:00:34 - ✅ Classification posted (TX: 0x839f59...)
15:00:34 - Groth16 proof verified on-chain (TX: 0x14ec7e...)
15:00:35 - Trading agent checks classification...
15:00:35 - ✓ Verified, ✓ Confidence 82% ≥ 60%, ✓ Balance 0.01 ETH
15:00:35 - Executing BEARISH trade: Sell ETH → USDC
15:00:38 - ✅ Trade executed: Sold 0.001 ETH → 3.50 USDC (TX: 0x6e6d2f...)
15:00:49 - Evaluating profitability...
15:00:52 - ✅ Profitability evaluated: +0.57% (profitable)
```

**Dashboard shows**:

Classification Card:
```
Bitcoin Crashes to $50k Amid Regulatory Concerns
BAD (Bearish)    Confidence: 82%    Verified ✓
Posted: 1 minute ago
```

Trade Card:
```
Sold 0.001 ETH → 3.50 USDC
Sentiment: BAD    Confidence: 82%
Value Before: $35.00
Value After: $35.20
P/L: +0.57% (profitable)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     News Ingestion (Every 5 Min)                │
├─────────────────────────────────────────────────────────────────┤
│  CoinDesk RSS → Parser → Latest Headlines                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     zkML Classification Pipeline                 │
├─────────────────────────────────────────────────────────────────┤
│  Headline → ONNX Tokenizer → ONNX Model → JOLT Proof → Groth16 │
│    (text)      (8ms)           (8ms)        (~20s)     (~1.5s)  │
│                                                                  │
│  Output: {sentiment, confidence, proofHash}                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Base Mainnet Blockchain                       │
├─────────────────────────────────────────────────────────────────┤
│  NewsOracle.submitClassification()                              │
│    → Store classification data                                  │
│    → Emit NewsClassified event                                  │
│                                                                  │
│  NewsVerifier.verify(proof, publicSignals)                      │
│    → Verify Groth16 proof on-chain                             │
│    → Call Groth16Verifier contract                             │
│                                                                  │
│  ZkMLVerificationRegistry.recordVerification()                  │
│    → Record verified classification (ERC-8004)                  │
│    → Update oracle reputation                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Autonomous Trading Agent                      │
├─────────────────────────────────────────────────────────────────┤
│  TradingAgent.reactToNews(classificationId)                     │
│    1. Check: Is verified via ERC-8004? ✓                       │
│    2. Check: Confidence ≥ 60%? ✓                               │
│    3. Check: Sufficient balance? ✓                              │
│    4. Calculate trade amount (10% of balance)                   │
│    5. Execute Uniswap V3 swap (WETH ↔ USDC)                    │
│    6. Record trade on-chain                                     │
│                                                                  │
│  TradingAgent.evaluateTradeProfitability() [+11 seconds]       │
│    → Compare portfolio value before/after                       │
│    → Record profitability result                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Real-Time Dashboard UI                        │
├─────────────────────────────────────────────────────────────────┤
│  Express.js Backend (server.js)                                │
│    → Fetches data from Base Mainnet contracts                   │
│    → Serves REST API endpoints                                  │
│                                                                  │
│  Vanilla JS Frontend (index.html)                              │
│    → Auto-refresh: 10 seconds                                   │
│    → Displays: Classifications, Trades, Portfolio, Stats        │
│                                                                  │
│  API Endpoints:                                                  │
│    - GET /api/stats           → Total counts & metrics          │
│    - GET /api/classifications → All classifications             │
│    - GET /api/trades          → All trades with profitability   │
│    - GET /api/portfolio       → Current agent holdings          │
└─────────────────────────────────────────────────────────────────┘
```

## Smart Contracts

### NewsClassificationOracle.sol

Stores sentiment classifications with zkML proof hashes.

**Key Functions**:
- `submitClassification(headline, sentiment, confidence, proofHash)` - Oracle posts classification
- `getClassification(classificationId)` - Retrieve classification data
- `getClassificationIdByIndex(index)` - Iterate through all classifications

### NewsClassificationVerifier.sol

Verifies Groth16 proofs for classifications.

**Key Functions**:
- `verify(proof, publicSignals)` - Verify zkSNARK proof
- Calls `Groth16Verifier.verifyProof()` internally

### ZkMLVerificationRegistry.sol

ERC-8004 compliant registry tracking verified AI agents.

**Key Functions**:
- `registerVerifier(verifierAddress, capability)` - Register AI verifier
- `recordVerification(classificationId, verifier)` - Record verified classification
- `isVerified(classificationId)` - Check if classification is verified
- `getAgentStats(agentAddress)` - Get reputation and stats

### TradingAgentBase.sol

Autonomous trading agent that reacts to verified news.

**Key Functions**:
- `reactToNews(classificationId)` - Execute trade based on classification
- `evaluateTradeProfitability(classificationId)` - Evaluate trade after 11 seconds
- `getTradeDetails(classificationId)` - Retrieve trade information
- `getPortfolio()` - Get current ETH/USDC holdings

### Groth16Verifier.sol

zkSNARK proof verifier (generated from circuit).

**Key Functions**:
- `verifyProof(proof, publicSignals)` - Verify Groth16 proof on-chain

## Performance Metrics

**Full E2E Timeline** (From article to on-chain trade):

| Phase | Time | Details |
|-------|------|---------|
| News Fetch | 1s | CoinDesk RSS poll |
| ONNX Inference | 8ms | Tokenization + model forward pass |
| JOLT Proof | ~20s | zkVM proof generation |
| Groth16 Wrapper | ~1.5s | Blockchain-verifiable proof |
| **Total Classification** | **~22s** | Complete zkML pipeline |
| On-Chain Posting | ~4s | Submit classification (285k gas) |
| On-Chain Verification | ~4s | Verify proof (493k gas) |
| Trade Decision | <1s | Check verification + confidence |
| Uniswap Swap | ~3s | Execute swap + record trade |
| **Total E2E** | **~34s** | Article → Trade on Base Mainnet |
| Profitability Check | +11s | Evaluate trade outcome |

**Gas Costs** (Base Mainnet):

| Action | Gas | Cost @ 0.1 gwei |
|--------|-----|-----------------|
| Submit Classification | ~285k | ~$0.003 |
| Verify Groth16 Proof | ~493k | ~$0.005 |
| Execute Trade (Uniswap) | ~180k | ~$0.002 |
| Evaluate Profitability | ~50k | ~$0.0005 |
| **Total Per Article** | **~1M gas** | **~$0.01** |

## Troubleshooting

### UI Shows Old Data or Errors

**Symptom**: Seeing "POL", "Polygon", or stale values

**Solution**: Hard refresh browser to clear cache
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

Or open in Incognito/Private browsing mode.

### Rate Limit Errors

**Symptom**: `{"code":-32016,"message":"over rate limit"}`

**Solution**: Add Alchemy API key to all `.env` files (see setup instructions above)

The server automatically falls back to alternative RPCs, but Alchemy is faster and more reliable.

### News Service Not Trading

**Symptom**: Classifications post but no trades execute

**Check**:
1. `ENABLE_AUTO_TRADE=true` in `news-service/.env`
2. Agent has sufficient balance (≥0.001 ETH or ≥1 USDC)
3. Confidence ≥ 60% (check logs)
4. Classification is verified (check Basescan)

**Debug**: Check news service logs for trade decisions:
```bash
tail -f ../logs/news-service.log
```

### WSL2 Can't Access UI from Windows

**Symptom**: `localhost:3001` doesn't work in Windows browser

**Solution**: Find WSL2 IP and use that instead
```bash
# In WSL2 terminal
ip addr show eth0 | grep inet
# Look for: inet 172.30.160.70/20

# Then access from Windows browser:
# http://172.30.160.70:3001
```

### Proofs Failing

**Symptom**: Classifications post but verification fails

**Check**:
1. `USE_REAL_PROOFS=true` in `news-service/.env`
2. `JOLT_ATLAS_PATH` points to correct zkml-model directory
3. zkml-model has compiled proof circuits

**Fallback**: Set `USE_REAL_PROOFS=false` for mock proofs (faster, for testing)

## Project Structure

```
zkml-erc8004/
├── contracts/                 # Solidity smart contracts (Foundry)
│   ├── src/
│   │   ├── Groth16Verifier.sol
│   │   ├── NewsClassificationVerifier.sol
│   │   ├── NewsClassificationOracleVerified.sol
│   │   ├── ZkMLVerificationRegistry.sol
│   │   └── TradingAgentBase.sol
│   ├── script/
│   │   └── DeployBaseMainnet.s.sol
│   └── .env
├── news-service/             # Backend service (Node.js)
│   ├── src/
│   │   ├── index.js          # Main service entry point
│   │   ├── classifier.js     # ONNX + JOLT + Groth16 pipeline
│   │   ├── baseTrader.js     # Autonomous trading logic
│   │   └── newsFetcher.js    # CoinDesk RSS parser
│   ├── package.json
│   └── .env
├── ui/                       # Dashboard (Express + Vanilla JS)
│   ├── server.js             # Express.js API server
│   ├── public/
│   │   ├── index.html        # Dashboard UI
│   │   └── style.css
│   ├── package.json
│   └── .env
├── zkml-model/               # JOLT zkML circuits
│   ├── proof_data/
│   └── verification_key.json
├── BASE_DEPLOYMENT_COMPLETE.md
├── UI_FIXES_EXPLAINED.md
├── SETUP_ALCHEMY_RPC.md
└── README.md
```

## Security Features

### zkML Provenance
- Every classification includes cryptographic proof of correct ML execution
- JOLT proof hash stored on-chain for audit trail
- Groth16 verification ensures proof validity
- Complete provenance from training data to blockchain

### Trading Safety
- **Confidence threshold**: Only trade if ≥60% confidence
- **Balance checks**: Prevent overdraft with minimum balance requirements
- **Single-execution guarantee**: Can't trade same classification twice
- **Verification check**: Only trade on verified (zkML-proven) classifications
- **Reputation system**: ERC-8004 tracks oracle performance

### Smart Contract Security
- Immutable proof verification logic (Groth16Verifier)
- Event-based transparency (all actions logged on-chain)
- State recorded for all trades (tamper-proof history)
- ERC-8004 compliant (standardized agent discovery)

## Real vs Mock Proofs

### Real Proofs (`USE_REAL_PROOFS=true`)

**Pipeline**: ONNX → JOLT zkVM (~20s) → Groth16 (~1.5s) → On-chain verification

**Pros**:
- Cryptographically verifiable ML inference
- Complete zero-knowledge proof of correct execution
- Production-ready, trustless
- Auditable proof trail

**Cons**:
- ~20 seconds per classification (JOLT proof generation)
- Requires zkml-model circuits compiled locally

### Mock Proofs (`USE_REAL_PROOFS=false`)

**Pipeline**: ONNX → Mock hash → On-chain submission (no verification)

**Pros**:
- Fast (~8ms total)
- No circuit compilation needed
- Good for testing/demos

**Cons**:
- No cryptographic proof
- Not verifiable on-chain
- Development only

**Current Deployment**: Uses **real proofs** (see `.env` files)

## Why ERC-8004?

ERC-8004 provides a standardized way to:
1. **Register AI Agents**: Oracle registers its sentiment model as verifiable agent
2. **Track Reputation**: On-chain reputation score based on verified classifications
3. **Discover Capabilities**: Other contracts can query agent capabilities
4. **Verify Provenance**: Link classifications to specific AI models with proofs

This makes the trading agent **trustless** - anyone can verify:
- Which AI model made the classification
- That the inference was correct (zkML proof)
- The agent's historical accuracy (reputation score)
- The complete audit trail (on-chain events)

## Future Improvements

- [ ] Parallel proof generation for multiple articles
- [ ] Dynamic confidence thresholds based on market volatility
- [ ] Multi-token trading (beyond ETH/USDC)
- [ ] WebSocket for real-time UI updates
- [ ] Proof caching and batch verification
- [ ] Advanced sentiment model with larger vocabulary
- [ ] Multi-oracle aggregation (combine multiple news sources)
- [ ] Stop-loss and take-profit logic
- [ ] Portfolio rebalancing based on risk metrics

## License

MIT

## Links

- **Base Mainnet Explorer**: https://basescan.org
- **ERC-8004 Spec**: https://eips.ethereum.org/EIPS/eip-8004
- **JOLT zkVM**: https://github.com/a16z/jolt
- **Uniswap V3**: https://docs.uniswap.org/contracts/v3/overview
- **ONNX Runtime**: https://onnxruntime.ai/

## Acknowledgments

Built with:
- Ethers.js v6
- ONNX Runtime
- JOLT zkVM (a16z)
- snarkjs (Groth16 proofs)
- Foundry (smart contract framework)
- Uniswap V3 (DEX)
- Express.js (API server)
- Base (L2 blockchain)

---

**Live System Status**: Contracts deployed on Base Mainnet, news service polling every 5 minutes, real zkML proofs enabled, autonomous trading active.
