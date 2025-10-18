/**
 * Auto Trading Service - Polling Based
 * Polls for new classifications instead of using event listeners
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';

dotenv.config();

// Configuration
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const TRADER_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const NEWS_ORACLE_ADDRESS = process.env.NEWS_ORACLE_CONTRACT_ADDRESS || '0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a';
const TRADING_AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS || '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';
const POLL_INTERVAL = (process.env.POLL_INTERVAL_SECONDS || 30) * 1000;

// Contract ABIs
const ORACLE_ABI = [
  'function getClassificationCount() external view returns (uint256)',
  'function getAllClassificationIds() external view returns (bytes32[] memory)'
];

const AGENT_ABI = [
  'function reactToNews(bytes32 classificationId) external',
  'function processedClassifications(bytes32) external view returns (bool)',
  'function getTradeStats() external view returns (uint256, uint256, uint256, uint256)',
  'function isPaused() external view returns (bool)'
];

// Logger
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.colorize(),
    format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'autoTrade.log' })
  ]
});

/**
 * Polling-Based Auto Trader
 */
class PollingAutoTrader {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.oracleContract = null;
    this.tradingAgent = null;
    this.lastProcessedCount = 0;
    this.isRunning = false;
    this.pollTimer = null;
  }

  async initialize() {
    logger.info('🤖 Initializing Polling Auto Trading Service...');
    logger.info('====================================');

    // Setup provider (simple approach like news-service)
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(TRADER_PRIVATE_KEY, this.provider);

    // Log wallet info (skip balance check to avoid slow RPC call)
    logger.info(`💰 Trader wallet: ${this.wallet.address}`);

    // Initialize contracts
    this.oracleContract = new ethers.Contract(NEWS_ORACLE_ADDRESS, ORACLE_ABI, this.wallet);
    this.tradingAgent = new ethers.Contract(TRADING_AGENT_ADDRESS, AGENT_ABI, this.wallet);

    logger.info(`\n📊 Trading Agent Address: ${TRADING_AGENT_ADDRESS}`);
    logger.info(`✅ Auto Trading Service initialized`);
    logger.info(`   Poll interval: ${POLL_INTERVAL / 1000}s`);
  }

  async checkForNewClassifications() {
    try {
      // Get current classification count
      const count = await this.oracleContract.getClassificationCount();
      const currentCount = Number(count);

      if (currentCount > this.lastProcessedCount) {
        logger.info(`\n🔔 New classifications detected: ${this.lastProcessedCount} → ${currentCount}`);

        // Process new classifications
        for (let i = this.lastProcessedCount + 1; i <= currentCount; i++) {
          await this.processClassification(i);
        }

        this.lastProcessedCount = currentCount;
      }
    } catch (error) {
      logger.error(`Error checking for new classifications: ${error.message}`);
    }
  }

  async processClassification(classificationIndex) {
    try {
      logger.info(`\n📋 Processing classification #${classificationIndex}...`);

      // Convert to bytes32 format
      const classificationId = ethers.zeroPadValue(ethers.toBeHex(classificationIndex), 32);

      // Check if already processed by trading agent
      const isProcessed = await this.tradingAgent.processedClassifications(classificationId);

      if (isProcessed) {
        logger.info(`   ✓ Already traded (skipping)`);
        return;
      }

      logger.info(`   🎯 Not yet traded - triggering trade...`);

      // Execute trade
      const tx = await this.tradingAgent.reactToNews(classificationId, {
        gasLimit: 500000
      });

      logger.info(`   📤 TX submitted: ${tx.hash}`);
      logger.info(`   ⏳ Waiting for confirmation...`);

      const receipt = await tx.wait();

      logger.info(`   ✅ Trade executed successfully!`);
      logger.info(`   📦 Block: ${receipt.blockNumber}`);
      logger.info(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
      logger.info(`   🔗 TX: https://sepolia.basescan.org/tx/${tx.hash}`);

      // Get updated stats
      const stats = await this.tradingAgent.getTradeStats();
      logger.info(`\n📊 Updated Stats:`);
      logger.info(`   Total Trades: ${stats[0].toString()}`);
      logger.info(`   Profitable: ${stats[1].toString()}`);
      logger.info(`   Unprofitable: ${stats[2].toString()}`);
      logger.info(`   Win Rate: ${stats[3].toString()}%`);

    } catch (error) {
      logger.error(`Error processing classification #${classificationIndex}: ${error.message}`);
      if (error.code === 'CALL_EXCEPTION') {
        logger.warn(`   Contract reverted - classification may not exist`);
      }
    }
  }

  async start() {
    await this.initialize();

    // Get initial count
    const count = await this.oracleContract.getClassificationCount();
    this.lastProcessedCount = Number(count);
    logger.info(`\n📊 Starting from classification count: ${this.lastProcessedCount}`);

    // Start polling loop
    this.isRunning = true;
    logger.info(`\n🔄 Starting polling loop (every ${POLL_INTERVAL / 1000}s)...`);
    logger.info(`✨ Auto Trading Service is running! Press Ctrl+C to stop.\n`);

    this.poll();
  }

  async poll() {
    if (!this.isRunning) return;

    await this.checkForNewClassifications();

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), POLL_INTERVAL);
  }

  async stop() {
    logger.info('\n🛑 Stopping Auto Trading Service...');
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    logger.info('   Service stopped\n');
  }
}

// Main execution
const trader = new PollingAutoTrader();

// Graceful shutdown
process.on('SIGINT', async () => {
  await trader.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await trader.stop();
  process.exit(0);
});

// Start the service
trader.start().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
