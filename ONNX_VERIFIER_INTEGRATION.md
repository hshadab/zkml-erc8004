# ONNX Verifier Integration Strategy

## Vision: From Single Model to zkML Platform

You now have **two complementary repositories**:

1. **onnx-verifier** - Generic zkML prover (platform core)
2. **zkml-erc8004** - Sentiment oracle (reference implementation)

This is the **ideal architecture** for building a zkML-as-a-Service platform.

---

## Current State Analysis

### zkml-erc8004 (Sentiment-Specific)

**Strengths:**
- ✅ Complete end-to-end implementation
- ✅ Working Groth16 wrapper (generic!)
- ✅ X402 payment integration
- ✅ ERC-8004 registry integration
- ✅ Live demo + UI
- ✅ Improved sentiment model (100% accuracy)

**Limitations:**
- ❌ Hardcoded model paths (crypto_sentiment only)
- ❌ Text-specific tokenization
- ❌ Cannot handle other ONNX models
- ❌ Not reusable for token risk scorer, document classifier, etc.

### onnx-verifier (Likely Generic)

**Expected Capabilities:**
- ✅ Accept any ONNX model
- ✅ Dynamic model loading
- ✅ Generic input handling
- ✅ JOLT proof generation
- ✅ Reusable across use cases

**What it probably lacks:**
- ❌ Application-specific logic (X402 payments, oracle posting)
- ❌ UI/frontend
- ❌ Complete reference implementation

---

## Recommended Architecture

### Option 1: Three-Tier Platform (Recommended)

```
┌────────────────────────────────────────────────────────┐
│  Tier 1: Core zkML Engine                             │
│  Repository: onnx-verifier                             │
├────────────────────────────────────────────────────────┤
│                                                         │
│  class OnnxVerifier {                                  │
│    async loadModel(modelPath)                          │
│    async prove(inputs)                                 │
│    async verify(proof)                                 │
│  }                                                      │
│                                                         │
│  • Model agnostic                                      │
│  • Generic input/output                                │
│  • JOLT + Groth16 pipeline                             │
│  • No application logic                                │
│                                                         │
└───────────────┬────────────────────────────────────────┘
                │
                ├─► Tier 2: Application Services
                │   (Built on top of onnx-verifier)
                │
                ├─► zkml-erc8004 (Sentiment Oracle)
                │   • Crypto news classification
                │   • X402 payments ($0.25)
                │   • ERC-8004 registry
                │   • NewsOracle contract
                │   • Trading automation
                │
                ├─► zkml-token-risk (Token Risk Scorer)
                │   • Rug pull detection
                │   • X402 payments ($2.00)
                │   • 60 on-chain features
                │
                └─► zkml-document (Document Classifier)
                    • Legal/financial docs
                    • X402 payments ($1.00)
                    • 50 text features
```

### Option 2: Monorepo Platform

```
zkml-platform/
├── core/                    # onnx-verifier code
│   ├── OnnxVerifier.js
│   ├── JoltProver.js
│   └── Groth16Wrapper.js
│
├── services/
│   ├── sentiment/          # zkml-erc8004 code
│   │   ├── SentimentService.js
│   │   ├── contracts/
│   │   └── ui/
│   │
│   ├── token-risk/         # Future
│   │   └── TokenRiskService.js
│   │
│   └── document/           # Future
│       └── DocumentService.js
│
├── contracts/              # Shared verifiers
│   ├── Groth16Verifier.sol
│   └── ERC8004Registry.sol
│
└── marketplace/            # X402 bazaar integration
    ├── ServiceManifest.js
    └── DiscoveryAPI.js
```

---

## Integration Steps

### Phase 1: Extract Generic Components (Week 1)

**Goal:** Make zkml-erc8004 use onnx-verifier as dependency

#### Step 1.1: Update joltOnnxProver.js

**Before (hardcoded):**
```javascript
const MODEL_DIR = '/home/hshadab/.../crypto_sentiment';
const MODEL_PATH = path.join(MODEL_DIR, 'network.onnx');
```

**After (parameterized):**
```javascript
import { OnnxVerifier } from 'onnx-verifier';

export class JoltOnnxProver {
  constructor(modelConfig = {}) {
    this.modelPath = modelConfig.modelPath || DEFAULT_MODEL_PATH;
    this.vocabPath = modelConfig.vocabPath || DEFAULT_VOCAB_PATH;
    this.verifier = new OnnxVerifier();
  }

  async initialize() {
    await this.verifier.loadModel(this.modelPath);
    this.vocab = await loadVocab(this.vocabPath);
  }
}
```

#### Step 1.2: Create Model Registry

```javascript
// models/registry.js
export const MODELS = {
  crypto_sentiment: {
    name: 'Crypto Sentiment v2',
    path: './models/crypto_sentiment_v2/network.onnx',
    vocab: './models/crypto_sentiment_v2/vocab.json',
    preprocessor: 'text-tokenizer',
    price: '0.25',
    description: 'Crypto news sentiment classifier'
  },

  token_risk: {
    name: 'Token Launch Risk Scorer',
    path: './models/token_risk/network.onnx',
    preprocessor: 'feature-vector',
    price: '2.00',
    description: 'Rug pull detection (60 on-chain features)'
  },

  document_classifier: {
    name: 'Document Categorizer',
    path: './models/document_classifier/network.onnx',
    preprocessor: 'text-embeddings',
    price: '1.00',
    description: 'Legal/financial document classification'
  }
};
```

#### Step 1.3: Create Preprocessor Pipeline

```javascript
// preprocessors/index.js
export class PreprocessorFactory {
  static create(type) {
    switch (type) {
      case 'text-tokenizer':
        return new TextTokenizer();  // Current sentiment logic

      case 'feature-vector':
        return new FeatureVectorPreprocessor();  // For token risk

      case 'text-embeddings':
        return new TextEmbeddingPreprocessor();  // For documents

      default:
        throw new Error(`Unknown preprocessor: ${type}`);
    }
  }
}

class TextTokenizer {
  preprocess(text, vocab) {
    // Current tokenization logic from joltOnnxProver.js
    const tokens = this.tokenize(text);
    return this.pad(tokens, 60);
  }
}

class FeatureVectorPreprocessor {
  async preprocess(tokenAddress, provider) {
    // Extract on-chain features for token risk scoring
    const features = await extractTokenFeatures(tokenAddress, provider);
    return features;  // [60 numeric values]
  }
}
```

### Phase 2: Generalize zkmlClassifier (Week 2)

**Before (sentiment-only):**
```javascript
export class ZkmlClassifier {
  constructor() {
    this.joltProver = new JoltOnnxProver();  // Hardcoded sentiment
    this.groth16Wrapper = new JoltGroth16Wrapper();
  }
}
```

**After (model-agnostic):**
```javascript
export class ZkmlClassifier {
  constructor(modelId) {
    this.modelConfig = MODELS[modelId];
    if (!this.modelConfig) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    this.joltProver = new JoltOnnxProver(this.modelConfig);
    this.groth16Wrapper = new JoltGroth16Wrapper();
    this.preprocessor = PreprocessorFactory.create(
      this.modelConfig.preprocessor
    );
  }

  async classify(input) {
    // Preprocess based on model type
    const features = await this.preprocessor.preprocess(
      input,
      this.joltProver.vocab
    );

    // Run JOLT proof
    const joltResult = await this.joltProver.generateProof(features);

    // Wrap in Groth16
    const groth16Result = await this.groth16Wrapper.wrapProof(
      joltResult.proofData,
      joltResult.sentiment,
      joltResult.confidence
    );

    return groth16Result;
  }
}
```

### Phase 3: Multi-Model API (Week 3)

**Update news-service API:**

```javascript
// src/index.js
import { ZkmlClassifier } from './zkmlClassifier.js';
import { X402Service } from './x402Service.js';
import { MODELS } from './models/registry.js';

class ZkmlService {
  constructor() {
    this.classifiers = new Map();
    this.x402 = new X402Service();
  }

  async initialize() {
    // Initialize all available models
    for (const [modelId, config] of Object.entries(MODELS)) {
      try {
        const classifier = new ZkmlClassifier(modelId);
        await classifier.initialize();
        this.classifiers.set(modelId, classifier);
        logger.info(`✅ Loaded model: ${config.name}`);
      } catch (error) {
        logger.warn(`⚠️  Skipping ${modelId}: ${error.message}`);
      }
    }

    await this.x402.initialize();
  }

  // Generic inference endpoint
  async handleInference(req, res) {
    const { model, input, paymentTx } = req.body;

    // Verify payment
    const modelConfig = MODELS[model];
    const payment = await this.x402.verifyPayment(
      paymentTx,
      modelConfig.price
    );

    if (!payment.valid) {
      return res.status(402).json({
        error: 'Payment required',
        price: modelConfig.price
      });
    }

    // Run inference
    const classifier = this.classifiers.get(model);
    const result = await classifier.classify(input);

    res.json(result);
  }
}

// Routes
app.post('/api/classify/:model', async (req, res) => {
  await service.handleInference(req, res);
});

// List available models
app.get('/api/models', (req, res) => {
  const models = Object.entries(MODELS).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description,
    price: config.price,
    available: service.classifiers.has(id)
  }));

  res.json({ models });
});
```

### Phase 4: Developer Submission API (Week 4)

**Allow developers to submit their own models (70/30 split):**

```javascript
// Developer API
app.post('/api/models/submit', upload.single('model'), async (req, res) => {
  const {
    name,
    description,
    preprocessor,
    price,
    developerAddress
  } = req.body;

  const modelFile = req.file;  // .onnx file

  // Validate model
  const validation = await validateOnnxModel(modelFile);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  if (validation.maxTensorSize > 64) {
    return res.status(400).json({
      error: `Model too large: max tensor size ${validation.maxTensorSize} > 64 (JOLT limit)`
    });
  }

  // Store model
  const modelId = generateModelId(name, developerAddress);
  await storeModel(modelId, modelFile, {
    name,
    description,
    preprocessor,
    price,
    developerAddress,
    revenueShare: 0.70  // 70% to developer
  });

  // Register in catalog
  await registerModel(modelId);

  res.json({
    modelId,
    status: 'pending_review',
    message: 'Model submitted successfully. Will be available after review.'
  });
});
```

---

## Revenue Model Evolution

### Current (Single Model)
- Sentiment oracle: $0.25/classification
- Revenue: ~$250/month (estimated)
- Limited market

### After Integration (Multi-Model Platform)

#### Platform Revenue Streams

1. **First-Party Models (100% revenue)**
   - Crypto Sentiment: $0.25/call
   - Token Risk Scorer: $2.00/call
   - Document Classifier: $1.00/call

2. **Third-Party Models (30% platform fee)**
   - Developers submit models
   - Platform takes 30%, developer gets 70%
   - Example: 100 models × $500/month × 30% = $15,000/month

3. **Enterprise Plans**
   - Unlimited API access: $500/month
   - Custom model hosting: $1,000/month
   - Priority proof generation: $2,000/month

**Projected Revenue:**
- First-party models: $10,000/month
- Third-party fees: $15,000/month
- Enterprise plans: $25,000/month
- **Total: $50,000/month** ($600k/year)

---

## X402 Bazaar Strategy

### Current Listing (Single Service)
```json
{
  "name": "Crypto Sentiment Oracle",
  "price": "$0.25",
  "category": "DeFi Analytics"
}
```

### After Integration (Platform Listing)
```json
{
  "name": "zkML-as-a-Service Platform",
  "tagline": "Prove any ONNX model ran correctly",
  "models": [
    {
      "id": "crypto_sentiment",
      "name": "Crypto News Sentiment",
      "price": "$0.25",
      "use_case": "Trading bots, DeFi automation"
    },
    {
      "id": "token_risk",
      "name": "Token Launch Risk Scorer",
      "price": "$2.00",
      "use_case": "Rug pull detection, due diligence"
    },
    {
      "id": "document_classifier",
      "name": "Legal Document Categorizer",
      "price": "$1.00",
      "use_case": "Contract analysis, compliance"
    },
    {
      "id": "developer_submission",
      "name": "Submit Your Model",
      "price": "Custom",
      "use_case": "70% revenue share for developers"
    }
  ],
  "developer_api": "https://trustlessdefi.onrender.com/api/models/submit",
  "pricing": "Pay-per-use (X402) or Enterprise plans"
}
```

---

## Technical Benefits

### Code Reuse
- ✅ joltGroth16Wrapper.js already generic → reuse for all models
- ✅ X402 payment service → works for any model
- ✅ ERC-8004 registry → one registry, multiple models
- ✅ UI dashboard → add model selector dropdown

### Reduced Duplication
**Before:** Each new model = full repo copy
**After:** Each new model = config + preprocessor (~100 lines)

**Example - Adding Token Risk Scorer:**

```javascript
// models/registry.js - ADD 8 LINES
token_risk: {
  name: 'Token Launch Risk Scorer',
  path: './models/token_risk/network.onnx',
  preprocessor: 'feature-vector',
  price: '2.00',
  description: 'Rug pull detection'
}

// preprocessors/FeatureVectorPreprocessor.js - NEW FILE (~150 lines)
export class FeatureVectorPreprocessor {
  async preprocess(tokenAddress, provider) {
    // Extract 60 on-chain features
    const features = await extractTokenFeatures(tokenAddress);
    return features;
  }
}
```

**Total: ~160 lines of code** instead of duplicating entire repo (5000+ lines)

---

## Migration Path

### Immediate (This Week)
1. ✅ Review onnx-verifier codebase (need access)
2. ✅ Identify overlap with zkml-erc8004
3. ✅ Plan refactoring strategy

### Short-Term (2-4 Weeks)
1. Extract generic OnnxVerifier interface
2. Refactor joltOnnxProver to use onnx-verifier
3. Create model registry
4. Add preprocessor pipeline
5. Update API to support multiple models

### Medium-Term (1-2 Months)
1. Build Token Risk Scorer model
2. Build Document Classifier model
3. Launch developer submission API
4. Update X402 bazaar listing
5. Create marketplace UI

### Long-Term (3-6 Months)
1. Onboard 10+ developer-submitted models
2. Launch enterprise pricing
3. Build proof caching layer
4. Add batch inference API
5. Scale to 1000+ requests/day

---

## Success Metrics

### Platform Health
- Number of available models: 3 → 10 → 50
- Developer submissions: 0 → 5/month → 20/month
- API calls: 100/day → 1,000/day → 10,000/day

### Revenue Growth
- Month 1: $250 (sentiment only)
- Month 3: $2,000 (3 models)
- Month 6: $10,000 (10 models + developers)
- Month 12: $50,000 (50 models + enterprise)

### X402 Bazaar Ranking
- Listings: #1 "zkML-as-a-Service Platform"
- Category: "AI & Machine Learning"
- Rating: 4.8/5.0 (from agent users)
- Usage: Top 10 most-used services

---

## Questions for onnx-verifier Review

To finalize integration strategy, I need to understand:

1. **API Design:**
   - How do you load models? `loadModel(path)` or different?
   - How do you run inference? `prove(inputs)` or `verify(model, inputs)`?
   - What's the proof format returned?

2. **Model Support:**
   - What ONNX operators are supported?
   - Is there a max tensor size enforced?
   - How do you handle different input types (text vs. numeric)?

3. **JOLT Integration:**
   - Do you use the same JOLT binary?
   - How long do proofs take on average?
   - Do you have Groth16 wrapping built-in?

4. **Deployment:**
   - Is it a library or standalone service?
   - NPM package or Git submodule?
   - Dependencies (PyTorch, ONNX Runtime, etc.)?

---

## Next Steps

**Option A: Share onnx-verifier Details**
- Paste README.md or main code files
- I'll provide specific integration code

**Option B: Move Forward with Assumptions**
- I'll refactor zkml-erc8004 assuming standard OnnxVerifier interface
- We adjust when we see actual onnx-verifier code

**Option C: Platform-First Approach**
- Keep repos separate
- zkml-erc8004 = reference implementation
- onnx-verifier = core library used by multiple services

Which approach sounds best?
