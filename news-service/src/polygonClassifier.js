import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { ZkmlClassifier } from './zkmlClassifier.js';
import { logger } from './logger.js';

dotenv.config();

/**
 * Polygon-specific zkML Classifier
 * Submits classifications with Groth16 proofs to Polygon Oracle
 */
export class PolygonClassifier {
  constructor() {
    this.rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.oracleAddress = process.env.POLYGON_ORACLE;
    this.privateKey = process.env.ORACLE_PRIVATE_KEY;

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);

    // Oracle ABI - submitClassificationWithProof function
    this.oracleAbi = [
      'function submitClassificationWithProof(string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, bytes proof) external returns (bytes32)',
      'function getClassification(bytes32 id) external view returns (tuple(bytes32 id, string headline, uint8 sentiment, uint8 confidence, uint256 timestamp, address submitter, bytes32 proofHash))',
      'event ClassificationSubmitted(bytes32 indexed id, string headline, uint8 sentiment, uint8 confidence, uint256 timestamp, address submitter)'
    ];

    this.oracle = new ethers.Contract(this.oracleAddress, this.oracleAbi, this.wallet);
    this.zkmlClassifier = new ZkmlClassifier();
  }

  async initialize() {
    await this.zkmlClassifier.initialize();
    const network = await this.provider.getNetwork();
    logger.info(`Polygon Classifier initialized on Chain ID: ${network.chainId}`);
  }

  /**
   * Generate zkML classification with Groth16 proof
   */
  async generateClassification(headline) {
    logger.info(`\n🔐 Generating zkML classification for: "${headline}"`);

    // Generate JOLT proof + Groth16 wrapper
    const result = await this.zkmlClassifier.classify({ headline });

    if (!result.success) {
      throw new Error(result.reason || result.error || 'Classification failed');
    }

    logger.info(`✅ zkML Classification generated:`);
    logger.info(`   Sentiment: ${result.sentiment === 1 ? 'BULLISH' : 'BEARISH'}`);
    logger.info(`   Confidence: ${result.confidence}%`);
    logger.info(`   JOLT Proof: ${result.timingMs.jolt}ms`);
    logger.info(`   Groth16 Wrapper: ${result.timingMs.groth16}ms`);

    return {
      sentiment: result.sentiment,
      confidence: result.confidence,
      proof: {
        fullProof: result.proofBytes,
        proofHash: result.proofHash
      },
      joltProofTime: result.timingMs.jolt,
      groth16Time: result.timingMs.groth16
    };
  }

  /**
   * Submit classification to Polygon Oracle with proof
   */
  async submitToPolygon(headline, sentiment, confidence, proof) {
    logger.info(`\n📤 Submitting to Polygon Oracle...`);

    // Calculate proof hash
    const proofHash = ethers.keccak256(proof.fullProof);

    logger.info(`   Headline: "${headline}"`);
    logger.info(`   Sentiment: ${sentiment} (${sentiment === 1 ? 'BULLISH' : 'BEARISH'})`);
    logger.info(`   Confidence: ${confidence}%`);
    logger.info(`   Proof Hash: ${proofHash.slice(0, 10)}...`);

    try {
      // Submit classification with proof
      const tx = await this.oracle.submitClassificationWithProof(
        headline,
        sentiment,
        confidence,
        proofHash,
        proof.fullProof,
        { gasLimit: 500000 }
      );

      logger.info(`   📤 TX submitted: ${tx.hash}`);
      logger.info(`   🔗 https://polygonscan.com/tx/${tx.hash}`);

      const receipt = await tx.wait();
      logger.info(`   ✅ Classification posted! Gas used: ${receipt.gasUsed}`);

      // Extract classification ID from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.oracle.interface.parseLog(log);
          return parsed && parsed.name === 'ClassificationSubmitted';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.oracle.interface.parseLog(event);
        const classificationId = parsed.args.id;

        logger.info(`\n✅ Classification ID: ${classificationId}`);

        return {
          id: classificationId,
          txHash: tx.hash,
          gasUsed: receipt.gasUsed.toString()
        };
      } else {
        throw new Error('ClassificationSubmitted event not found');
      }

    } catch (error) {
      logger.error(`❌ Submission failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Full classification flow: generate proof + submit to Polygon
   */
  async classifyAndSubmit(headline) {
    const startTime = Date.now();

    logger.info(`\n════════════════════════════════════════════════════════════`);
    logger.info(`  🚀 POLYGON zkML CLASSIFICATION`);
    logger.info(`════════════════════════════════════════════════════════════\n`);

    // Step 1: Generate zkML proof
    const classification = await this.generateClassification(headline);

    // Step 2: Submit to Polygon Oracle
    const result = await this.submitToPolygon(
      headline,
      classification.sentiment,
      classification.confidence,
      classification.proof
    );

    const totalTime = Date.now() - startTime;

    logger.info(`\n════════════════════════════════════════════════════════════`);
    logger.info(`  ✅ CLASSIFICATION COMPLETE`);
    logger.info(`════════════════════════════════════════════════════════════`);
    logger.info(`   Classification ID: ${result.id}`);
    logger.info(`   Total Time: ${totalTime}ms`);
    logger.info(`   Gas Cost: ${result.gasUsed} gas`);
    logger.info(`   TX: https://polygonscan.com/tx/${result.txHash}`);
    logger.info(`════════════════════════════════════════════════════════════\n`);

    return {
      classificationId: result.id,
      txHash: result.txHash,
      gasUsed: result.gasUsed,
      sentiment: classification.sentiment,
      confidence: classification.confidence,
      totalTime
    };
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const headline = process.argv[2] || "Bitcoin ETF Approved by SEC";

  const classifier = new PolygonClassifier();
  await classifier.initialize();

  const result = await classifier.classifyAndSubmit(headline);

  console.log(`\n✅ Classification submitted!`);
  console.log(`   ID: ${result.classificationId}`);
  console.log(`   Use this ID to trigger a trade with polygonTrader.js`);
}
