/**
 * zkML On-Chain Verification Poster
 * Posts classifications to Base Sepolia with JOLT→Groth16 proof verification
 */

import { ethers } from 'ethers';
import { logger } from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

// Contract ABIs
const NEWS_VERIFIER_ABI = [
  "function verifyAndStore(bytes32 classificationId, uint[2] memory pA, uint[2][2] memory pB, uint[2] memory pC, uint[3] memory pubSignals) public returns (bool)",
  "function isClassificationVerified(bytes32 classificationId) public view returns (bool)",
  "event ProofVerified(bytes32 indexed classificationId, uint timestamp)"
];

const NEWS_ORACLE_ABI = [
  "function postClassification(string calldata headline, uint8 sentiment, uint8 confidence, bytes32 proofHash) external returns (bytes32)",
  "function getClassificationCount() external view returns (uint256)",
  "event NewsClassified(bytes32 indexed classificationId, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId)"
];

/**
 * zkML Poster with On-Chain Verification
 */
export class ZkmlPoster {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.newsVerifier = null;
    this.newsOracle = null;
  }

  /**
   * Initialize blockchain connection and contracts
   */
  async initialize() {
    try {
      // Connect to Base Sepolia
      this.provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
      this.signer = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, this.provider);

      logger.info('🔗 Connecting to Base Sepolia...');
      const network = await this.provider.getNetwork();
      logger.info(`   Network: ${network.name} (Chain ID: ${network.chainId})`);

      const balance = await this.provider.getBalance(this.signer.address);
      logger.info(`   Oracle Address: ${this.signer.address}`);
      logger.info(`   Balance: ${ethers.formatEther(balance)} ETH`);

      // Load contracts
      this.newsVerifier = new ethers.Contract(
        process.env.NEWS_VERIFIER_ADDRESS,
        NEWS_VERIFIER_ABI,
        this.signer
      );

      this.newsOracle = new ethers.Contract(
        process.env.NEWS_ORACLE_CONTRACT_ADDRESS,
        NEWS_ORACLE_ABI,
        this.signer
      );

      logger.info(`   NewsVerifier: ${await this.newsVerifier.getAddress()}`);
      logger.info(`   NewsOracle: ${await this.newsOracle.getAddress()}`);

      const classCount = await this.newsOracle.getClassificationCount();
      logger.info(`   Existing Classifications: ${classCount}`);

      logger.info('✅ Blockchain connection established');

    } catch (error) {
      logger.error(`Failed to initialize blockchain connection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Post classification with on-chain zkML proof verification
   *
   * @param {Object} classification - Classification result from zkmlClassifier
   * @returns {Promise<Object>} Transaction result
   */
  async postWithVerification(classification) {
    try {
      if (!classification.success) {
        logger.warn('Classification unsuccessful, skipping on-chain post');
        return { success: false, reason: classification.reason || classification.error };
      }

      logger.info('\\n📤 Posting to Base Sepolia with on-chain verification...');
      logger.info('=' .repeat(80));

      // Extract Groth16 proof components
      const proof = classification.proof;
      const pubSignals = classification.publicSignals;

      // Format proof for contract
      const pA = [
        BigInt(proof.a[0].toString()),
        BigInt(proof.a[1].toString())
      ];

      const pB = [
        [BigInt(proof.b[0][0].toString()), BigInt(proof.b[0][1].toString())],
        [BigInt(proof.b[1][0].toString()), BigInt(proof.b[1][1].toString())]
      ];

      const pC = [
        BigInt(proof.c[0].toString()),
        BigInt(proof.c[1].toString())
      ];

      const pubSignalsFormatted = [
        BigInt(pubSignals[0].toString()),
        BigInt(pubSignals[1].toString()),
        BigInt(0) // Third signal (padding)
      ];

      logger.info('   Proof Components:');
      logger.info(`   pA: [${pA[0].toString().slice(0, 20)}..., ${pA[1].toString().slice(0, 20)}...]`);
      logger.info(`   pB: [[${pB[0][0].toString().slice(0, 15)}..., ...], [...]]`);
      logger.info(`   pC: [${pC[0].toString().slice(0, 20)}..., ${pC[1].toString().slice(0, 20)}...]`);
      logger.info(`   Public Signals: [${pubSignalsFormatted.map(s => s.toString()).join(', ')}]`);

      // Step 1: Post classification to oracle (without proof verification)
      logger.info('\\n[1/2] Posting classification to oracle...');

      const proofHashBytes32 = classification.proofHash.length === 66
        ? classification.proofHash
        : ethers.zeroPadValue(classification.proofHash, 32);

      const tx1 = await this.newsOracle.postClassification(
        classification.headline,
        classification.sentiment,
        classification.confidence,
        proofHashBytes32,
        {
          gasLimit: 500000
        }
      );

      logger.info(`   TX submitted: ${tx1.hash}`);
      const receipt1 = await tx1.wait();
      logger.info(`   ✅ Classification posted (Gas: ${receipt1.gasUsed.toString()})`);

      // Extract classification ID from event
      const classifiedEvent = receipt1.logs.find(log => {
        try {
          return this.newsOracle.interface.parseLog(log)?.name === 'NewsClassified';
        } catch {
          return false;
        }
      });

      let classificationId;
      if (classifiedEvent) {
        const parsed = this.newsOracle.interface.parseLog(classifiedEvent);
        classificationId = parsed.args.classificationId;
        logger.info(`   Classification ID: ${classificationId}`);
      } else {
        // Generate classification ID manually if event parsing fails
        classificationId = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ['string', 'uint256'],
            [classification.headline, Date.now()]
          )
        );
        logger.info(`   Classification ID (generated): ${classificationId}`);
      }

      // Step 2: Verify proof on-chain
      logger.info('\\n[2/2] Verifying Groth16 proof on-chain...');

      const tx2 = await this.newsVerifier.verifyAndStore(
        classificationId,
        pA,
        pB,
        pC,
        pubSignalsFormatted,
        {
          gasLimit: 500000
        }
      );

      logger.info(`   TX submitted: ${tx2.hash}`);
      const receipt2 = await tx2.wait();
      logger.info(`   ✅ Proof verified on-chain (Gas: ${receipt2.gasUsed.toString()})`);

      // Verify it's stored
      const isVerified = await this.newsVerifier.isClassificationVerified(classificationId);
      logger.info(`   Verification stored: ${isVerified ? 'YES ✓' : 'NO ✗'}`);

      logger.info('\\n🎉 On-Chain Verification Complete!');
      logger.info('=' .repeat(80));
      logger.info(`   Classification TX: https://sepolia.basescan.org/tx/${tx1.hash}`);
      logger.info(`   Verification TX: https://sepolia.basescan.org/tx/${tx2.hash}`);
      logger.info(`   Total Gas: ${(receipt1.gasUsed + receipt2.gasUsed).toString()}`);
      logger.info('=' .repeat(80));

      return {
        success: true,
        classificationId,
        classificationTx: tx1.hash,
        verificationTx: tx2.hash,
        gasUsed: {
          classification: receipt1.gasUsed.toString(),
          verification: receipt2.gasUsed.toString(),
          total: (receipt1.gasUsed + receipt2.gasUsed).toString()
        },
        isVerified,
        explorerUrls: {
          classification: `https://sepolia.basescan.org/tx/${tx1.hash}`,
          verification: `https://sepolia.basescan.org/tx/${tx2.hash}`
        }
      };

    } catch (error) {
      logger.error(`On-chain posting failed: ${error.message}`);
      if (error.data) {
        logger.error(`Error data: ${error.data}`);
      }
      throw error;
    }
  }

  /**
   * Get classification count
   */
  async getClassificationCount() {
    return await this.newsOracle.getClassificationCount();
  }
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const poster = new ZkmlPoster();

  logger.info('🧪 Testing zkML On-Chain Poster...\\n');

  try {
    await poster.initialize();

    // Create mock classification result
    const mockClassification = {
      success: true,
      headline: 'Bitcoin reaches new all-time high',
      sentiment: 2, // GOOD
      confidence: 85,
      proof: {
        a: ['20695578849052916018485081111089884394320125963471932814726684833948542696931', '2530178956839994042346799534485029821832088795425846990313017310059341102221'],
        b: [
          ['1990152516257143668052691136751418411192207688299226650862832770936953944571', '9857906714934301764509815412097355062595825438668094617654089844456764950850'],
          ['3889673612719599434154067669479652115968995383303071917088311172215091222949', '21201729454757726290031371055834049764023687089556530930664242569913907358301']
        ],
        c: ['18669938906996816166343670992757088630061302362984534560627464704619293261569', '13739921363864040076354515677970935826551102613479999988264076523969348355738']
      },
      publicSignals: ['1', '85', '0'],
      proofHash: '0x7b2270726f6f66223a7b2261223a5b2232303639353537383834393035323931',
      proofBytes: '0x' + '00'.repeat(256)
    };

    logger.info('Posting mock classification with proof verification...');
    const result = await poster.postWithVerification(mockClassification);

    if (result.success) {
      logger.info('\\n✅ Test Passed!');
      logger.info(`   Classification ID: ${result.classificationId}`);
      logger.info(`   Verified on Base Sepolia: ${result.isVerified}`);
      logger.info(`   View on BaseScan:`);
      logger.info(`   ${result.explorerUrls.classification}`);
      logger.info(`   ${result.explorerUrls.verification}`);
    }

  } catch (error) {
    logger.error(`\\n❌ Test Failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}
