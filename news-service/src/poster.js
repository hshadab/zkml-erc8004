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

      // Connect to Base Mainnet with extended timeout + polling (helps in WSL2 environments)
      const rpcUrl = config.baseMainnetRpcUrl || config.rpcUrl;
      const fetchReq = new ethers.FetchRequest(rpcUrl);
      fetchReq.timeout = 180000; // 180s
      this.provider = new ethers.JsonRpcProvider(fetchReq);
      this.provider.polling = true;
      this.provider.pollingInterval = 4000;

      // Create wallet (sanitize private key)
      const pkRaw = (config.oraclePrivateKey || '').replace(/["'\s]/g, '');
      const body = pkRaw.startsWith('0x') ? pkRaw.slice(2) : pkRaw;
      const hexOnly = body.replace(/[^0-9a-fA-F]/g, '');
      const cleanKey = '0x' + hexOnly;
      this.wallet = new ethers.Wallet(cleanKey, this.provider);

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
        'function postPaidClassification(string calldata headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, address payer, uint256 paymentAmount, bytes32 paymentTxHash) external returns (bytes32)',
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
   * @param {Object} paymentInfo - Optional payment metadata for X402 integration
   * @param {string} paymentInfo.payer - Address that paid
   * @param {string} paymentInfo.amount - USDC amount paid (in USDC, e.g., "0.25")
   * @param {string} paymentInfo.txHash - Payment transaction hash
   * @returns {Object} Transaction result
   */
  async postClassification(headline, sentiment, confidence, proofHash, paymentInfo = null) {
    try {
      const isPaid = paymentInfo && paymentInfo.payer && paymentInfo.amount && paymentInfo.txHash;

      logger.info(`Posting ${isPaid ? 'PAID' : 'FREE'} classification for: "${headline}"`);
      logger.info(`Sentiment: ${['BAD', 'NEUTRAL', 'GOOD'][sentiment]}, Confidence: ${confidence}%`);
      if (isPaid) {
        logger.info(`Payment: $${paymentInfo.amount} USDC from ${paymentInfo.payer.substring(0, 10)}...`);
      }

      // Try to estimate gas; if it fails or times out, fall back to static limit
      let gasLimit = isPaid ? 600000n : 500000n; // Paid classifications need more gas
      try {
        let estimated;
        if (isPaid) {
          const paymentAmountWei = ethers.parseUnits(paymentInfo.amount, 6); // USDC has 6 decimals
          estimated = await this.contract.postPaidClassification.estimateGas(
            headline,
            sentiment,
            confidence,
            proofHash,
            paymentInfo.payer,
            paymentAmountWei,
            paymentInfo.txHash
          );
        } else {
          estimated = await this.contract.postClassification.estimateGas(
            headline,
            sentiment,
            confidence,
            proofHash
          );
        }
        gasLimit = estimated * 120n / 100n; // +20%
        logger.info(`Estimated gas: ${estimated.toString()} → using ${gasLimit.toString()}`);
      } catch (e) {
        logger.warn(`Gas estimation failed, using default limit ${gasLimit}: ${e.message}`);
      }

      // Robust retry with fee bump
      const maxAttempts = 3;
      const nonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');
      let tx, receipt;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const fee = await this.provider.getFeeData();
          const bump = 1 + (attempt - 1) * 0.25;
          const maxPriorityFeePerGas = fee.maxPriorityFeePerGas
            ? BigInt(Math.ceil(Number(fee.maxPriorityFeePerGas) * bump))
            : 2_000_000_000n;
          const maxFeePerGas = fee.maxFeePerGas
            ? BigInt(Math.ceil(Number(fee.maxFeePerGas) * bump))
            : 30_000_000_000n;

          if (isPaid) {
            const paymentAmountWei = ethers.parseUnits(paymentInfo.amount, 6); // USDC has 6 decimals
            tx = await this.contract.postPaidClassification(
              headline,
              sentiment,
              confidence,
              proofHash,
              paymentInfo.payer,
              paymentAmountWei,
              paymentInfo.txHash,
              {
                gasLimit,
                type: 2,
                maxPriorityFeePerGas,
                maxFeePerGas,
                nonce
              }
            );
          } else {
            tx = await this.contract.postClassification(
              headline,
              sentiment,
              confidence,
              proofHash,
              {
                gasLimit,
                type: 2,
                maxPriorityFeePerGas,
                maxFeePerGas,
                nonce
              }
            );
          }

          logger.info(`Transaction sent: ${tx.hash}`);
          logger.info('Waiting for confirmation...');

          receipt = await this.provider.waitForTransaction(tx.hash, 1, 180000);
          if (!receipt) throw new Error('Transaction wait timeout');
          break;
        } catch (err) {
          const msg = (err && err.message) ? err.message.toLowerCase() : '';
          logger.warn(`Attempt ${attempt} failed: ${err.message}`);
          if (attempt < maxAttempts && (msg.includes('timeout') || msg.includes('network'))) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
          throw err;
        }
      }

      logger.info(`✅ Classification posted! Block: ${receipt.blockNumber}`);
      logger.info(`   Gas used: ${receipt.gasUsed.toString()}`);
      try {
        const net = await this.provider.getNetwork();
        const explorer = net.chainId === 137n
          ? 'https://polygonscan.com/tx/'
          : net.chainId === 84532n
            ? 'https://sepolia.basescan.org/tx/'
            : 'https://etherscan.io/tx/';
        logger.info(`   Explorer: ${explorer}${receipt.hash}`);
      } catch {
        // Fallback to printing the hash only
        logger.info(`   TX: ${receipt.hash}`);
      }

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
