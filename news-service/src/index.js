import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { NewsFetcher } from './fetcher.js';
import { NewsClassifier } from './classifier.js';
import { OraclePoster } from './poster.js';
import { logger } from './logger.js';
import { config, validateConfig } from './config.js';
import { mkdir } from 'fs/promises';

/**
 * Main news service
 * Orchestrates news fetching, classification, and on-chain posting
 */
class NewsService {
  constructor() {
    this.fetcher = new NewsFetcher();
    this.classifier = new NewsClassifier();
    this.poster = new OraclePoster();
    this.isProcessing = false;
    this.app = express();
  }

  /**
   * Initialize service
   */
  async initialize() {
    logger.info('🚀 Initializing zkML News Service...');
    logger.info('====================================\n');

    // Create logs directory
    try {
      await mkdir('logs', { recursive: true });
    } catch (error) {
      // Ignore if exists
    }

    // Validate config
    if (!validateConfig()) {
      logger.warn('⚠️  Some configuration is missing. Service may not work properly.');
      logger.warn('   You can still test fetching and classification, but posting will fail.\n');
    }

    // Initialize oracle poster
    if (config.newsOracleAddress && config.oraclePrivateKey) {
      const success = await this.poster.initialize();
      if (!success) {
        logger.error('❌ Failed to initialize oracle poster');
        return false;
      }
    } else {
      logger.warn('⚠️  Oracle configuration missing. Skipping poster initialization.');
      logger.warn('   Service will run in test mode (fetch + classify only)\n');
    }

    logger.info('✅ Service initialized successfully\n');
    return true;
  }

  /**
   * Process news cycle
   */
  async processNewsCycle() {
    if (this.isProcessing) {
      logger.info('⏭️  Skipping cycle (previous cycle still running)');
      return;
    }

    this.isProcessing = true;

    try {
      logger.info('\n⏰ Starting news cycle...');
      logger.info('====================================');

      // 1. Fetch news
      const newsItems = await this.fetcher.fetchLatestNews();

      if (newsItems.length === 0) {
        logger.info('No new news items found');
        return;
      }

      logger.info(`\n📊 Processing ${newsItems.length} news items...\n`);

      // 2. Classify each item
      let posted = 0;
      for (const newsItem of newsItems) {
        const classification = await this.classifier.classify(newsItem);

        if (!classification.success) {
          logger.info(`Skipped: ${classification.reason || classification.error}`);
          continue;
        }

        // 3. Post to oracle (if configured)
        if (this.poster.contract) {
          const result = await this.poster.postClassification(
            classification.headline,
            classification.sentiment,
            classification.confidence,
            classification.proofHash
          );

          if (result.success) {
            posted++;
            logger.info(`\n✅ Successfully posted classification ${posted}/${newsItems.length}\n`);
          }
        } else {
          logger.info('(Test mode - not posting to blockchain)');
          posted++;
        }

        // Small delay between posts to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      logger.info(`\n✅ Cycle complete! Posted ${posted} classifications`);
      logger.info('====================================\n');

    } catch (error) {
      logger.error('Error in news cycle:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start service with cron job
   */
  async start() {
    const initialized = await this.initialize();
    if (!initialized && !config.newsOracleAddress) {
      logger.info('Running in TEST MODE');
    }

    // Set up Express API
    this.setupAPI();

    // Run once on startup
    logger.info('Running initial news cycle...');
    await this.processNewsCycle();

    // Schedule cron job
    const cronExpression = `*/${config.pollIntervalMinutes} * * * *`;
    logger.info(`\n⏰ Scheduling news cycles every ${config.pollIntervalMinutes} minutes`);
    logger.info(`   Cron expression: ${cronExpression}\n`);

    cron.schedule(cronExpression, async () => {
      await this.processNewsCycle();
    });

    // Start API server
    this.app.listen(config.port, () => {
      logger.info(`🌐 API server listening on http://localhost:${config.port}`);
      logger.info(`\n📝 Endpoints:`);
      logger.info(`   GET  /status           - Service status`);
      logger.info(`   POST /api/demo/classify - Manual classification (for demos)`);
      logger.info(`\n✨ Service is running! Press Ctrl+C to stop.\n`);
    });
  }

  /**
   * Set up Express API
   */
  setupAPI() {
    this.app.use(cors());
    this.app.use(express.json());

    // Health check
    this.app.get('/status', async (req, res) => {
      const oracleStatus = this.poster.contract
        ? await this.poster.getStatus()
        : { message: 'Test mode - not connected to blockchain' };

      res.json({
        service: 'zkML News Service',
        status: 'running',
        config: {
          pollIntervalMinutes: config.pollIntervalMinutes,
          minConfidence: config.minConfidenceThreshold
        },
        oracle: oracleStatus
      });
    });

    // Manual classification endpoint (for demos)
    this.app.post('/api/demo/classify', async (req, res) => {
      try {
        const { headline } = req.body;

        if (!headline) {
          return res.status(400).json({ error: 'Headline required' });
        }

        logger.info(`\n🎬 Manual classification requested: "${headline}"`);

        // Classify
        const classification = await this.classifier.classify({
          headline,
          source: 'Manual',
          reliability: 1.0
        });

        if (!classification.success) {
          return res.status(400).json({
            error: classification.reason || classification.error
          });
        }

        // Post to oracle if configured
        let txResult = null;
        if (this.poster.contract) {
          txResult = await this.poster.postClassification(
            classification.headline,
            classification.sentiment,
            classification.confidence,
            classification.proofHash
          );
        }

        res.json({
          success: true,
          classification: {
            headline: classification.headline,
            sentiment: ['BAD', 'NEUTRAL', 'GOOD'][classification.sentiment],
            confidence: classification.confidence,
            proofHash: classification.proofHash
          },
          transaction: txResult
        });

      } catch (error) {
        logger.error('Manual classification failed:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }
}

// Start service
const service = new NewsService();
service.start().catch(error => {
  logger.error('Failed to start service:', error);
  process.exit(1);
});
