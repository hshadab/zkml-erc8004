import { ethers } from 'ethers';
import { logger } from './logger.js';
import { config } from './config.js';

/**
 * Posts classifications to NewsClassificationOracle contract
 */
export class OraclePoster {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
  }

  /**
   * Initialize connection to blockchain
   */
  async initialize() {
    try {
      logger.info('Initializing oracle poster...');

      // Connect to Base Sepolia
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

      // Create wallet
      this.wallet = new ethers.Wallet(config.oraclePrivateKey, this.provider);

      logger.info(`Oracle wallet address: ${this.wallet.address}`);

      // Check balance
      const balance = await this.provider.getBalance(this.wallet.address);
      logger.info(`Oracle balance: ${ethers.formatEther(balance)} ETH`);

      if (balance === 0n) {
        logger.warn('⚠️  Oracle wallet has no ETH! Please fund it to post classifications.');
      }

      // Connect to oracle contract
      const oracleAbi = [
        'function postClassification(string calldata headline, uint8 sentiment, uint8 confidence, bytes32 proofHash) external returns (bytes32)',
        'function getClassificationCount() external view returns (uint256)',
        'function getLatestClassification() external view returns (tuple(bytes32 id, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId))',
        'event NewsClassified(bytes32 indexed classificationId, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 indexed oracleTokenId)'
      ];

      this.contract = new ethers.Contract(
        config.newsOracleAddress,
        oracleAbi,
        this.wallet
      );

      // Get current count
      const count = await this.contract.getClassificationCount();
      logger.info(`Current classification count: ${count.toString()}`);

      logger.info('Oracle poster initialized successfully');

      return true;

    } catch (error) {
      logger.error('Failed to initialize oracle poster:', error);
      return false;
    }
  }

  /**
   * Post a classification to the oracle
   * @param {string} headline - News headline
   * @param {number} sentiment - 0=BAD, 1=NEUTRAL, 2=GOOD
   * @param {number} confidence - Confidence score (0-100)
   * @param {string} proofHash - JOLT-Atlas proof hash
   * @returns {Object} Transaction result
   */
  async postClassification(headline, sentiment, confidence, proofHash) {
    try {
      logger.info(`Posting classification for: "${headline}"`);
      logger.info(`Sentiment: ${['BAD', 'NEUTRAL', 'GOOD'][sentiment]}, Confidence: ${confidence}%`);

      // Estimate gas
      const gasEstimate = await this.contract.postClassification.estimateGas(
        headline,
        sentiment,
        confidence,
        proofHash
      );

      logger.info(`Estimated gas: ${gasEstimate.toString()}`);

      // Send transaction
      const tx = await this.contract.postClassification(
        headline,
        sentiment,
        confidence,
        proofHash,
        {
          gasLimit: gasEstimate * 120n / 100n  // Add 20% buffer
        }
      );

      logger.info(`Transaction sent: ${tx.hash}`);
      logger.info('Waiting for confirmation...');

      const receipt = await tx.wait();

      logger.info(`✅ Classification posted! Block: ${receipt.blockNumber}`);
      logger.info(`   Gas used: ${receipt.gasUsed.toString()}`);
      logger.info(`   BaseScan: https://sepolia.basescan.org/tx/${receipt.hash}`);

      // Parse event
      const event = receipt.logs
        .map(log => {
          try {
            return this.contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === 'NewsClassified');

      if (event) {
        logger.info(`   Classification ID: ${event.args.classificationId}`);
      }

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        classificationId: event ? event.args.classificationId : null
      };

    } catch (error) {
      logger.error('Failed to post classification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current status
   */
  async getStatus() {
    try {
      const count = await this.contract.getClassificationCount();

      if (count > 0n) {
        const latest = await this.contract.getLatestClassification();
        return {
          totalClassifications: count.toString(),
          latestHeadline: latest.headline,
          latestSentiment: ['BAD', 'NEUTRAL', 'GOOD'][latest.sentiment],
          latestTimestamp: new Date(Number(latest.timestamp) * 1000).toISOString()
        };
      }

      return {
        totalClassifications: '0',
        latestHeadline: 'None yet'
      };

    } catch (error) {
      logger.error('Failed to get status:', error);
      return null;
    }
  }
}

// Test if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const poster = new OraclePoster();

  if (await poster.initialize()) {
    const status = await poster.getStatus();
    console.log('\nOracle Status:', status);

    // Test posting (comment out in production)
    // const testProof = ethers.id('test_proof_' + Date.now());
    // await poster.postClassification(
    //   'Test headline: Bitcoin price stable',
    //   1,  // NEUTRAL
    //   75,
    //   testProof
    // );
  }
}
