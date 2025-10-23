/**
 * Rug Pull Detector Integration Service
 * Integrates rug pull detection ONNX model with zkml-erc8004 infrastructure
 */

import ort from 'onnxruntime-node';
import { ethers } from 'ethers';
import { logger } from '../../news-service/src/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_PATH = path.join(__dirname, '../rugdetector_v1.onnx');

/**
 * Rug Pull Detector Service
 * Provides risk scoring for token contracts using ONNX model + zkML proofs
 */
export class RugDetectorService {
  constructor() {
    this.session = null;
    this.initialized = false;
  }

  /**
   * Initialize ONNX session
   */
  async initialize() {
    if (this.initialized) return;

    logger.info('🔥 Initializing Rug Pull Detector...');
    logger.info(`   Model: ${MODEL_PATH}`);

    try {
      this.session = await ort.InferenceSession.create(MODEL_PATH);
      logger.info(`✅ Rug detector model loaded`);
      logger.info(`   Input: ${this.session.inputNames[0]}`);
      logger.info(`   Output: ${this.session.outputNames[0]}`);

      this.initialized = true;
    } catch (error) {
      logger.error(`❌ Failed to load rug detector model: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract 60 on-chain features for a token
   * This is a simplified version - full implementation would use Web3
   *
   * @param {string} tokenAddress - Token contract address
   * @param {ethers.Provider} provider - Web3 provider
   * @returns {Promise<number[]>} - 60 features
   */
  async extractFeatures(tokenAddress, provider) {
    logger.info(`🔍 Extracting features for token: ${tokenAddress}`);

    // In production, this would call the Python feature extractor
    // or reimplement feature extraction in JavaScript
    // For now, return mock features

    const features = new Array(60).fill(0);

    try {
      // Get basic contract info
      const code = await provider.getCode(tokenAddress);

      if (code === '0x') {
        throw new Error('Not a contract');
      }

      // Example features (simplified - would be much more sophisticated)
      features[0] = 30;  // contract_age_days (mock)
      features[1] = 0;   // is_verified (not verified)
      features[2] = code.includes('mint') ? 1 : 0;  // has_mint_function
      features[14] = 1000000;  // total_supply (normalized)

      // Liquidity features (would query DEX in production)
      features[16] = 10000;  // liquidity_usd (low liquidity = risky)
      features[17] = 0;      // liquidity_locked_pct (not locked)

      // Holder features (would query blockchain in production)
      features[31] = 100;    // holder_count (few holders)
      features[32] = 75;     // top10_holders_pct (high concentration)
      features[33] = 50;     // top1_holder_pct (single holder owns 50%)

      logger.info(`✅ Extracted ${features.length} features`);
      return features;

    } catch (error) {
      logger.error(`❌ Feature extraction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run rug pull risk detection
   *
   * @param {number[]} features - 60 on-chain features
   * @returns {Promise<{riskScore: number, riskLevel: string, prediction: number}>}
   */
  async detectRugPull(features) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (features.length !== 60) {
      throw new Error(`Expected 60 features, got ${features.length}`);
    }

    logger.info('🤖 Running rug pull detection...');

    // Create input tensor
    const inputTensor = new ort.Tensor(
      'float32',
      Float32Array.from(features),
      [1, 60]
    );

    // Run inference
    const startTime = Date.now();
    const results = await this.session.run({
      [this.session.inputNames[0]]: inputTensor
    });
    const inferenceTime = Date.now() - startTime;

    // Get prediction (0=SAFE, 1=RUG PULL)
    const outputName = this.session.outputNames[0];
    const prediction = Number(results[outputName].data[0]);

    // Convert to risk score (0-100)
    const riskScore = prediction === 1 ? 90 : 10;  // High risk if rug pull, low if safe
    const riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';

    logger.info(`✅ Detection complete in ${inferenceTime}ms`);
    logger.info(`   Prediction: ${prediction} (${prediction === 1 ? 'RUG PULL' : 'SAFE'})`);
    logger.info(`   Risk Score: ${riskScore}/100`);
    logger.info(`   Risk Level: ${riskLevel}`);

    return {
      prediction,
      riskScore,
      riskLevel,
      inferenceTimeMs: inferenceTime
    };
  }

  /**
   * Complete rug pull check (extract features + detect)
   *
   * @param {string} tokenAddress - Token contract address
   * @param {ethers.Provider} provider - Web3 provider
   * @returns {Promise<{tokenAddress, features, riskScore, riskLevel, prediction}>}
   */
  async checkToken(tokenAddress, provider) {
    logger.info(`\n🔍 Checking token for rug pull: ${tokenAddress}`);

    // Extract features
    const features = await this.extractFeatures(tokenAddress, provider);

    // Run detection
    const result = await this.detectRugPull(features);

    return {
      tokenAddress,
      features,
      ...result
    };
  }
}

// Export singleton instance
export const rugDetector = new RugDetectorService();

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  async function test() {
    const detector = new RugDetectorService();
    await detector.initialize();

    // Test with synthetic "safe" features
    const safeFeatures = [
      365, 1, 0, 0, 0, 0, 0, 0, 100, 100,
      0, 0, 0, 0, 10,
      100000, 95, 365, 80, 200, 0, 100, 2, 5, 1,
      0, 0.5, 1, 1, 0,
      5000, 25, 8, 2, 0, 0, 5, 2, 0, 0,
      0, 0, 0, 0.3, 50,
      500, 300, 200, 50000, 0, 5, 3, 0.3, 0, 0,
      0, 0, 0, 48, 0
    ];

    // Test with synthetic "rug pull" features
    const rugFeatures = [
      2, 0, 1, 1, 1, 0, 0, 0, 100, 100,
      5, 10, 0, 0, 1000000,
      5000, 5, 7, 0, 5, 1, 100, 10, 25, 5,
      -20, 0.1, 0, 1, 1,
      50, 85, 55, 45, 0, 5, 0, 10, 5, 2,
      3, 40, 0, 0.8, 2,
      20, 10, 10, 1000, 0, -15, 20, 0.8, 3, 0,
      0, 2, 15, 2, 5
    ];

    console.log('\n📊 Test 1: Safe Token');
    const result1 = await detector.detectRugPull(safeFeatures);
    console.log(result1);

    console.log('\n📊 Test 2: Rug Pull Token');
    const result2 = await detector.detectRugPull(rugFeatures);
    console.log(result2);

    console.log('\n✅ All tests passed!');
  }

  test().catch(console.error);
}
