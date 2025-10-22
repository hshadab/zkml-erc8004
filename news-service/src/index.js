import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { NewsFetcher } from './fetcher.js';
import { NewsClassifier } from './classifier.js';
import { OraclePoster } from './poster.js';
import { logger } from './logger.js';
import { BaseTrader } from './baseTrader.js';
import { X402Service } from './x402Service.js';
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
    this.x402 = new X402Service();
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

    // Initialize X402 payment service
    if (config.oraclePrivateKey) {
      const x402Success = await this.x402.initialize();
      if (!x402Success) {
        logger.warn('⚠️  X402 service initialization failed. Paid API will not be available.\n');
      }
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

            // Auto-trigger trade on Base if enabled
            if (process.env.ENABLE_AUTO_TRADE === 'true' && result.classificationId) {
              try {
                logger.info('🤖 Auto-trading enabled: triggering TradingAgent.reactToNews()');
                const trader = new BaseTrader();
                await trader.initialize();
                await trader.executeTrade(result.classificationId);
              } catch (tradeErr) {
                logger.warn(`⚠️  Auto-trade failed: ${tradeErr.message}`);
              }
            }
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
    this.app.listen(config.port, '0.0.0.0', () => {
      logger.info(`🌐 API server listening on http://0.0.0.0:${config.port}`);
      logger.info(`\n📝 Endpoints:`);
      logger.info(`   GET  /status             - Service status`);
      logger.info(`   POST /api/demo/classify  - Manual classification (for demos)`);
      logger.info(`   GET  /api/pricing        - X402 pricing information`);
      logger.info(`   POST /api/classify       - X402 paid classification (requires payment)`);
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

    // X402 Pricing endpoint
    this.app.get('/api/pricing', (req, res) => {
      res.json(this.x402.getPricing());
    });

    // X402 Paid classification endpoint
    this.app.post('/api/classify', async (req, res) => {
      try {
        const { headline, paymentTx } = req.body;

        if (!headline) {
          return res.status(400).json({ error: 'Headline required' });
        }

        if (!paymentTx) {
          // Return HTTP 402 Payment Required
          return res.status(402).json(this.x402.getPaymentRequiredResponse());
        }

        // Verify payment
        logger.info(`\n💳 Payment verification requested for headline: "${headline}"`);
        const paymentResult = await this.x402.verifyPayment(paymentTx);

        if (!paymentResult.valid) {
          return res.status(402).json({
            status: 402,
            message: 'Payment verification failed',
            error: paymentResult.error,
            code: paymentResult.code,
            payment: this.x402.getPricing()
          });
        }

        logger.info(`✅ Payment verified! Processing classification...`);

        // Classify the headline
        const classification = await this.classifier.classify({
          headline,
          source: 'Paid API',
          reliability: 1.0
        });

        if (!classification.success) {
          return res.status(400).json({
            error: classification.reason || classification.error
          });
        }

        logger.info(`✅ Classification complete for paid request`);

        // Post classification to oracle contract
        let oracleResult = null;
        let tradeResult = null;

        if (this.poster.contract) {
          try {
            logger.info(`📝 Posting classification to oracle contract...`);
            oracleResult = await this.poster.postClassification(
              classification.headline,
              classification.sentiment,
              classification.confidence,
              classification.proofHash
            );

            if (oracleResult.success && oracleResult.classificationId) {
              logger.info(`✅ Classification posted! ID: ${oracleResult.classificationId}`);

              // Trigger autonomous trading agent for full demo experience
              try {
                logger.info(`🤖 Triggering TradingAgent for full demo experience...`);
                const trader = new BaseTrader();
                await trader.initialize();

                // Execute trade based on classification
                const tradeResponse = await trader.executeTrade(oracleResult.classificationId);

                if (tradeResponse.success) {
                  logger.info(`✅ Autonomous trade executed! Tx: ${tradeResponse.txHash}`);
                  tradeResult = {
                    triggered: true,
                    txHash: tradeResponse.txHash,
                    action: tradeResponse.action || 'TRADE',
                    basescanUrl: `https://basescan.org/tx/${tradeResponse.txHash}`,
                    blockNumber: tradeResponse.blockNumber
                  };
                } else {
                  logger.warn(`⚠️  Trade execution failed: ${tradeResponse.error}`);
                  tradeResult = {
                    triggered: false,
                    error: tradeResponse.error || 'Trade execution failed'
                  };
                }
              } catch (tradeErr) {
                logger.error(`❌ Failed to trigger trading agent:`, tradeErr);
                tradeResult = {
                  triggered: false,
                  error: tradeErr.message
                };
              }
            }
          } catch (postErr) {
            logger.error(`❌ Failed to post classification:`, postErr);
          }
        }

        // Return classification with proof and trade details
        res.json({
          success: true,
          service: 'zkML News Classification + Autonomous Trading Demo (X402)',
          payment: {
            verified: true,
            txHash: paymentResult.txHash,
            from: paymentResult.from,
            amount: paymentResult.amount
          },
          classification: {
            headline: classification.headline,
            sentiment: ['BAD_NEWS', 'NEUTRAL', 'GOOD_NEWS'][classification.sentiment],
            confidence: classification.confidence,
            proofHash: classification.proofHash,
            classificationId: oracleResult?.classificationId || null,
            oracleTxHash: oracleResult?.txHash || null
          },
          autonomousTrade: tradeResult || {
            triggered: false,
            error: 'Trading agent not configured'
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        logger.error('Paid classification failed:', error);
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
