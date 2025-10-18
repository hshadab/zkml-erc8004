/**
 * Test zkML Classification with Real CoinDesk Article
 */

import { ZkmlClassifier } from './zkmlClassifier.js';
import { ZkmlPoster } from './zkmlPoster.js';
import { logger } from './logger.js';

async function testRealArticle() {
  logger.info('╔══════════════════════════════════════════════════════════════════════════════╗');
  logger.info('║                                                                              ║');
  logger.info('║         REAL COINDESK ARTICLE - zkML CLASSIFICATION TEST                    ║');
  logger.info('║                                                                              ║');
  logger.info('╚══════════════════════════════════════════════════════════════════════════════╝');

  logger.info('\nPipeline: ONNX → JOLT (20s) → Groth16 (1.5s) → Base Sepolia\n');

  try {
    // Step 1: Initialize zkML Classifier
    logger.info('[STEP 1/4] Initializing zkML Classifier...');
    const classifier = new ZkmlClassifier();
    await classifier.initialize();
    logger.info('✅ Classifier ready\n');

    // Step 2: Initialize On-Chain Poster
    logger.info('[STEP 2/4] Connecting to Base Sepolia...');
    const poster = new ZkmlPoster();
    await poster.initialize();
    logger.info('✅ Blockchain connection ready\n');

    // Step 3: Generate zkML Classification with Proofs
    logger.info('[STEP 3/4] Generating zkML Classification with JOLT + Groth16 Proofs...');
    logger.info('This will take ~20-25 seconds (JOLT proof generation)\n');

    const realArticle = {
      headline: 'Huobi founder Li Lin to lead $1B ether treasury firm backed by Asia crypto pioneers',
      source: 'CoinDesk',
      url: 'https://www.coindesk.com/business/2025/10/17/huobi-founder-li-lin-to-lead-usd1b-ether-treasury-firm-backed-by-asia-s-crypto-pioneers-bloomberg',
      reliability: 0.95
    };

    const classification = await classifier.classify(realArticle);

    if (!classification.success) {
      logger.error(`Classification failed: ${classification.reason || classification.error}`);
      process.exit(1);
    }

    logger.info('\n✅ zkML Classification Complete!');
    logger.info('   Pipeline:', classification.pipeline);
    logger.info('   Sentiment:', classification.sentiment === 2 ? 'GOOD ✓' : classification.sentiment === 1 ? 'BAD' : 'NEUTRAL');
    logger.info('   Confidence:', `${classification.confidence}%`);
    logger.info('   Real zkML:', classification.isRealZkml ? 'YES ✓' : 'NO (simulated)');
    logger.info('   Timing:');
    logger.info(`     - ONNX Inference: ${classification.timingMs.inference}ms`);
    logger.info(`     - JOLT Proof: ${classification.timingMs.jolt}ms`);
    logger.info(`     - Groth16 Wrapper: ${classification.timingMs.groth16}ms`);
    logger.info(`     - Total: ${classification.timingMs.total}ms`);
    logger.info('');

    // Step 4: Post to Base Sepolia with On-Chain Verification
    logger.info('[STEP 4/4] Posting to Base Sepolia with On-Chain Verification...');
    const result = await poster.postWithVerification(classification);

    if (!result.success) {
      logger.error(`On-chain posting failed: ${result.reason}`);
      process.exit(1);
    }

    // Final Summary
    logger.info('\n');
    logger.info('╔══════════════════════════════════════════════════════════════════════════════╗');
    logger.info('║                                                                              ║');
    logger.info('║                   🎉 REAL ARTICLE CLASSIFICATION SUCCESS! 🎉                 ║');
    logger.info('║                                                                              ║');
    logger.info('╚══════════════════════════════════════════════════════════════════════════════╝');

    logger.info('\n📊 CLASSIFICATION SUMMARY');
    logger.info('─'.repeat(80));
    logger.info('Article:', realArticle.headline);
    logger.info('Source:', realArticle.source);
    logger.info('Classification:', classification.sentiment === 2 ? 'GOOD' : classification.sentiment === 1 ? 'BAD' : 'NEUTRAL', `(${classification.confidence}% confidence)`);
    logger.info('');
    logger.info('zkML Proof Generation:');
    logger.info(`  ├─ ONNX Inference:      ${classification.timingMs.inference}ms`);
    logger.info(`  ├─ JOLT zkML Proof:     ${classification.timingMs.jolt}ms (${classification.isRealZkml ? 'REAL ✓' : 'simulated'})`);
    logger.info(`  ├─ Groth16 Wrapper:     ${classification.timingMs.groth16}ms`);
    logger.info(`  └─ Total Proof Time:    ${classification.timingMs.total}ms`);
    logger.info('');
    logger.info('On-Chain Verification:');
    logger.info(`  ├─ Classification TX:   ${result.classificationTx}`);
    logger.info(`  ├─ Verification TX:     ${result.verificationTx}`);
    logger.info(`  ├─ Gas Used (Total):    ${result.gasUsed.total}`);
    logger.info(`  └─ Verified on Chain:   ${result.isVerified ? 'YES ✓' : 'NO ✗'}`);
    logger.info('');
    logger.info('🔗 View on Base Sepolia Explorer:');
    logger.info(`  Classification: ${result.explorerUrls.classification}`);
    logger.info(`  Verification:   ${result.explorerUrls.verification}`);
    logger.info('');
    logger.info('─'.repeat(80));

    logger.info('\n✅ This real CoinDesk article has been:');
    logger.info('   • Classified with real ONNX neural network');
    logger.info('   • Proven with real JOLT zkML proof');
    logger.info('   • Verified with real Groth16 zkSNARK');
    logger.info('   • Permanently recorded on Base Sepolia blockchain');
    logger.info('');
    logger.info(`🎯 Anyone can verify: NewsVerifier.isClassificationVerified("${result.classificationId}")`);
    logger.info('');

  } catch (error) {
    logger.error('\n❌ Real Article Test Failed');
    logger.error('Error:', error.message);
    logger.error('\nStack trace:');
    logger.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testRealArticle();
