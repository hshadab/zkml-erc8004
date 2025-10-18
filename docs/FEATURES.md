# Advanced Features - zkML-ERC8004

This document details all advanced features implemented in the zkML-ERC8004 demo.

## 🎯 Core Features

### 1. Dynamic Reputation System

**What it does**: Oracles earn or lose reputation based on prediction accuracy

**Implementation**: `contracts/src/ZkMLVerificationRegistry.sol`

**Key Functions**:
- `recordValidation()` - Record manual or automatic validation
- `increaseReputation()` - Reward good predictions (+10 per correct)
- `decreaseReputation()` - Penalize bad predictions (-20 per incorrect)
- `getCapabilityStats()` - Get detailed statistics

**Mechanics**:
```
Correct Prediction:
  → +10 reputation
  → Reset consecutive failures counter
  → Every 10 correct: +50 bonus (streak reward)

Incorrect Prediction:
  → -20 reputation (base penalty)
  → Consecutive failures multiply penalty
  → 5 consecutive failures: Warning event emitted

Example Trajectory:
  Start: 250
  10 correct in a row: 250 + (10 × 10) + 50 = 400
  1 incorrect: 400 - 20 = 380
  5 incorrect in row: Progressive penalties → Can drop to <100
```

**API**:
```solidity
// Manual validation by owner
registry.recordValidation(
    classificationId,
    oracleTokenId,
    true,  // wasCorrect
    "Price went up as predicted"
);

// Automatic feedback from trading agent
registry.increaseReputation(oracleTokenId, 5);
registry.decreaseReputation(oracleTokenId, 10);

// Query stats
(
    uint256 reputation,
    uint256 correct,
    uint256 incorrect,
    uint256 consecutive,
    uint256 total,
    uint256 accuracy
) = registry.getCapabilityStats(tokenId, "news_classification");
```

---

### 2. On-Chain zkML Verification (Groth16)

**What it does**: Cryptographically verify news classifications on-chain

**Implementation**:
- `contracts/src/Groth16Verifier.sol` - Core verifier
- `contracts/src/NewsVerifier.sol` - Classification wrapper
- `contracts/src/NewsClassificationOracleVerified.sol` - Oracle with verification

**Process**:
```
1. Off-chain: Generate JOLT-Atlas proof (~700ms)
   Input: [sentiment, hasPositive, hasNegative]
   Output: [bad_prob, neutral_prob, good_prob]

2. Off-chain: Generate Groth16 proof of JOLT execution (~1-2s)
   Circuit: Proves ONNX model ran correctly
   Public signals: [sentiment, confidence, featuresHash]

3. On-chain: Verify Groth16 proof
   Gas cost: ~300k gas (~$0.50 on Base Sepolia)
   Result: Permanent cryptographic record

4. Store verified classification
   Linked to oracle's ERC-8004 token ID
   Queryable by agents
```

**Usage**:
```solidity
// Post with verification
oracle.postClassificationWithProof(
    "Bitcoin ETF approved",
    Sentiment.GOOD_NEWS,
    87,
    joltProofHash,
    groth16ProofBytes,  // 256 bytes: pA (64) + pB (128) + pC (64)
    [2, 87, featuresHash]  // [sentiment, confidence, hash]
);

// Check if verified
bool verified = oracle.isVerifiedOnChain(classificationId);

// Get verification details
NewsVerifier.VerifiedClassification memory details =
    newsVerifier.getVerifiedClassification(classificationId);
```

---

### 3. Trade Profitability Tracking

**What it does**: Tracks every trade, calculates P&L, reports back to reputation system

**Implementation**: `contracts/src/TradingAgentEnhanced.sol`

**Features**:
- Snapshot portfolio value before/after trades
- Calculate profitability after 24 hours
- Automatic reputation feedback
- Trade history and statistics

**Workflow**:
```
1. Agent receives news classification
2. Snapshot portfolio value BEFORE trade
3. Execute trade on Uniswap
4. Store trade record with all details

24 hours later:
5. Call evaluateTradeProfitability()
6. Snapshot portfolio value AFTER
7. Calculate: profitable = (after > before)
8. Call reportTradeToRegistry()
9. Oracle reputation automatically updated:
   - Profitable → +5 reputation
   - Unprofitable → -10 reputation
```

**Trade Struct**:
```solidity
struct Trade {
    bytes32 classificationId;
    uint256 oracleTokenId;
    Sentiment sentiment;
    string action;  // "BUY_ETH" or "SELL_ETH"
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    uint256 amountOut;
    uint256 timestamp;
    uint256 portfolioValueBefore;
    uint256 portfolioValueAfter;
    bool isProfitable;
    bool hasReported;
}
```

**Usage**:
```solidity
// Execute trade (automatic)
agent.reactToNews(classificationId);

// 24 hours later...
agent.evaluateTradeProfitability(classificationId);

// Report to registry
agent.reportTradeToRegistry(classificationId);

// Query stats
(uint256 total, uint256 profitable, uint256 unprofitable, uint256 winRate) =
    agent.getTradeStats();

// Get trade details
Trade memory trade = agent.getTradeDetails(classificationId);

// View recent trades
Trade[] memory recentTrades = agent.getRecentTrades(10);
```

---

## 🔗 Integration Points

### How Everything Connects:

```
┌─────────────────────────────────────────────────────────────┐
│  NEWS CLASSIFICATION ORACLE                                 │
│  • Receives classification from off-chain service           │
│  • Generates Groth16 proof                                  │
│  • Posts with on-chain verification                         │
│  • Proof stored in NewsVerifier contract                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ NewsClassified event
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  TRADING AGENT                                              │
│  • Listens for events                                       │
│  • Checks oracle reputation (via ERC-8004 registry)         │
│  • Verifies classification is on-chain verified             │
│  • Executes trade if reputation ≥ 250 and confidence ≥ 75   │
│  • Tracks trade details                                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ After 24 hours
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  PROFITABILITY EVALUATION                                   │
│  • Calculate if trade was profitable                        │
│  • Report back to ERC-8004 registry                         │
│  • Oracle reputation automatically updated:                 │
│    - Profitable trade → Oracle +5 reputation                │
│    - Unprofitable trade → Oracle -10 reputation             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Reputation Flow Examples

### Scenario 1: Successful Oracle
```
Day 1: Register oracle (reputation = 250)
Day 2: Post "Bitcoin ETF approved" → GOOD_NEWS
Day 3: BTC goes up 5% → Agent trade profitable
Day 3: reputation = 250 + 5 = 255

Day 4: Post "Exchange hack" → BAD_NEWS
Day 5: BTC drops 3% → Agent trade profitable (sold to USDC)
Day 5: reputation = 255 + 5 = 260

...after 10 correct predictions...
reputation = 250 + (10 × 5) + 50 (streak bonus) = 350

Result: Oracle builds trust, more agents use it
```

### Scenario 2: Struggling Oracle
```
Day 1: Register oracle (reputation = 250)
Day 2: Post "Bullish news" → GOOD_NEWS (but incorrect)
Day 3: BTC drops → Agent loses money
Day 3: reputation = 250 - 10 = 240

Day 4: Another incorrect prediction
Day 4: reputation = 240 - 20 = 220 (consecutive penalty doubles)

Day 5: Third incorrect
Day 5: reputation = 220 - 40 = 180

Day 6: Fourth incorrect
Day 6: reputation = 180 - 80 = 100 (getting critical)

Day 7: Fifth incorrect
Day 7: reputation < 100 → Warning event emitted
Day 7: Agents stop trusting oracle (below 250 threshold)

Result: Oracle reputation collapses, no agents will trade on its data
```

---

## 🎬 Complete Demo Workflow

### Phase 1: Deployment
```bash
cd zkml-erc8004/contracts
forge script script/DeployComplete.s.sol:DeployComplete \
  --rpc-url base-sepolia \
  --broadcast

# Contracts deployed:
# - ZkMLVerificationRegistry (ERC-8004)
# - Groth16Verifier
# - NewsVerifier
# - NewsClassificationOracleVerified
# - TradingAgentEnhanced
```

### Phase 2: Initial Setup
```bash
# Update .env files with deployed addresses
# Fund TradingAgent:
#   - 0.1 ETH for gas + trades
#   - 10 USDC (or wrap ETH to WETH)

cd ../news-service
npm install
npm start
```

### Phase 3: First Classification
```bash
# Manual trigger (or wait for RSS)
curl -X POST http://localhost:3000/api/demo/classify \
  -H "Content-Type: application/json" \
  -d '{"headline": "SEC approves Bitcoin ETF"}'

# What happens:
# 1. Feature extraction → [0.82, 1, 0]
# 2. ONNX inference → GOOD_NEWS (87% confidence)
# 3. JOLT-Atlas proof generation (~700ms)
# 4. Groth16 proof generation (~1-2s)
# 5. On-chain verification (gas: ~$0.50)
# 6. NewsClassified event emitted
```

### Phase 4: Agent Reaction
```bash
# Agent automatically:
# 1. Detects NewsClassified event
# 2. Checks oracle reputation (250 ≥ 250 ✓)
# 3. Checks confidence (87 ≥ 75 ✓)
# 4. Checks on-chain verification ✓
# 5. Snapshots portfolio value
# 6. Executes trade: USDC → WETH
# 7. Stores trade record

# View on BaseScan:
# https://sepolia.basescan.org/tx/TRADE_TX_HASH
```

### Phase 5: Profitability Check (24h later)
```bash
# Call from script or frontend:
cast send $AGENT_ADDRESS \
  "evaluateTradeProfitability(bytes32)" \
  $CLASSIFICATION_ID \
  --private-key $DEPLOYER_KEY

# Agent calculates:
# - Portfolio value before: $1000
# - Portfolio value after: $1050
# - Result: Profitable (+5%)

# Then report:
cast send $AGENT_ADDRESS \
  "reportTradeToRegistry(bytes32)" \
  $CLASSIFICATION_ID \
  --private-key $DEPLOYER_KEY

# Oracle reputation: 250 → 255
```

---

## 🚀 Production Considerations

### Security
- ✅ All reputation changes are on-chain (auditable)
- ✅ Groth16 proofs are cryptographically sound
- ✅ Trade P&L calculated from actual portfolio snapshots
- ⚠️ Oracle owner controls classification posting (centralized)
- ⚠️ Agent owner controls evaluation timing (could be automated)

### Gas Costs
- Registry operations: ~50k gas (~$0.05)
- Groth16 verification: ~300k gas (~$0.50)
- Agent trades: ~200k gas + swap fees
- Total per classification: ~$1-2 on Base Sepolia

### Scalability
- Multiple oracles can register
- Multiple agents can react to same classification
- Validation history stored on-chain (grows over time)
- Consider archiving old trades off-chain

### Future Enhancements
- Community voting on classifications
- Automated evaluation (Chainlink Automation)
- Multi-oracle aggregation
- Reputation-weighted confidence scores
- Slashing for malicious behavior

---

## 📚 Additional Resources

- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [JOLT-Atlas Documentation](https://github.com/ICME-Lab/jolt-atlas)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [Uniswap V3 Docs](https://docs.uniswap.org/)

---

**Status**: All features production-ready and tested on Base Sepolia
