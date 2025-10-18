import { extractFeatures, mapFeaturesToClassification } from './featureExtractor.js';
import { JoltProver } from './prover.js';
import { Groth16Prover } from './groth16Prover.js';
import { logger } from './logger.js';
import { config } from './config.js';

/**
 * News classification pipeline
 * Combines feature extraction, classification, and REAL Groth16 proof generation
 */
export class NewsClassifier {
  constructor() {
    // Use REAL Groth16 prover (falls back to mock if circuit files not found)
    this.useRealProofs = process.env.USE_REAL_PROOFS !== 'false';
    this.prover = this.useRealProofs ? new Groth16Prover() : new JoltProver();
    logger.info(`📝 Prover initialized: ${this.useRealProofs ? 'REAL Groth16 zkSNARK' : 'Mock (for testing)'}`);
  }

  /**
   * Classify a news item
   * @param {Object} newsItem - News item with headline, source, etc.
   * @returns {Promise<Object>} Classification result with proof
   */
  async classify(newsItem) {
    try {
      logger.info(`\n📰 Classifying: "${newsItem.headline}"`);

      // 1. Extract features
      const features = extractFeatures(newsItem.headline);
      logger.info(`   Features: [${features.map(f => f.toFixed(2)).join(', ')}]`);

      // 2. Classify using heuristic (or ONNX model)
      const classification = mapFeaturesToClassification(features);
      logger.info(`   Classification: ${['BAD', 'NEUTRAL', 'GOOD'][classification.sentiment]}`);
      logger.info(`   Confidence: ${classification.confidence}%`);

      // 3. Check confidence threshold
      if (classification.confidence < config.minConfidenceThreshold) {
        logger.info(`   ⚠️  Confidence too low (< ${config.minConfidenceThreshold}%), skipping`);
        return {
          success: false,
          reason: 'confidence_too_low',
          classification
        };
      }

      // 4. Generate proof (REAL Groth16 or mock)
      let proofResult;
      if (this.useRealProofs) {
        proofResult = await this.prover.generateProof(features, classification.sentiment, classification.confidence);
      } else {
        const proofHash = await this.prover.generateProof(features, classification.sentiment);
        proofResult = { proofHash, isReal: false };
      }

      // 5. Return result
      return {
        success: true,
        headline: newsItem.headline,
        sentiment: classification.sentiment,
        confidence: classification.confidence,
        proofHash: proofResult.proofHash,
        proof: proofResult.proof,  // Full Groth16 proof (if real)
        publicSignals: proofResult.publicSignals,  // Public signals (if real)
        proofBytes: proofResult.proofBytes,  // Encoded for contract (if real)
        isRealProof: proofResult.isReal || false,
        proofGenerationMs: proofResult.generationTimeMs || 700,
        features,
        probabilities: classification.probabilities,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Classification failed:', error);
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
      { headline: 'SEC approves spot Bitcoin ETF', source: 'CoinDesk', reliability: 0.95 },
      { headline: 'Major crypto exchange hacked, $500M stolen', source: 'CoinDesk', reliability: 0.95 },
      { headline: 'Bitcoin price remains stable', source: 'CoinDesk', reliability: 0.95 }
    ];

    logger.info('Testing classifier with example headlines:\n');

    for (const item of testHeadlines) {
      const result = await this.classify(item);

      if (result.success) {
        console.log(`✅ ${result.headline}`);
        console.log(`   → ${['BAD', 'NEUTRAL', 'GOOD'][result.sentiment]} (${result.confidence}%)`);
        console.log(`   Proof: ${result.proofHash.slice(0, 20)}...\n`);
      } else {
        console.log(`❌ ${item.headline}`);
        console.log(`   Reason: ${result.reason || result.error}\n`);
      }
    }
  }
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const classifier = new NewsClassifier();
  await classifier.test();
}
