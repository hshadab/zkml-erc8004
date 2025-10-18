/**
 * Automated Trading Service
 * Listens for ClassificationPosted events and triggers trading agent
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { logger } from '../news-service/src/logger.js';

// Configuration
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const TRADER_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY; // Reuse oracle key for demo
const NEWS_ORACLE_ADDRESS = process.env.NEWS_ORACLE_CONTRACT_ADDRESS || '0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a';
const TRADING_AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS || '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';

// Contract ABIs
const ORACLE_ABI = [
  "event ClassificationPosted(bytes32 indexed classificationId, uint256 indexed oracleTokenId, uint8 sentiment, uint8 confidence)",
  "function getClassification(bytes32 classificationId) external view returns (tuple(bytes32 id, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId))"
];

const TRADING_AGENT_ABI = [
  "function reactToNews(bytes32 classificationId) external",
  "function isPaused() external view returns (bool)",
  "function totalTradesExecuted() external view returns (uint256)",
  "function processedClassifications(bytes32) external view returns (bool)"
];

class AutoTrader {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.oracleContract = null;
    this.tradingAgent = null;
    this.processedClassifications = new Set();
  }

  async initialize() {
    logger.info('🤖 Initializing Auto Trading Service...');
    logger.info('====================================');

    // Setup provider and wallet
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(TRADER_PRIVATE_KEY, this.provider);

    const balance = await this.provider.getBalance(this.wallet.address);
    logger.info(`💰 Trader wallet: ${this.wallet.address}`);
    logger.info(`   Balance: ${ethers.formatEther(balance)} ETH`);

    // Initialize contracts
    this.oracleContract = new ethers.Contract(NEWS_ORACLE_ADDRESS, ORACLE_ABI, this.wallet);
    this.tradingAgent = new ethers.Contract(TRADING_AGENT_ADDRESS, TRADING_AGENT_ABI, this.wallet);

    // Check agent status
    const isPaused = await this.tradingAgent.isPaused();
    const totalTrades = await this.tradingAgent.totalTradesExecuted();

    logger.info(`\n📊 Trading Agent Status:`);
    logger.info(`   Address: ${TRADING_AGENT_ADDRESS}`);
    logger.info(`   Paused: ${isPaused}`);
    logger.info(`   Total Trades: ${totalTrades}`);

    if (isPaused) {
      logger.warn('⚠️  Trading agent is PAUSED - trades will not execute!');
    }

    logger.info('\n✅ Auto Trading Service initialized');
    logger.info('   Listening for new classifications...\n');
  }

  async handleClassification(classificationId, oracleTokenId, sentiment, confidence, event) {
    try {
      // Skip if already processed
      if (this.processedClassifications.has(classificationId)) {
        return;
      }
      this.processedClassifications.add(classificationId);

      logger.info('\n📰 New Classification Detected!');
      logger.info('================================');
      logger.info(`   Classification ID: ${classificationId}`);
      logger.info(`   Oracle Token: ${oracleTokenId}`);
      logger.info(`   Sentiment: ${this.sentimentToString(sentiment)}`);
      logger.info(`   Confidence: ${confidence}%`);
      logger.info(`   Block: ${event.blockNumber}`);
      logger.info(`   TX: ${event.transactionHash}`);

      // Get full classification details
      const classification = await this.oracleContract.getClassification(classificationId);
      logger.info(`   Headline: "${classification.headline}"`);

      // Check if already processed by agent
      const alreadyProcessed = await this.tradingAgent.processedClassifications(classificationId);
      if (alreadyProcessed) {
        logger.info('   ⏭️  Already processed by trading agent, skipping');
        return;
      }

      // Execute trade
      logger.info('\n💼 Executing Trade...');
      const tx = await this.tradingAgent.reactToNews(classificationId, {
        gasLimit: 500000
      });

      logger.info(`   TX submitted: ${tx.hash}`);
      logger.info('   ⏳ Waiting for confirmation...');

      const receipt = await tx.wait();

      logger.info(`   ✅ Trade executed! (Gas: ${receipt.gasUsed.toString()})`);
      logger.info(`   Explorer: https://sepolia.basescan.org/tx/${tx.hash}`);

      // Get updated trade count
      const newTradeCount = await this.tradingAgent.totalTradesExecuted();
      logger.info(`   📊 Total trades executed: ${newTradeCount}`);

    } catch (error) {
      logger.error(`\n❌ Failed to execute trade for ${classificationId}:`);
      logger.error(`   Error: ${error.message}`);
      if (error.reason) {
        logger.error(`   Reason: ${error.reason}`);
      }
    }
  }

  sentimentToString(sentiment) {
    const map = { 0: 'GOOD', 1: 'BAD', 2: 'NEUTRAL' };
    return map[sentiment] || 'UNKNOWN';
  }

  async start() {
    await this.initialize();

    // Listen for ClassificationPosted events
    logger.info('🎧 Event listener started...\n');

    this.oracleContract.on(
      'ClassificationPosted',
      async (classificationId, oracleTokenId, sentiment, confidence, event) => {
        await this.handleClassification(
          classificationId,
          oracleTokenId,
          sentiment,
          confidence,
          event
        );
      }
    );

    // Also process recent past events (in case service was offline)
    await this.processRecentClassifications();

    // Keep process alive
    logger.info('✨ Auto Trading Service is running! Press Ctrl+C to stop.\n');
  }

  async processRecentClassifications() {
    try {
      logger.info('🔍 Checking for recent unprocessed classifications...');

      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 49000); // Last 49k blocks (RPC limit is 50k)

      const filter = this.oracleContract.filters.ClassificationPosted();
      const events = await this.oracleContract.queryFilter(filter, fromBlock, latestBlock);

      logger.info(`   Found ${events.length} recent classification(s)`);

      for (const event of events) {
        const classificationId = event.args[0];
        const alreadyProcessed = await this.tradingAgent.processedClassifications(classificationId);

        if (!alreadyProcessed) {
          logger.info(`   📋 Processing untraded classification: ${classificationId}`);
          await this.handleClassification(
            event.args[0], // classificationId
            event.args[1], // oracleTokenId
            event.args[2], // sentiment
            event.args[3], // confidence
            event
          );

          // Wait a bit between trades to avoid nonce issues
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      logger.info('   ✅ Recent classifications processed\n');
    } catch (error) {
      logger.error(`Failed to process recent classifications: ${error.message}`);
    }
  }

  async stop() {
    logger.info('\n🛑 Stopping Auto Trading Service...');
    this.oracleContract.removeAllListeners();
    logger.info('   Event listeners removed');
    logger.info('   Service stopped\n');
  }
}

// Handle graceful shutdown
const autoTrader = new AutoTrader();

process.on('SIGTERM', async () => {
  await autoTrader.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await autoTrader.stop();
  process.exit(0);
});

// Start the service
autoTrader.start().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
