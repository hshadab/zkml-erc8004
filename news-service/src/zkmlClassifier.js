/**
 * zkML News Classifier
 * Complete pipeline: ONNX → JOLT → Groth16 → On-Chain
 *
 * This is the REAL zkML implementation with:
 * - Real ONNX neural network (sentiment0 model)
 * - Real JOLT zkML proofs (~20s)
 * - Real Groth16 zkSNARKs (~1.5s)
 * - Ready for on-chain verification
 */

import { JoltOnnxProver } from './joltOnnxProver.js';
import { JoltGroth16Wrapper } from './joltGroth16Wrapper.js';
import { logger } from './logger.js';
import { config } from './config.js';

/**
 * zkML News Classifier
 * Full pipeline with JOLT-Atlas zkML proofs
 */
export class ZkmlClassifier {
  constructor() {
    this.joltProver = new JoltOnnxProver();
    this.groth16Wrapper = new JoltGroth16Wrapper();
    this.initialized = false;
  }

  /**
   * Initialize all components
   */
  async initialize() {
    if (this.initialized) return;

    logger.info('🚀 Initializing zkML Classifier...');
    logger.info('   Pipeline: ONNX → JOLT → Groth16 → On-Chain');

    await this.joltProver.initialize();
    logger.info('✅ zkML Classifier ready');

    this.initialized = true;
  }

  /**
   * Classify news headline with full zkML proof pipeline
   *
   * @param {Object} newsItem - News item with headline, source, etc.
   * @returns {Promise<Object>} Classification result with JOLT + Groth16 proofs
   */
  async classify(newsItem) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const headline = newsItem.headline;
      logger.info(`\\n📰 zkML Classification: "${headline}"`);
      logger.info('=' .repeat(80));

      const totalStart = Date.now();

      // Step 1: ONNX Inference + JOLT Proof (~20 seconds)
      logger.info('\\n[1/2] ONNX Inference + JOLT zkML Proof...');
      const joltResult = await this.joltProver.generateProof(headline);

      if (!joltResult.isReal) {
        logger.warn('⚠️  JOLT proof is simulated (binary timeout or unavailable)');
        logger.warn('   Falling back to standard Groth16 proofs');
      }

      logger.info(`✅ JOLT Phase Complete:`);
      logger.info(`   Sentiment: ${joltResult.sentiment === 2 ? 'GOOD' : 'BAD'}`);
      logger.info(`   Confidence: ${joltResult.confidence}%`);
      logger.info(`   Inference: ${joltResult.inferenceTimeMs}ms`);
      logger.info(`   JOLT Proof: ${joltResult.proofTimeMs}ms`);

      // Step 2: Wrap JOLT proof in Groth16 for on-chain verification (~1.5 seconds)
      logger.info(`\\n[2/2] Groth16 Proof Wrapper...`);
      const groth16Result = await this.groth16Wrapper.wrapProof(
        {
          proofData: joltResult.proofData,
          proofHash: joltResult.proofHash
        },
        joltResult.sentiment,
        joltResult.confidence
      );

      logger.info(`✅ Groth16 Phase Complete:`);
      logger.info(`   Wrapper: ${groth16Result.generationTimeMs}ms`);
      logger.info(`   Proof Hash: ${groth16Result.proofHash.slice(0, 20)}...`);
      logger.info(`   Public Signals: [${groth16Result.publicSignals.join(', ')}]`);

      const totalTime = Date.now() - totalStart;

      // Check confidence threshold
      if (joltResult.confidence < config.minConfidenceThreshold) {
        logger.info(`⚠️  Confidence too low (< ${config.minConfidenceThreshold}%), skipping`);
        return {
          success: false,
          reason: 'confidence_too_low',
          classification: {
            sentiment: joltResult.sentiment,
            confidence: joltResult.confidence
          }
        };
      }

      logger.info(`\\n🎉 zkML Classification Complete!`);
      logger.info(`   Total Time: ${totalTime}ms`);
      logger.info(`   ├─ ONNX Inference: ${joltResult.inferenceTimeMs}ms`);
      logger.info(`   ├─ JOLT Proof: ${joltResult.proofTimeMs}ms`);
      logger.info(`   └─ Groth16 Wrapper: ${groth16Result.generationTimeMs}ms`);
      logger.info('=' .repeat(80));

      // Return complete result
      return {
        success: true,
        headline,
        sentiment: joltResult.sentiment,
        confidence: joltResult.confidence,

        // JOLT proof data
        joltProofHash: joltResult.proofHash,
        joltProofData: joltResult.proofData,
        joltIsReal: joltResult.isReal,

        // Groth16 proof data (for on-chain verification)
        proofHash: groth16Result.proofHash,
        proof: groth16Result.proof,
        publicSignals: groth16Result.publicSignals,
        proofBytes: groth16Result.proofBytes,

        // Timing breakdown
        timingMs: {
          inference: joltResult.inferenceTimeMs,
          jolt: joltResult.proofTimeMs,
          groth16: groth16Result.generationTimeMs,
          total: totalTime
        },

        // Metadata
        pipeline: 'ONNX→JOLT→Groth16',
        model: 'crypto_sentiment',
        tokens: joltResult.tokens,
        isRealZkml: joltResult.isReal,  // True if JOLT proof is real
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`Classification failed: ${error.message}`);
      logger.error(error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test classifier with example headlines
   */
  async test() {
    const testHeadlines = [
      { headline: 'Bitcoin ETF approval - great news', source: 'CoinDesk', reliability: 0.95 },
      { headline: 'Exchange hacked - bad situation', source: 'CoinDesk', reliability: 0.95 },
      { headline: 'Ethereum stable today', source: 'CoinDesk', reliability: 0.95 }
    ];

    logger.info('🧪 Testing zkML Classifier with example headlines\\n');

    for (const item of testHeadlines) {
      const result = await this.classify(item);

      if (result.success) {
        console.log(`\\n✅ ${result.headline}`);
        console.log(`   → ${result.sentiment === 2 ? 'GOOD' : 'BAD'} (${result.confidence}%)`);
        console.log(`   → Pipeline: ${result.pipeline}`);
        console.log(`   → Real zkML: ${result.isRealZkml ? 'YES ✓' : 'NO (simulated)'}`);
        console.log(`   → Total Time: ${result.timingMs.total}ms`);
        console.log(`   → Proof Hash: ${result.proofHash.slice(0, 20)}...`);
      } else {
        console.log(`\\n❌ ${item.headline}`);
        console.log(`   Reason: ${result.reason || result.error}`);
      }
    }
  }
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const classifier = new ZkmlClassifier();
  await classifier.test();
}
