/**
 * @file baseTrader.js
 * @description Base Mainnet trading integration using Uniswap V3
 * @author zkML Trading System
 */

import { ethers } from 'ethers';
import { logger } from './logger.js';

/**
 * BaseTrader - Handles automated trading on Base Mainnet
 */
class BaseTrader {
  constructor(config) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);

    // Contract addresses from .env
    this.oracleAddress = config.oracleAddress;
    this.agentAddress = config.agentAddress;
    this.registryAddress = config.registryAddress;

    // Uniswap V3 configuration
    this.uniswapRouter = config.uniswapRouter || '0x2626664c2603336E57B271c5C0b26F421741e481';
    this.wethAddress = config.wethAddress || '0x4200000000000000000000000000000000000006';
    this.usdcAddress = config.usdcAddress || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

    // ABIs
    this.agentABI = [
      'function reactToNews(bytes32 classificationId) external',
      'function evaluateTradeProfitability(bytes32 classificationId) external',
      'function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance)',
      'function getPortfolioValue() external view returns (uint256)',
      'function getTradeDetails(bytes32 classificationId) external view returns (tuple(bytes32 classificationId, uint256 oracleTokenId, uint8 sentiment, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, uint256 portfolioValueBefore, uint256 portfolioValueAfter, bool isProfitable, bool hasReported))',
      'function getRecentTrades(uint256 count) external view returns (tuple(bytes32 classificationId, uint256 oracleTokenId, uint8 sentiment, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, uint256 portfolioValueBefore, uint256 portfolioValueAfter, bool isProfitable, bool hasReported)[])',
      'function getTradeStats() external view returns (uint256 total, uint256 profitable, uint256 unprofitable, uint256 winRate)',
      'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)',
      'event TradeProfitabilityDetermined(bytes32 indexed classificationId, bool profitable, uint256 valueBefore, uint256 valueAfter, int256 profitLossPercent)'
    ];

    this.oracleABI = [
      'function getClassification(bytes32 classificationId) external view returns (tuple(bytes32 id, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId))',
      'event NewsClassified(bytes32 indexed classificationId, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 indexed oracleTokenId)'
    ];

    // Initialize contracts
    this.agent = new ethers.Contract(this.agentAddress, this.agentABI, this.wallet);
    this.oracle = new ethers.Contract(this.oracleAddress, this.oracleABI, this.provider);

    // Trading state
    this.isListening = false;
    this.processedClassifications = new Set();
    this.lastCheckedBlock = null;
    this.pollingInterval = null;

    logger.info('🔷 BaseTrader initialized');
    logger.info(`   Oracle: ${this.oracleAddress}`);
    logger.info(`   Agent: ${this.agentAddress}`);
    logger.info(`   Wallet: ${this.wallet.address}`);
  }

  /**
   * Start listening for NewsClassified events using polling
   */
  async startListening() {
    if (this.isListening) {
      logger.warn('⚠️  BaseTrader already listening');
      return;
    }

    this.isListening = true;
    logger.info('🎧 Starting to poll for Base Mainnet trading signals...');

    // Get current block to start polling from
    const currentBlock = await this.provider.getBlockNumber();
    this.lastCheckedBlock = currentBlock;
    logger.info(`   Starting from block: ${currentBlock}`);

    // Poll for new events every 10 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        await this._pollForEvents();
      } catch (error) {
        logger.error(`❌ Error polling for events: ${error.message}`);
      }
    }, 10000); // Poll every 10 seconds

    logger.info('✅ BaseTrader is now polling for events on Base Mainnet (every 10s)');
  }

  /**
   * Poll for new NewsClassified events
   */
  async _pollForEvents() {
    const latestBlock = await this.provider.getBlockNumber();

    // Only query if there are new blocks
    if (latestBlock <= this.lastCheckedBlock) {
      return;
    }

    // Query for NewsClassified events in the new block range
    const events = await this.oracle.queryFilter(
      'NewsClassified',
      this.lastCheckedBlock + 1,
      latestBlock
    );

    if (events.length > 0) {
      logger.info(`\n🔍 Found ${events.length} new classification(s) in blocks ${this.lastCheckedBlock + 1} to ${latestBlock}`);
    }

    // Process each event
    for (const event of events) {
      try {
        const { classificationId, headline, sentiment, confidence, oracleTokenId } = event.args;

        logger.info(`\n📰 New classification detected: ${headline}`);
        logger.info(`   Classification ID: ${classificationId}`);
        logger.info(`   Sentiment: ${this._getSentimentLabel(sentiment)} (${sentiment})`);
        logger.info(`   Confidence: ${confidence}%`);
        logger.info(`   Oracle Token ID: ${oracleTokenId}`);

        // Check if already processed
        if (this.processedClassifications.has(classificationId)) {
          logger.info('   ⏭️  Already processed, skipping');
          continue;
        }

        this.processedClassifications.add(classificationId);

        // Execute trade via agent
        await this.executeTrade(classificationId);

      } catch (error) {
        logger.error(`❌ Error processing classification: ${error.message}`);
      }
    }

    // Update last checked block
    this.lastCheckedBlock = latestBlock;
  }

  /**
   * Execute trade for a classification
   * @param {string} classificationId - The classification ID to trade on
   * @param {object} options - Options for trade execution
   * @param {boolean} options.autoEvaluate - Whether to automatically evaluate profitability (default: true)
   * @param {boolean} options.waitForEvaluation - Whether to wait for evaluation to complete (default: false)
   */
  async executeTrade(classificationId, options = {}) {
    const { autoEvaluate = true, waitForEvaluation = false } = options;

    try {
      logger.info(`\n💱 Executing trade for classification ${classificationId}...`);

      // Get current portfolio before trade
      const [ethBefore, usdcBefore] = await this.agent.getPortfolio();
      logger.info(`   Portfolio before: ${ethers.formatEther(ethBefore)} ETH, ${ethers.formatUnits(usdcBefore, 6)} USDC`);

      // Execute trade through agent (with increased gas limit for Base)
      const tx = await this.agent.reactToNews(classificationId, {
        gasLimit: 1000000 // Base typically requires higher gas limits
      });

      logger.info(`   📝 Trade TX: ${tx.hash}`);
      logger.info(`   🔗 Explorer: https://basescan.org/tx/${tx.hash}`);

      const receipt = await tx.wait();
      logger.info(`   ✅ Trade executed! Gas used: ${receipt.gasUsed.toString()}`);

      // Get portfolio after trade
      const [ethAfter, usdcAfter] = await this.agent.getPortfolio();
      logger.info(`   Portfolio after: ${ethers.formatEther(ethAfter)} ETH, ${ethers.formatUnits(usdcAfter, 6)} USDC`);

      // Auto-evaluate profitability if requested
      if (autoEvaluate) {
        if (waitForEvaluation) {
          // Blocking mode: wait for evaluation to complete
          await this._evaluateProfitabilityAfterDelay(classificationId);
        } else {
          // Non-blocking mode: schedule evaluation asynchronously
          this._evaluateProfitabilityAfterDelay(classificationId).catch(err => {
            logger.error(`   ❌ Async evaluation failed: ${err.message}`);
          });
        }
      }

      return {
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      logger.error(`❌ Trade execution failed: ${error.message}`);
      if (error.data) {
        logger.error(`   Error data: ${error.data}`);
      }
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper function to evaluate profitability after contract-required delay
   * @private
   */
  async _evaluateProfitabilityAfterDelay(classificationId) {
    // Wait 11 seconds (contract requires minimum 10s)
    logger.info(`   ⏳ Scheduling profitability evaluation in 11 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 11000));

    try {
      logger.info(`\n⏱️  Evaluating trade profitability for ${classificationId}...`);
      const evalTx = await this.agent.evaluateTradeProfitability(classificationId, {
        gasLimit: 500000
      });
      logger.info(`   📝 Evaluation TX: ${evalTx.hash}`);
      logger.info(`   🔗 Explorer: https://basescan.org/tx/${evalTx.hash}`);

      const evalReceipt = await evalTx.wait();
      logger.info(`   ✅ Trade profitability evaluated! Gas used: ${evalReceipt.gasUsed}`);

      // Get final trade details
      const tradeDetails = await this.agent.getTradeDetails(classificationId);
      logger.info(`   💹 Result: ${tradeDetails.isProfitable ? '🟢 Profitable' : '🔴 Unprofitable'}`);
      logger.info(`   📊 Value before: $${ethers.formatUnits(tradeDetails.portfolioValueBefore, 6)}`);
      logger.info(`   📊 Value after: $${ethers.formatUnits(tradeDetails.portfolioValueAfter, 6)}`);

      return {
        success: true,
        txHash: evalTx.hash,
        isProfitable: tradeDetails.isProfitable
      };

    } catch (error) {
      logger.error(`   ❌ Failed to evaluate trade profitability: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current portfolio
   */
  async getPortfolio() {
    const [ethBalance, usdcBalance] = await this.agent.getPortfolio();
    return {
      eth: ethers.formatEther(ethBalance),
      usdc: ethers.formatUnits(usdcBalance, 6),
      ethRaw: ethBalance,
      usdcRaw: usdcBalance
    };
  }

  /**
   * Get portfolio value in USDC
   */
  async getPortfolioValue() {
    const value = await this.agent.getPortfolioValue();
    return ethers.formatUnits(value, 6);
  }

  /**
   * Get trading statistics
   */
  async getStats() {
    const [total, profitable, unprofitable, winRate] = await this.agent.getTradeStats();
    return {
      totalTrades: total.toString(),
      profitableTrades: profitable.toString(),
      unprofitableTrades: unprofitable.toString(),
      winRate: `${winRate}%`
    };
  }

  /**
   * Get recent trades
   */
  async getRecentTrades(count = 10) {
    const trades = await this.agent.getRecentTrades(count);
    return trades.map(trade => ({
      classificationId: trade.classificationId,
      sentiment: this._getSentimentLabel(trade.sentiment),
      action: trade.action,
      amountIn: trade.tokenIn === this.usdcAddress
        ? ethers.formatUnits(trade.amountIn, 6) + ' USDC'
        : ethers.formatEther(trade.amountIn) + ' ETH',
      amountOut: trade.tokenOut === this.usdcAddress
        ? ethers.formatUnits(trade.amountOut, 6) + ' USDC'
        : ethers.formatEther(trade.amountOut) + ' ETH',
      timestamp: new Date(Number(trade.timestamp) * 1000).toISOString(),
      profitable: trade.isProfitable,
      evaluated: trade.portfolioValueAfter > 0
    }));
  }

  /**
   * Helper to convert sentiment number to label
   */
  _getSentimentLabel(sentiment) {
    const sentiments = {
      0: 'BAD_NEWS',
      1: 'NEUTRAL_NEWS',
      2: 'GOOD_NEWS'
    };
    return sentiments[sentiment] || 'UNKNOWN';
  }

  /**
   * Stop listening
   */
  async stopListening() {
    if (!this.isListening) return;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isListening = false;
    logger.info('🛑 BaseTrader stopped polling');
  }

  /**
   * Check wallet balance
   */
  async checkBalance() {
    const balance = await this.provider.getBalance(this.wallet.address);
    logger.info(`💰 Wallet balance: ${ethers.formatEther(balance)} ETH`);
    return ethers.formatEther(balance);
  }
}

export { BaseTrader };
