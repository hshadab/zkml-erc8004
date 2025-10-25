# ERC-8004 Integration with X402 Payment System - Architectural Analysis

## Executive Summary

This zkML news oracle project implements a comprehensive integration of the ERC-8004 (Verifiable AI Agents Standard) with an HTTP 402 payment system. The architecture creates a fully autonomous, verifiable, and monetized AI agent system on Base Mainnet where:

1. **ERC-8004** provides agent identity, capability verification, and reputation tracking
2. **X402 (HTTP 402)** enables pay-per-use access to the oracle's classification services
3. **zkML proofs** (JOLT-Atlas + Groth16) verify classification correctness on-chain
4. **Autonomous trading** reacts to verified news classifications with immediate execution

---

## 1. ERC-8004 Contract Architecture

### 1.1 ZkMLVerificationRegistry (Identity & Reputation Registry)

**File:** `/contracts/src/ZkMLVerificationRegistry.sol`

#### Core Components:

```solidity
struct Agent {
    address owner;
    uint256 tokenId;
    mapping(string => AgentCapability) capabilities;
    string[] capabilityTypes;
}

struct AgentCapability {
    bool isActive;
    uint256 reputationScore;      // 0-1000
    uint256 proofsSubmitted;
    uint256 registeredAt;
    uint256 correctPredictions;
    uint256 incorrectPredictions;
    uint256 consecutiveFailures;
}

struct ValidationRecord {
    bytes32 classificationId;
    uint256 oracleTokenId;
    bool wasCorrect;
    uint256 timestamp;
    address validator;
    string reason;
}
```

#### Key Functions:

1. **`registerAgent(string capabilityType) → uint256 tokenId`**
   - Mints ERC-8004 NFT token for new agent
   - Initializes capability with `INITIAL_REPUTATION = 250`
   - Returns unique tokenId for oracle/trader identification
   - **Integration Point:** Oracle posts must include oracleTokenId from this registry

2. **`submitProof(uint256 tokenId, bytes32 proofHash)`**
   - Records proof submission tied to agent tokenId
   - Increments `proofsSubmitted` counter
   - Emits `ProofSubmitted(tokenId, proofHash, timestamp)`
   - **Used By:** NewsClassificationOracle after posting classifications

3. **`recordValidation(bytes32 classificationId, uint256 oracleTokenId, bool wasCorrect, string reason)`**
   - Updates oracle reputation based on classification accuracy
   - **Reputation Changes:**
     - ✓ Correct: +10 points
     - ✗ Incorrect: -20 points (first), -40 (second), etc. (progressive)
     - ✓ Streak bonus: +50 for every 10 consecutive correct predictions
   - Tracks validation history per classification

4. **`getReputationScore(uint256 tokenId, string capabilityType) → uint256`**
   - Returns oracle's reputation score (0-1000)
   - **Used By:** TradingAgent to verify oracle reliability before trading

5. **`isAuthorized(uint256 tokenId, string capabilityType) → bool`**
   - Checks if agent is authorized for specific capability
   - **Default:** true if agent owns active capability

#### Reputation Mechanics:

```
Initial Reputation: 250
Max Reputation: 1000
Min Reputation: 0

Reward: +10 per correct prediction
Penalty: -20 * consecutiveFailures per incorrect prediction
Streak Bonus: +50 per 10 consecutive correct predictions

Warning Threshold: 5 consecutive failures → emit ConsecutiveFailureWarning
```

#### State Variables for Agent Management:
- `_nextTokenId`: Auto-incrementing token ID counter
- `_agents[tokenId]`: Maps tokenId → Agent struct
- `_ownerToTokenIds[address]`: Maps owner address → array of their tokenIds
- `_validationHistory[classificationId]`: Historical record of all validations
- `authorizedContracts[address]`: Whitelist of contracts that can submit proofs (NewsOracle, Validators)

---

### 1.2 NewsClassificationOracle Contract

**File:** `/contracts/src/NewsClassificationOracle.sol`

#### Integration with ERC-8004:

```solidity
contract NewsClassificationOracle is INewsOracle {
    IERC8004 public immutable verificationRegistry;  // Link to ZkMLVerificationRegistry
    IValidationRegistry public validationRegistry;
    uint256 public oracleTokenId;                    // This oracle's ERC-8004 token ID
    address public owner;

    struct NewsClassification {
        bytes32 id;
        string headline;
        Sentiment sentiment;
        uint8 confidence;
        bytes32 proofHash;
        uint256 timestamp;
        uint256 oracleTokenId;                       // CRUCIAL: Links to ERC-8004 token
    }
}
```

#### Flow: Classification → ERC-8004 Integration

1. **`setOracleTokenId(uint256 tokenId)`**
   ```
   Precondition: tokenId must be registered in ZkMLVerificationRegistry
   Requirement: isAuthorized(tokenId, "news_classification") == true
   Effect: Enables oracle to post classifications
   ```

2. **`postClassification(headline, sentiment, confidence, proofHash)`**
   ```
   1. Verify oracle is authorized:
      - require(isAuthorized(oracleTokenId, "news_classification"))
   
   2. Generate classification ID:
      - classificationId = keccak256(headline, timestamp, block.number, count)
   
   3. Store classification with ERC-8004 linkage:
      NewsClassification {
          ...
          oracleTokenId: oracleTokenId  // STORES AGENT IDENTITY
      }
   
   4. Submit proof to registry:
      - verificationRegistry.submitProof(oracleTokenId, proofHash)
      - Increments oracle's proofsSubmitted counter
   
   5. Request validation (optional):
      - validationRegistry.requestValidation(classificationId, workHash, oracleTokenId)
      - Creates on-chain validation request for verifiers
   
   6. Emit event with tokenId:
      - NewsClassified(..., oracleTokenId)
   ```

#### Agent TokenId Usage:
- **Stored in every classification** - creates immutable link between news and oracle
- **Used for reputation lookup** - traders verify oracle reliability before acting
- **Validation target** - validators know whose reputation to update

---

### 1.3 ValidationRegistry Contract

**File:** `/contracts/src/ValidationRegistry.sol`

#### ERC-8004 Validation Lifecycle:

```solidity
enum ValidationStatus { Pending, Approved, Rejected }

struct ValidationRequest {
    uint256 agentTokenId;           // Oracle's ERC-8004 token ID
    bytes32 workId;                 // Classification ID
    bytes32 workHash;               // Hash of classification data
    uint256 requestTime;
    ValidationStatus status;
    uint256 responseCount;
}

struct ValidationResponse {
    uint256 validatorTokenId;       // Validator's ERC-8004 token ID
    address validatorAddress;
    bool approved;
    bytes32 proofHash;
    uint256 responseTime;
}
```

#### Flow:

1. **Oracle requests validation:**
   ```solidity
   requestValidation(classificationId, workHash, agentTokenId)
   
   Verifications:
   - agentTokenId must exist in Identity Registry
   - Caller must be token owner OR authorized contract
   - Creates Pending validation request
   ```

2. **Validator submits response:**
   ```solidity
   submitValidation(workId, approved, proofHash, validatorTokenId)
   
   Process:
   - Verify validatorTokenId exists in Identity Registry
   - Prevent duplicate responses from same validator
   - Update oracle reputation based on approval:
       if (approved) {
           identityRegistry.increaseReputation(agentTokenId, 10)
           identityRegistry.increaseReputation(validatorTokenId, 1)  // reward verifier
       } else {
           identityRegistry.decreaseReputation(agentTokenId, 5)
       }
   - Status becomes Approved/Rejected on first response
   ```

#### Reputation Updates (ERC-8004 Integration):
- **Oracle reputation**: ±10 points based on validation outcome
- **Validator reputation**: +1 point for each validation performed
- **History tracking**: Full validation history per classification

---

### 1.4 TradingAgentBase Contract

**File:** `/contracts/src/TradingAgentBase.sol`

#### ERC-8004 Integration for Autonomous Trading:

```solidity
contract TradingAgentBase {
    address public agentTokenId;                        // Agent's ERC-8004 token ID
    IZkMLVerificationRegistry public verificationRegistry;
    
    struct Trade {
        bytes32 classificationId;
        uint256 oracleTokenId;                         // Source oracle's token ID
        uint8 sentiment;
        string action;
        uint256 portfolioValueBefore;
        uint256 portfolioValueAfter;
        bool isProfitable;
    }
}
```

#### Reputation-Based Trading Decision:

```solidity
function reactToNews(bytes32 classificationId) external {
    require(!processedClassifications[classificationId]);
    
    // Get classification (includes oracleTokenId)
    INewsOracle.NewsClassification memory news = newsOracle.getClassification(classificationId);
    
    // CRITICAL: Check oracle reputation before trading
    uint256 oracleReputation = verificationRegistry.getReputationScore(
        news.oracleTokenId, 
        "news_classification"
    );
    require(oracleReputation >= minOracleReputation, "Oracle reputation too low");
    
    // Execute trade only for trusted oracles
    if (news.sentiment == GOOD_NEWS) {
        _executeBullishTrade(classificationId);      // Buy ETH
    } else if (news.sentiment == BAD_NEWS) {
        _executeBearishTrade(classificationId);      // Sell ETH
    }
    
    // Store oracle's tokenId in trade record
    trades[classificationId].oracleTokenId = news.oracleTokenId;
}
```

#### Profitability Reporting:

```solidity
function evaluateTradeProfitability(bytes32 classificationId) external {
    Trade storage t = trades[classificationId];
    
    uint256 valueBefore = t.portfolioValueBefore;
    uint256 valueAfter = _calculatePortfolioValue();
    
    bool profitable = valueAfter > valueBefore;
    t.isProfitable = profitable;
    
    // Profitability could be reported to ZkMLVerificationRegistry
    // to further adjust oracle reputation
    // (Currently stored in trade history for future enhancement)
    
    emit TradeProfitabilityDetermined(
        classificationId, 
        profitable, 
        valueBefore, 
        valueAfter, 
        profitLossPercent
    );
}
```

#### Agent Registration:
- **Each trading agent** is registered as ERC-8004 agent with "trading" capability
- **Reputation tracking** not yet implemented for trading agents
- **Future enhancement**: Track trading performance through ERC-8004 reputation system

---

## 2. Agent TokenID Usage Throughout Codebase

### 2.1 Oracle Agent Registration (Deploy Time)

**File:** `/contracts/deploy-erc8004-v3.js`

```javascript
// STEP 1: Deploy ZkMLVerificationRegistry
const identityRegistry = await IdentityFactory.deploy();
const identityAddress = await identityRegistry.getAddress();

// STEP 3: Register Agent NFT #1 (Oracle)
const registerTx = await identityRegistry.registerAgent('news_classification');
const registerReceipt = await registerTx.wait();
// Returns: tokenId = 1

// Expected token ID distribution:
// - Token #1: News Oracle
// - Token #2: Trading Agent (TradingAgentBase)
// - Token #3: Validator (NewsClassificationVerifier)
```

### 2.2 Oracle Configuration (Runtime)

**File:** `/news-service/src/poster.js`

```javascript
// No explicit tokenId setting in poster
// Oracle contract must be configured separately:

const oracleAbi = [
    'function setOracleTokenId(uint256 tokenId) external onlyOwner',
    'function postClassification(string, uint8, uint8, bytes32) external returns (bytes32)'
];

// Configuration (must be done after deployment):
// 1. Get tokenId from ERC-8004 registry
// 2. Call oracle.setOracleTokenId(1)  // Token #1
// 3. Verify authorization: isAuthorized(1, "news_classification") == true
```

### 2.3 Classification Storage (On-Chain)

**File:** `/contracts/src/NewsClassificationOracle.sol`

Every classification stores the oracle's tokenId:

```solidity
NewsClassification {
    id: classificationId,
    headline: headline,
    sentiment: sentiment,
    confidence: confidence,
    proofHash: proofHash,
    timestamp: block.timestamp,
    oracleTokenId: oracleTokenId              // STORED in every classification
}
```

### 2.4 Trading Agent Token Verification

**File:** `/news-service/src/baseTrader.js`

```javascript
// Event listener on oracle
async _pollForEvents() {
    const events = await this.oracle.queryFilter('NewsClassified', ...);
    
    for (const event of events) {
        const { classificationId, headline, sentiment, oracleTokenId } = event.args;
        
        // Log oracle identity
        logger.info(`Oracle Token ID: ${oracleTokenId}`);
        
        // Trading agent uses oracleTokenId for reputation check (on-chain)
        await this.executeTrade(classificationId);  // → TradingAgent.reactToNews()
    }
}
```

**In TradingAgent contract:**
```solidity
uint256 oracleReputation = verificationRegistry.getReputationScore(
    news.oracleTokenId,  // Retrieved from classification
    "news_classification"
);
require(oracleReputation >= minOracleReputation);
```

### 2.5 Validator Agent Configuration

**File:** `/contracts/register-validator-agent.js`

```javascript
// Register validator (token #3)
const metadata = JSON.stringify({
    name: "NewsClassificationVerifier",
    role: "validator",
    capabilities: ["zkml-verification", "groth16-proofs", "erc8004-validation"]
});

const tx = await registry.registerAgent(
    NEWS_VERIFIER_ADDRESS,
    "validator",
    metadata
);

// Returns: tokenId = 3 (expected)
// Used by: ValidationRegistry.submitValidation(workId, approved, proofHash, validatorTokenId=3)
```

---

## 3. Proof Submission & Verification Flow

### 3.1 End-to-End Proof Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ NEWS CLASSIFICATION PIPELINE                                    │
└─────────────────────────────────────────────────────────────────┘

1. NEWS FETCHING
   └─→ fetcher.js: Fetch from CoinDesk RSS + CryptoCompare API

2. CLASSIFICATION
   └─→ classifier.js: 
       Pipeline: ONNX Inference → JOLT Proof → Groth16 Wrapper
       Output: proofHash, sentiment, confidence

3. PROOF GENERATION
   File: classifier.js
   
   Path 1 (Real Proofs - USE_REAL_PROOFS=true):
   ├─→ Step 1: ONNX Inference via JOLT-Atlas
   │   └─→ joltOnnxProver.js: runInference(headline)
   │       Returns: sentiment (0/1/2)
   │
   ├─→ Step 2: Generate JOLT zkML Proof
   │   └─→ joltOnnxProver.js: generateJoltProof(tokens, sentiment)
   │       Returns: proofHash
   │
   └─→ Step 3: Wrap JOLT in Groth16
       └─→ joltGroth16Wrapper.js: wrapProof(joltProof, sentiment, confidence)
           Returns: proofBytes, publicSignals
   
   Path 2 (Mock Proofs - default):
   └─→ prover.js: generateProof(features, sentiment)
       Returns: proofHash only

4. ORACLE POSTING (ON-CHAIN)
   File: poster.js / NewsClassificationOracle.sol
   
   Transaction: postClassification(headline, sentiment, confidence, proofHash)
   ├─→ NewsClassificationOracle:
   │   ├─ Verify oracle authorized: isAuthorized(oracleTokenId, "news_classification")
   │   ├─ Generate classificationId
   │   ├─ Store classification with oracleTokenId
   │   └─ Submit proof: verificationRegistry.submitProof(oracleTokenId, proofHash)
   │
   └─→ ZkMLVerificationRegistry:
       └─ Record proof submission
           ├─ Increment oracle.capabilities[capabilityType].proofsSubmitted++
           └─ Emit ProofSubmitted(oracleTokenId, proofHash, timestamp)

5. VALIDATION REQUEST (Optional)
   File: ValidationRegistry.sol
   
   validationRegistry.requestValidation(classificationId, workHash, oracleTokenId)
   └─→ Create ValidationRequest in Pending state
       └─→ Track agentTokenId = oracleTokenId (oracle requesting validation)

6. TRADE EXECUTION
   File: baseTrader.js / TradingAgentBase.sol
   
   Event Listener:
   ├─→ Detect NewsClassified event with oracleTokenId
   └─→ Call TradingAgent.reactToNews(classificationId)
       ├─→ Get classification (includes oracleTokenId)
       ├─→ Verify oracle reputation:
       │   reputation = getReputationScore(oracleTokenId, "news_classification")
       │   require(reputation >= minOracleReputation)
       └─→ Execute trade (BUY/SELL based on sentiment)

7. PROFITABILITY EVALUATION
   evaluateTradeProfitability(classificationId)
   └─→ Compare portfolio value before/after
       └─→ Determine if trade was profitable
           └─→ Could trigger reputation adjustment for oracle
```

### 3.2 Proof Data Structure

**Classification Result:**
```javascript
{
    success: true,
    headline: "news headline",
    sentiment: 0|1|2,              // BAD|NEUTRAL|GOOD
    confidence: 60-100,            // confidence score
    proofHash: "0x...",            // Keccak256 hash of proof
    proof: Proof (if real),        // Full Groth16 proof
    publicSignals: [               // Groth16 public signals
        sentiment,
        confidence,
        featuresHash
    ],
    proofBytes: "0x...",           // Encoded for contract
    joltProof: "0x...",            // JOLT proof hash (if real)
    isRealProof: boolean,
    proofGenerationMs: number,
    pipeline: "ONNX → JOLT → Groth16" | "Mock"
}
```

**On-Chain Storage:**
```solidity
NewsClassification {
    bytes32 id;                    // keccak256(headline, timestamp, block.number)
    string headline;
    Sentiment sentiment;           // enum: BAD, NEUTRAL, GOOD
    uint8 confidence;              // 0-100
    bytes32 proofHash;             // Stored on-chain
    uint256 timestamp;
    uint256 oracleTokenId;         // ERC-8004 agent identity
}
```

---

## 4. X402 Payment System Integration

### 4.1 X402 Service Architecture

**File:** `/news-service/src/x402Service.js`

#### Payment Flow:

```
1. PAYMENT DISCOVERY
   GET /.well-known/payment
   └─→ Returns X402 service metadata
       ├─ protocol: "x402"
       ├─ endpoints: { pricing, classify, payment-request }
       └─ features: [JOLT zkML, Groth16 proofs, ERC-8004, X402]

2. GET PRICING
   GET /api/pricing
   └─→ Returns:
       {
           service: "zkML News Classification",
           price: "$0.25",
           currency: "USDC",
           usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
           recipient: "0x...",  // Oracle wallet address
           network: "Base Mainnet (Chain ID: 8453)"
       }

3. CREATE PAYMENT REQUEST
   POST /api/payment-request
   Body: { "headline": "news headline" }
   
   Returns:
   {
       requestId: "req_<timestamp>_<random>",
       expiresAt: "2024-10-26T...",  // 10 minutes from now
       paymentInstructions: {
           method: "erc20-transfer",
           protocol: "x402",
           network: { chainId: 8453, ... },
           token: { USDC on Base },
           payment: {
               recipient: "0x...",  // Oracle address
               amount: "250000",    // 0.25 USDC in wei (6 decimals)
           },
           transaction: {
               to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
               data: "0xa9059cbb...",  // ERC20 transfer encoded
               gasLimit: "65000"
           },
           instructions: {
               function: "transfer(address,uint256)",
               params: {
                   to: "0x...",
                   amount: "250000"
               }
           }
       }
   }

4. BROADCAST PAYMENT
   User broadcasts USDC transfer (0.25 USDC to oracle wallet)
   on Base Mainnet

5. SUBMIT PAID CLASSIFICATION
   POST /api/classify
   Body: { 
       "headline": "news headline",
       "paymentTx": "0xabcd1234...",  // tx hash
       "requestId": "req_..."          // optional for idempotency
   }

6. PAYMENT VERIFICATION
   verifyPayment(txHash, requestId)
   ├─→ Check if payment already used (prevents reuse)
   ├─→ Get transaction receipt on Base Mainnet
   ├─→ Verify status == 1 (success)
   ├─→ Parse USDC Transfer logs:
   │   ├─ Verify transfer FROM user → TO oracle wallet
   │   ├─ Verify amount >= $0.25 USDC
   │   └─ Verify timestamp within 24 hours
   └─→ Mark payment as used
       └─→ Store in usedPayments[txHash] = { requestId, timestamp }

7. RETURN CLASSIFICATION
   if (paymentValid) {
       return {
           service: "zkML News Classification",
           headline: headline,
           sentiment: sentiment,
           confidence: confidence,
           proofHash: proofHash,
           oracleTokenId: oracleTokenId,
           payment: {
               txHash: paymentTx,
               from: userAddress,
               amount: "0.25 USDC"
           }
       };
   } else {
       res.status(402);  // Payment Required
       return { error: reason, code: errorCode };
   }
```

### 4.2 Payment Verification Details

**File:** `/news-service/src/x402Service.js` - `verifyPayment()` method

```javascript
async verifyPayment(txHash, requestId = null) {
    // 1. Check for duplicate payment usage
    if (this.usedPayments.has(txHash)) {
        return { valid: false, error: "Payment already used", code: "PAYMENT_ALREADY_USED" };
    }

    // 2. Validate request ID (if provided)
    if (requestId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
            return { valid: false, error: "Invalid or expired request", code: "INVALID_REQUEST_ID" };
        }
        if (request.expiresAt < Date.now()) {
            return { valid: false, error: "Request expired", code: "REQUEST_EXPIRED" };
        }
    }

    // 3. Get transaction receipt from Base Mainnet
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) {
        return { valid: false, error: "Transaction not found", code: "TX_NOT_FOUND" };
    }
    if (receipt.status === 0) {
        return { valid: false, error: "Transaction failed", code: "TX_FAILED" };
    }

    // 4. Parse USDC Transfer event
    const usdcInterface = new ethers.Interface([
        'event Transfer(address indexed from, address indexed to, uint256 value)'
    ]);

    let transferFound = false;
    let transferAmount = 0n;
    let senderAddress = '';

    for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.usdcAddress.toLowerCase()) {
            try {
                const parsedLog = usdcInterface.parseLog(log);
                if (parsedLog.name === 'Transfer' &&
                    parsedLog.args.to.toLowerCase() === this.recipientAddress.toLowerCase()) {
                    transferFound = true;
                    transferAmount = parsedLog.args.value;
                    senderAddress = parsedLog.args.from;
                    break;
                }
            } catch (e) {
                // Not a Transfer event, continue
            }
        }
    }

    if (!transferFound) {
        return { valid: false, error: "No USDC transfer found", code: "INVALID_RECIPIENT" };
    }

    // 5. Verify amount
    if (transferAmount < this.minimumPayment) {  // 0.25 USDC = 250000 wei
        return { 
            valid: false, 
            error: `Insufficient payment. Minimum: $0.25, received: $${ethers.formatUnits(transferAmount, 6)}`,
            code: "INSUFFICIENT_PAYMENT" 
        };
    }

    // 6. Check payment recency (must be within 24 hours)
    const block = await this.provider.getBlock(receipt.blockNumber);
    const paymentAge = (Date.now() / 1000) - block.timestamp;
    if (paymentAge > 24 * 60 * 60) {
        return { valid: false, error: "Payment too old", code: "PAYMENT_EXPIRED" };
    }

    // 7. Mark as used and return success
    this.usedPayments.set(txHash, {
        requestId: requestId || 'legacy',
        timestamp: Date.now()
    });

    return {
        valid: true,
        txHash: txHash,
        from: senderAddress,
        amount: ethers.formatUnits(transferAmount, 6),
        blockNumber: receipt.blockNumber,
        timestamp: block.timestamp
    };
}
```

### 4.3 Payment Request Lifecycle

```javascript
// Request expiration
this.pendingRequests.set(requestId, {
    headline,
    createdAt: Date.now(),
    expiresAt: Date.now() + (10 * 60 * 1000)  // 10 minutes
});

// Cleanup (removes expired requests and old used payments)
cleanupExpiredRequests() {
    // Remove requests older than 10 minutes
    // Remove used payments older than 24 hours
}
```

---

## 5. Current Integration Points Between X402 & ERC-8004

### 5.1 API Endpoints Integration

**File:** `/news-service/src/index.js`

#### Free Demo Endpoint (No Payment):
```javascript
POST /api/demo/classify
Body: { "headline": "..." }
Response: { sentiment, confidence, proofHash }
// Uses mock proofs, no on-chain posting
// No X402 or ERC-8004 involved
```

#### X402 Paid Classification Endpoint:
```javascript
POST /api/classify
Body: { "headline": "...", "paymentTx": "0x...", "requestId": "..." }

Process:
1. Verify payment on Base Mainnet
2. Generate full classification with proof
3. Post to NewsClassificationOracle (includes oracleTokenId)
4. Return classification with payment receipt

Returns:
{
    service: "zkML News Classification",
    headline: headline,
    sentiment: sentiment,
    confidence: confidence,
    proofHash: proofHash,
    oracleTokenId: oracleTokenId,
    payment: {
        txHash: paymentTx,
        from: userAddress,
        amount: "0.25 USDC"
    }
}
```

#### Payment Discovery Endpoint:
```javascript
GET /.well-known/payment
// RFC 5785: Service discovery endpoint
// Returns X402 metadata
// Enables autonomous agents to find oracle and pricing
```

### 5.2 Data Flow: X402 Payment → ERC-8004 Classification

```
Payment Received
    ↓
verifyPayment(txHash)
    ├─→ Check on-chain USDC transfer
    ├─→ Verify amount, recipient, recency
    └─→ Mark payment as used (prevent reuse)
    ↓
Classification Generated
    ├─→ NewsClassifier.classify(headline)
    ├─→ Generate proof (JOLT + Groth16)
    └─→ Create ClassificationResult
    ↓
On-Chain Posting
    ├─→ NewsClassificationOracle.postClassification(...)
    ├─→ Store with oracleTokenId
    ├─→ Submit proof to ZkMLVerificationRegistry
    └─→ Request validation
    ↓
Response to User
    └─→ Include payment receipt + classification + oracleTokenId
```

### 5.3 Reputation-Based Service Quality

**Potential Future Enhancement:**

```javascript
// X402 pricing could be dynamic based on oracle reputation
const oracleReputation = await verificationRegistry.getReputationScore(
    oracleTokenId,
    "news_classification"
);

// High reputation oracle: $0.20
// Medium reputation: $0.25
// Low reputation: $0.50 or service disabled

// Track payment source per oracle
// Build reputation profile of oracle based on trade outcomes
```

---

## 6. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        zkML NEWS ORACLE SYSTEM                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│      BASE MAINNET BLOCKCHAIN             │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  ZkMLVerificationRegistry        │   │
│  │  (ERC-8004 Identity & Rep)       │   │
│  │                                  │   │
│  │  - Agent registration (#1-3)     │   │
│  │  - Reputation scoring (0-1000)   │   │
│  │  - Proof submission tracking     │   │
│  │  - Validation history            │   │
│  │  - Contract authorization        │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────▼───────────────────┐   │
│  │  NewsClassificationOracle        │   │
│  │  (ERC-8004 Agent Token #1)       │   │
│  │                                  │   │
│  │  - Stores oracleTokenId in       │   │
│  │    every classification          │   │
│  │  - Links oracle identity to      │   │
│  │    classifications               │   │
│  │  - Verifies authorization        │   │
│  │  - Submits proofs                │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────▼───────────────────┐   │
│  │  ValidationRegistry              │   │
│  │  (ERC-8004 Validation Flow)      │   │
│  │                                  │   │
│  │  - Validation requests           │   │
│  │    (agentTokenId from oracle)    │   │
│  │  - Validator responses           │   │
│  │  - Reputation updates            │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────▼───────────────────┐   │
│  │  TradingAgentBase                │   │
│  │  (ERC-8004 Agent Token #2)       │   │
│  │                                  │   │
│  │  - Listens for classifications   │   │
│  │  - Checks oracle reputation via  │   │
│  │    oracleTokenId lookup          │   │
│  │  - Executes trades if oracle     │   │
│  │    reputation >= threshold       │   │
│  │  - Evaluates profitability       │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────▼───────────────────┐   │
│  │  NewsVerifier (Validator)        │   │
│  │  (ERC-8004 Agent Token #3)       │   │
│  │                                  │   │
│  │  - Verifies Groth16 proofs       │   │
│  │  - Submits validation responses  │   │
│  │  - Updates reputation            │   │
│  └──────────────────────────────────┘   │
│                                          │
└──────────────────────────────────────────┘
         ▲                     ▲
         │ Event listeners     │ Oracle reputation lookup
         │                     │
         │            ┌────────┴──────────────┐
         │            │                       │
┌────────┴──────────┐  │  ┌──────────────────────────┐
│  NEWS SERVICE     │  │  │  TRADING AGENT SERVICE   │
│  (Off-Chain)      │  │  │  (Off-Chain)             │
├───────────────────┤  │  ├──────────────────────────┤
│                   │  │  │                          │
│ - fetcher.js      │  │  │ - baseTrader.js          │
│ - classifier.js   │  │  │ - Event polling          │
│ - poster.js       │  │  │ - Trade execution        │
│ - x402Service.js  │  │  │ - Profitability eval     │
│                   │  │  │                          │
│ ┌─────────────────┐ │  │ ┌──────────────────────┐  │
│ │  X402 Payment   │ │  │ │  Uniswap V3          │  │
│ │  Server         │─┼──┼─→  SwapRouter         │  │
│ │                 │ │  │ │                      │  │
│ │ - Payment       │ │  │ │ - WETH/USDC pairs    │  │
│ │   verification  │ │  │ │ - Exact input swaps  │  │
│ │ - Pricing       │ │  │ │                      │  │
│ │ - Requests      │ │  │ │                      │  │
│ └─────────────────┘ │  │ └──────────────────────┘  │
│                   │  │  │                          │
└───────────────────┘  │  └──────────────────────────┘
                       │
                ┌──────┴──────────┐
                │                 │
              Users         Autonomous
                          Agents
```

---

## 7. Oracle Posting System Architecture

### 7.1 Classification Lifecycle

```
PHASE 1: NEWS GATHERING
└─→ fetcher.js
    ├─ Poll CoinDesk RSS feed
    ├─ Fetch CryptoCompare market data
    └─ Return array of news items

PHASE 2: CLASSIFICATION
└─→ classifier.js + prover.js
    ├─ Extract text features
    ├─ Run ONNX inference (or heuristic fallback)
    ├─ Generate JOLT proof
    ├─ Wrap in Groth16 circuit
    └─ Return: sentiment, confidence, proofHash

PHASE 3: CONFIDENCE FILTERING
└─→ classifier.js
    ├─ Check: confidence >= minConfidenceThreshold (60)
    ├─ If too low: Skip classification
    └─ If adequate: Proceed to posting

PHASE 4: ON-CHAIN POSTING
└─→ poster.js
    ├─ Connect to NewsClassificationOracle
    ├─ Call postClassification(headline, sentiment, confidence, proofHash)
    ├─ Wait for transaction confirmation
    ├─ Parse NewsClassified event
    ├─ Extract classificationId
    └─ Return: { classificationId, txHash, blockNumber }

PHASE 5: AUTO-TRADING (Optional)
└─→ (if ENABLE_AUTO_TRADE=true)
    ├─ Instantiate BaseTrader
    ├─ Call trader.executeTrade(classificationId)
    └─ Wait for profitability evaluation

PHASE 6: CYCLE COMPLETE
└─→ Log stats and wait for next cycle
```

### 7.2 Cron Scheduling

**File:** `/news-service/src/index.js`

```javascript
// Scheduled execution
const cronExpression = `*/${config.pollIntervalMinutes} * * * *`;
// Every 5 minutes (configurable)

cron.schedule(cronExpression, async () => {
    await this.processNewsCycle();
});

// On each cycle:
async processNewsCycle() {
    1. Fetch news items
    2. For each item:
       - Classify with JOLT + Groth16
       - Post to oracle (includes oracleTokenId)
       - Auto-trade if enabled
       - Small delay (2s) between posts
    3. Log statistics
}
```

### 7.3 Error Handling & Resilience

**Proof Generation Fallback:**
```javascript
// If ONNX inference fails or unavailable
// Classifier falls back to heuristic classification
// Proof is still generated (either full or mock)
// Service continues without interruption

if (this.useRealProofs) {
    try {
        const inferenceResult = await this.joltOnnxProver.runInference(headline);
        // ... use ONNX result
    } catch (error) {
        // Fall back to heuristic
        const features = extractFeatures(headline);
        const classification = mapFeaturesToClassification(features);
        // ... use heuristic result
    }
}
```

**Transaction Retry Logic:**
```javascript
// Robust posting with fee bumping
const maxAttempts = 3;
for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
        // Calculate fee with bump: 1.25x per attempt
        const bump = 1 + (attempt - 1) * 0.25;
        const maxFeePerGas = baseFee * bump;
        
        // Send transaction
        const tx = await contract.postClassification(..., { maxFeePerGas });
        
        // Wait for confirmation with timeout
        const receipt = await provider.waitForTransaction(tx.hash, 1, 180000);
        
        // Success!
        return receipt;
    } catch (err) {
        if (attempt < maxAttempts && isRecoverable(err)) {
            await delay(1000 * attempt);  // Exponential backoff
            continue;
        }
        throw err;
    }
}
```

---

## 8. Key Integration Patterns

### Pattern 1: Oracle Identity Propagation

```
Registration
  └─→ Oracle gets tokenId #1 from ZkMLVerificationRegistry

Classification
  └─→ StoredClassification.oracleTokenId = 1

Validation
  └─→ ValidationRequest.agentTokenId = 1

Trading
  └─→ TradingAgent queries: getReputationScore(1, "news_classification")

Reputation Update
  └─→ increaseReputation(1, 10) / decreaseReputation(1, 5)
```

### Pattern 2: Proof Verification Chain

```
Proof Generation
  └─→ Proof hash created locally (off-chain)

Submission
  └─→ Proof hash submitted to ZkMLVerificationRegistry
  └─→ Associated with oracleTokenId

Validation
  └─→ Validator verifies full Groth16 proof (off-chain)
  └─→ Submits validation response with oracleTokenId

Reputation Update
  └─→ Based on validation outcome, oracle reputation adjusted
```

### Pattern 3: Reputation-Based Access Control

```
Payment Received (X402)
  └─→ Classification requested

Oracle Check
  └─→ getReputationScore(oracleTokenId, "news_classification")

Authorization Decision
  └─→ if reputation < 50: Reject or charge premium
  └─→ if reputation >= 50: Process request

Service Delivery
  └─→ Classification posted on-chain with oracleTokenId
  └─→ Trading agent checks reputation before trading
```

---

## 9. Deployed Contract Addresses (Base Mainnet)

**From `/render.yaml`:**

| Contract | Address | Role |
|----------|---------|------|
| ZkMLVerificationRegistry | 0x909fbFbFE9F7Bdb4d1a6e02F2E91d3f367555b07 | Identity & Reputation |
| NewsClassificationOracle | 0xe92c7aE9E894a8701583a43363676ff878d5b6ed | Oracle (Token #1) |
| ValidationRegistry | 0x04C6276830DA145ee465194131B7beC22aa2d0d3 | Validation Lifecycle |
| TradingAgentBase | 0x0D43DC16eFC1322Df3CE2B2852558993918A122B | Trading (Token #2) |
| NewsVerifier | 0x0590f2DFa80BCCc948aDb992737305f2FD01ceba | Verifier (Token #3) |
| Groth16Verifier | 0xebE04Fa57C6cb7294DD7B3D16c166c3424092168 | Proof Verification |

**Token Endpoints (Base Mainnet):**
- USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- WETH: 0x4200000000000000000000000000000000000006
- Uniswap V3 Router: 0x2626664c2603336E57B271c5C0b26F421741e481

---

## 10. Future Enhancement Opportunities

### 10.1 Dynamic X402 Pricing Based on Reputation
```javascript
// Current: Fixed $0.25
// Future: Dynamic pricing
const repScore = getReputationScore(oracleTokenId);
let price = 0.25;

if (repScore >= 900) price = 0.15;      // Premium oracle
else if (repScore >= 600) price = 0.25; // Standard
else if (repScore >= 300) price = 0.50; // Developing oracle
else price = 1.00;                      // Unproven oracle
```

### 10.2 Multi-Agent Reputation Aggregation
```solidity
// Request classification from multiple oracles
// Aggregate reputations for consensus
// Distribute payment based on oracle accuracy

function requestMultiOracleClassification(headline) {
    bytes32[] memory oracleTokenIds = [1, 4, 5];  // Multiple oracles
    
    for (uint256 i = 0; i < oracleTokenIds.length; i++) {
        requestOracleClassification(headline, oracleTokenIds[i]);
    }
    
    // Consensus voting with reputation weighting
}
```

### 10.3 Tokenized Reputation Score
```solidity
// Mint reputation tokens to oracle for proving accuracy
// Trade, stake, or use reputation tokens as collateral
// Create liquid market for oracle reliability

function reputationToToken(tokenId, amount) external {
    // Burn reputation points
    decreaseReputation(tokenId, amount);
    
    // Mint reputation tokens
    reputationToken.mint(msg.sender, amount);
}
```

### 10.4 Automated Reputation Slashing
```solidity
// If oracle's predictions consistently fail over time
// Automatically reduce reputation and require re-registration

function checkAutomatedSlashing(tokenId) external {
    AgentCapability storage cap = _agents[tokenId].capabilities["news_classification"];
    
    if (cap.consecutiveFailures >= 10) {
        // Slash reputation
        cap.reputationScore = cap.reputationScore / 2;
        cap.isActive = false;
        
        // Require oracle owner to re-register
        emit OracleSlashed(tokenId, "consecutive_failures");
    }
}
```

---

## 11. Security Considerations

### 11.1 Proof Verification
- Groth16 proofs verified on-chain before classification accepted
- JOLT-Atlas provides computational soundness
- Feature extraction cannot be manipulated by oracle

### 11.2 Payment Verification
- USDC transfers verified directly from Base Mainnet state
- Payment receipts immutable in transaction history
- Replay protection through `usedPayments` mapping
- Time-locked requests (10 minute expiration)

### 11.3 Reputation System
- Only verified validators can update reputation
- Validation requests require agent token ownership
- Progressive penalties prevent rapid reputation recovery
- Validator reputation also tracked (incentive alignment)

### 11.4 Smart Contract Authorization
- Only authorized contracts can submit proofs
- Oracle contract must be approved in registry
- Token ownership verified via `ownerOf(tokenId)`

---

## 12. Conclusion

The ERC-8004 integration with X402 creates a complete autonomous oracle system where:

1. **Agent Identity** is cryptographically verified on-chain via NFT tokens
2. **Reputation** dynamically reflects oracle accuracy and trading success
3. **Payment Verification** leverages on-chain USDC transfer verification
4. **Autonomous Trading** respects oracle reputation before executing trades
5. **Validation Lifecycle** provides decentralized verification of proofs

The system demonstrates how verifiable AI agents can operate in crypto markets with:
- Transparent reputation tracking
- Automated payment settlement
- Zero-knowledge proof verification
- Autonomous execution based on verified data

This creates trust in AI-driven financial markets without requiring a centralized oracle operator.

