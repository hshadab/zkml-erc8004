import { PolygonClassifier } from './polygonClassifier.js';
import { PolygonTrader } from './polygonTrader.js';
import { fetchCoinDeskNews } from './newsService.js';
import { logger } from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Automated Polygon zkML Trading Service
 * Continuously monitors news feeds and executes trades
 */
class PolygonAutomatedTrader {
  constructor() {
    this.classifier = new PolygonClassifier();
    this.trader = new PolygonTrader();
    this.pollInterval = parseInt(process.env.POLL_INTERVAL_MINUTES || '5') * 60 * 1000;
    this.processedArticles = new Set();
    this.minConfidence = parseInt(process.env.MIN_CONFIDENCE_THRESHOLD || '60');
    this.maxPerCycle = parseInt(process.env.MAX_CLASSIFICATIONS_PER_CYCLE || '5');
    this.isRunning = false;
  }

  async initialize() {
    logger.info('🚀 Initializing Polygon Automated Trading Service...');

    await this.classifier.initialize();
    await this.trader.initialize();

    logger.info(`✅ Service initialized`);
    logger.info(`   Poll Interval: ${this.pollInterval / 60000} minutes`);
    logger.info(`   Min Confidence: ${this.minConfidence}%`);
    logger.info(`   Max Per Cycle: ${this.maxPerCycle} articles`);
  }

  /**
   * Process a single news article
   */
  async processArticle(article) {
    const articleId = `${article.title}-${article.pubDate}`;

    // Skip if already processed
    if (this.processedArticles.has(articleId)) {
      return null;
    }

    try {
      logger.info(`\n${'='.repeat(70)}`);
      logger.info(`📰 Processing: "${article.title}"`);
      logger.info(`   Source: ${article.source}`);
      logger.info(`   Published: ${article.pubDate}`);
      logger.info(`${'='.repeat(70)}\n`);

      // Step 1: Generate zkML classification and submit to Polygon
      const classification = await this.classifier.classifyAndSubmit(article.title);

      // Check confidence threshold
      if (classification.confidence < this.minConfidence) {
        logger.warn(`⚠️  Confidence too low (${classification.confidence}% < ${this.minConfidence}%), skipping trade`);
        this.processedArticles.add(articleId);
        return null;
      }

      // Step 2: Execute trade on QuickSwap
      logger.info(`\n💹 Confidence: ${classification.confidence}% - Executing trade...`);

      const trade = await this.trader.executeTrade(classification.classificationId);

      // Mark as processed
      this.processedArticles.add(articleId);

      logger.info(`\n✅ Trade Complete!`);
      logger.info(`   Classification: ${classification.classificationId}`);
      logger.info(`   Trade TX: ${trade.txHash}`);
      logger.info(`   Action: ${trade.action}`);
      logger.info(`   Total Trades: ${trade.totalTrades}`);
      logger.info(`   P&L: ${trade.profitLoss} MATIC`);

      return {
        article,
        classification,
        trade,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`❌ Failed to process article: ${error.message}`);

      // Mark as processed to avoid retry loops
      this.processedArticles.add(articleId);

      return null;
    }
  }

  /**
   * Poll news feeds and process new articles
   */
  async pollAndTrade() {
    logger.info(`\n${'═'.repeat(70)}`);
    logger.info(`  🔍 Polling CoinDesk RSS Feed - ${new Date().toISOString()}`);
    logger.info(`${'═'.repeat(70)}\n`);

    try {
      // Fetch latest news
      const articles = await fetchCoinDeskNews();

      if (!articles || articles.length === 0) {
        logger.warn('⚠️  No articles found');
        return;
      }

      logger.info(`📊 Found ${articles.length} articles`);

      // Filter unprocessed articles
      const unprocessed = articles.filter(article => {
        const id = `${article.title}-${article.pubDate}`;
        return !this.processedArticles.has(id);
      });

      logger.info(`   New articles: ${unprocessed.length}`);

      if (unprocessed.length === 0) {
        logger.info('✅ No new articles to process');
        return;
      }

      // Limit processing per cycle
      const toProcess = unprocessed.slice(0, this.maxPerCycle);

      if (toProcess.length < unprocessed.length) {
        logger.info(`   Processing ${toProcess.length} of ${unprocessed.length} (rate limited)`);
      }

      // Process articles sequentially to avoid overwhelming the system
      const results = [];
      for (const article of toProcess) {
        const result = await this.processArticle(article);
        if (result) {
          results.push(result);
        }

        // Small delay between articles
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      logger.info(`\n${'═'.repeat(70)}`);
      logger.info(`  ✅ Cycle Complete - Processed ${results.length}/${toProcess.length} successfully`);
      logger.info(`${'═'.repeat(70)}\n`);

    } catch (error) {
      logger.error(`❌ Poll cycle failed: ${error.message}`);
    }
  }

  /**
   * Start automated trading service
   */
  async start() {
    if (this.isRunning) {
      logger.warn('⚠️  Service already running');
      return;
    }

    this.isRunning = true;

    logger.info(`\n${'═'.repeat(70)}`);
    logger.info(`  🤖 POLYGON AUTOMATED TRADING SERVICE STARTED`);
    logger.info(`${'═'.repeat(70)}`);
    logger.info(`   Polling every ${this.pollInterval / 60000} minutes`);
    logger.info(`   Min confidence: ${this.minConfidence}%`);
    logger.info(`   Max per cycle: ${this.maxPerCycle} articles`);
    logger.info(`${'═'.repeat(70)}\n`);

    // Run first cycle immediately
    await this.pollAndTrade();

    // Set up polling interval
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.pollAndTrade();
      }
    }, this.pollInterval);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('\n🛑 Shutting down gracefully...');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('\n🛑 Shutting down gracefully...');
      this.stop();
      process.exit(0);
    });
  }

  /**
   * Stop automated trading service
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('\n✅ Service stopped');
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      processedArticles: this.processedArticles.size,
      pollInterval: this.pollInterval,
      minConfidence: this.minConfidence,
      maxPerCycle: this.maxPerCycle
    };
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new PolygonAutomatedTrader();

  await service.initialize();
  await service.start();

  // Keep process alive
  process.on('unhandledRejection', (error) => {
    logger.error(`Unhandled rejection: ${error.message}`);
  });
}

export default PolygonAutomatedTrader;
