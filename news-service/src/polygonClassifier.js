import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZkmlClassifier } from './zkmlClassifier.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Polygon-specific zkML Classifier
 * Submits classifications with Groth16 proofs to Polygon Oracle
 */
export class PolygonClassifier {
  constructor() {
    this.rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.oracleAddress = process.env.POLYGON_ORACLE;
    // Sanitize private key (strip quotes/whitespace and enforce hex-only)
    const pkRaw = (process.env.ORACLE_PRIVATE_KEY || '').replace(/["'\s]/g, '');
    const body = pkRaw.startsWith('0x') ? pkRaw.slice(2) : pkRaw;
    const hexOnly = body.replace(/[^0-9a-fA-F]/g, '');
    this.privateKey = '0x' + hexOnly;

    // Create custom FetchRequest with extended timeout for WSL2 compatibility
    const fetchReq = new ethers.FetchRequest(this.rpcUrl);
    fetchReq.timeout = 180000; // 180 second timeout

    // Explicitly specify Polygon PoS Mainnet network (Chain ID: 137)
    const network = {
      name: 'matic',
      chainId: 137
    };

    this.provider = new ethers.JsonRpcProvider(fetchReq, network, {
      staticNetwork: true
    });
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);
    // Improve stability on WSL2
    this.provider.polling = true;
    this.provider.pollingInterval = 4000;

    // Oracle ABI - postClassification function
    this.oracleAbi = [
      'function postClassification(string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash) external returns (bytes32)',
      'function getClassificationCount() external view returns (uint256)',
      'event NewsClassified(bytes32 indexed classificationId, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId)'
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

    const sentimentLabel = result.sentiment === 2 ? 'BULLISH' : (result.sentiment === 0 ? 'BEARISH' : 'NEUTRAL');
    logger.info(`✅ zkML Classification generated:`);
    logger.info(`   Sentiment: ${sentimentLabel}`);
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
    const submitLabel = sentiment === 2 ? 'BULLISH' : (sentiment === 0 ? 'BEARISH' : 'NEUTRAL');
    logger.info(`   Sentiment: ${sentiment} (${submitLabel})`);
    logger.info(`   Confidence: ${confidence}%`);
    logger.info(`   Proof Hash: ${proofHash.slice(0, 10)}...`);

    // Robust retry with fee bump and explicit gas
    const maxAttempts = 3;
    const baseGasLimit = 500000n;
    let lastError;
    const nonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const fee = await this.provider.getFeeData();
        // Bump fees per attempt
        const bump = 1 + (attempt - 1) * 0.25; // 0%, 25%, 50%
        const maxPriorityFeePerGas = fee.maxPriorityFeePerGas
          ? BigInt(Math.ceil(Number(fee.maxPriorityFeePerGas) * bump))
          : 2_000_000_000n; // 2 gwei fallback
        const maxFeePerGas = fee.maxFeePerGas
          ? BigInt(Math.ceil(Number(fee.maxFeePerGas) * bump))
          : 30_000_000_000n; // 30 gwei fallback

        logger.info(`   Attempt ${attempt}/${maxAttempts} with fee bump x${bump.toFixed(2)}`);

        const overrides = {
          gasLimit: baseGasLimit,
          type: 2,
          maxPriorityFeePerGas,
          maxFeePerGas,
          nonce
        };

        const tx = await this.oracle.postClassification(
          headline,
          sentiment,
          confidence,
          proofHash,
          overrides
        );

        logger.info(`   📤 TX submitted: ${tx.hash}`);
        logger.info(`   🔗 https://polygonscan.com/tx/${tx.hash}`);

        // Wait with explicit timeout
        const receipt = await this.provider.waitForTransaction(tx.hash, 1, 180000);
        if (!receipt) throw new Error('Transaction wait timeout');

        logger.info(`   ✅ Classification posted! Gas used: ${receipt.gasUsed}`);

        // Extract classification ID from event
        const event = receipt.logs.find(log => {
          try {
            const parsed = this.oracle.interface.parseLog(log);
            return parsed && parsed.name === 'NewsClassified';
          } catch {
            return false;
          }
        });

        if (event) {
          const parsed = this.oracle.interface.parseLog(event);
          const classificationId = parsed.args.classificationId;

          logger.info(`\n✅ Classification ID: ${classificationId}`);

          return {
            id: classificationId,
            txHash: tx.hash,
            gasUsed: (receipt.gasUsed || 0n).toString()
          };
        } else {
          throw new Error('NewsClassified event not found');
        }

      } catch (error) {
        lastError = error;
        const msg = (error && error.message) ? error.message.toLowerCase() : '';
        logger.warn(`   ❌ Attempt ${attempt} failed: ${error.message}`);
        if (attempt < maxAttempts && (msg.includes('timeout') || msg.includes('timed out') || msg.includes('network'))) {
          const backoffMs = 1000 * attempt;
          logger.info(`   ⏳ Retrying in ${backoffMs}ms...`);
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        break;
      }
    }

    logger.error(`❌ Submission failed after ${maxAttempts} attempts: ${lastError?.message || 'unknown error'}`);
    throw lastError || new Error('Submission failed');
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
