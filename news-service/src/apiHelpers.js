/**
 * API helper functions to reduce code duplication and improve maintainability
 * Extracted from index.js to make the main file more readable
 */

import { BaseTrader } from './baseTrader.js';
import { logger } from './logger.js';

/**
 * Executes autonomous trade for a classification
 * @param {string} classificationId - The classification ID
 * @param {Object} oracleResult - Result from oracle posting
 * @param {boolean} waitForEvaluation - Whether to wait for profitability evaluation
 * @returns {Promise<Object>} Trade result
 */
export async function executeAutonomousTrade(classificationId, oracleResult, waitForEvaluation = true) {
  if (!process.env.ENABLE_AUTO_TRADE === 'true') {
    return {
      triggered: false,
      error: 'Auto-trading is disabled'
    };
  }

  if (!classificationId) {
    return {
      triggered: false,
      error: 'No classification ID provided'
    };
  }

  try {
    logger.info(`🤖 Triggering TradingAgent for classification ${classificationId}...`);

    const trader = new BaseTrader({
      rpcUrl: process.env.BASE_MAINNET_RPC_URL,
      privateKey: process.env.ORACLE_PRIVATE_KEY,
      oracleAddress: process.env.NEWS_ORACLE_ADDRESS,
      agentAddress: process.env.TRADING_AGENT_ADDRESS,
      registryAddress: process.env.VERIFICATION_REGISTRY_ADDRESS,
      uniswapRouter: process.env.UNISWAP_V3_ROUTER,
      wethAddress: process.env.WETH_ADDRESS,
      usdcAddress: process.env.USDC_ADDRESS
    });

    // Execute trade with optional profitability evaluation
    const tradeResponse = await trader.executeTrade(classificationId, { waitForEvaluation });

    if (tradeResponse.success) {
      logger.info(`✅ Autonomous trade complete! Tx: ${tradeResponse.txHash}`);

      return {
        triggered: true,
        txHash: tradeResponse.txHash,
        action: tradeResponse.action || 'TRADE',
        basescanUrl: `https://basescan.org/tx/${tradeResponse.txHash}`,
        blockNumber: tradeResponse.blockNumber,
        profitabilityEvaluated: waitForEvaluation
      };
    } else {
      logger.warn(`⚠️  Trade execution failed: ${tradeResponse.error}`);

      return {
        triggered: false,
        error: tradeResponse.error || 'Trade execution failed'
      };
    }
  } catch (error) {
    logger.error(`❌ Failed to trigger trading agent:`, error);

    return {
      triggered: false,
      error: error.message
    };
  }
}

/**
 * Handles classification workflow (classify + post + trade)
 * @param {Object} classifier - NewsClassifier instance
 * @param {Object} poster - OraclePoster instance
 * @param {Object} newsItem - News item to classify
 * @param {boolean} enableTrading - Whether to trigger autonomous trading
 * @returns {Promise<Object>} Complete workflow result
 */
export async function handleClassificationWorkflow(classifier, poster, newsItem, enableTrading = false) {
  // Step 1: Classify the headline
  logger.info(`📝 Classifying headline: "${newsItem.headline}"`);
  const classification = await classifier.classify(newsItem);

  if (!classification.success) {
    return {
      success: false,
      stage: 'classification',
      error: classification.reason || classification.error,
      classification: null,
      oracle: null,
      trade: null
    };
  }

  logger.info(`✅ Classification complete: ${['BAD', 'NEUTRAL', 'GOOD'][classification.sentiment]} (${classification.confidence}%)`);

  // Step 2: Post to oracle (if configured)
  let oracleResult = null;
  if (poster.contract) {
    try {
      logger.info(`📤 Posting classification to oracle contract...`);

      oracleResult = await poster.postClassification(
        classification.headline,
        classification.sentiment,
        classification.confidence,
        classification.proofHash
      );

      if (!oracleResult.success) {
        return {
          success: false,
          stage: 'oracle_posting',
          error: oracleResult.error || 'Failed to post to oracle',
          classification,
          oracle: null,
          trade: null
        };
      }

      logger.info(`✅ Classification posted! ID: ${oracleResult.classificationId}`);
    } catch (error) {
      logger.error(`❌ Failed to post classification:`, error);

      return {
        success: false,
        stage: 'oracle_posting',
        error: error.message,
        classification,
        oracle: null,
        trade: null
      };
    }
  }

  // Step 3: Execute autonomous trade (if enabled)
  let tradeResult = null;
  if (enableTrading && oracleResult && oracleResult.classificationId) {
    tradeResult = await executeAutonomousTrade(
      oracleResult.classificationId,
      oracleResult,
      true // Wait for profitability evaluation
    );
  }

  return {
    success: true,
    classification,
    oracle: oracleResult,
    trade: tradeResult || { triggered: false, error: 'Trading not enabled' }
  };
}

/**
 * Formats classification response for API
 * @param {Object} classification - Classification result
 * @param {Object} oracleResult - Oracle posting result
 * @param {Object} tradeResult - Trade execution result
 * @returns {Object} Formatted API response
 */
export function formatClassificationResponse(classification, oracleResult, tradeResult) {
  return {
    success: true,
    service: 'zkML News Classification + Autonomous Trading',
    classification: {
      headline: classification.headline,
      sentiment: ['BAD_NEWS', 'NEUTRAL', 'GOOD_NEWS'][classification.sentiment],
      confidence: classification.confidence,
      proofHash: classification.proofHash,
      classificationId: oracleResult?.classificationId || null,
      oracleTxHash: oracleResult?.txHash || null,
      basescanUrl: oracleResult?.txHash
        ? `https://basescan.org/tx/${oracleResult.txHash}`
        : null
    },
    autonomousTrade: tradeResult || {
      triggered: false,
      error: 'Trading agent not configured'
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Formats error response for API
 * @param {string} stage - Stage where error occurred
 * @param {string} error - Error message
 * @param {Object} partialData - Partial data if available
 * @returns {Object} Formatted error response
 */
export function formatErrorResponse(stage, error, partialData = {}) {
  return {
    success: false,
    error: {
      stage,
      message: error,
      timestamp: new Date().toISOString()
    },
    ...partialData
  };
}
