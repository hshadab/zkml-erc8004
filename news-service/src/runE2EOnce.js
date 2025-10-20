import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { NewsClassifier } from './classifier.js';
import { OraclePoster } from './poster.js';
import { PolygonTrader } from './polygonTrader.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  // Ensure we use mock proofs unless explicitly requested
  if (!('USE_REAL_PROOFS' in process.env)) {
    process.env.USE_REAL_PROOFS = 'false';
  }

  const headline = process.argv.slice(2).join(' ') || 'SEC approves Bitcoin ETF; institutions add exposure';

  logger.info('Starting single-run E2E test on Polygon...');
  logger.info(`Headline: "${headline}"`);

  // 1) Classify
  const classifier = new NewsClassifier();
  const classification = await classifier.classify({ headline, source: 'Manual', reliability: 1.0 });
  if (!classification.success) {
    throw new Error(`Classification failed: ${classification.reason || classification.error}`);
  }
  logger.info(`Classification → ${['BAD','NEUTRAL','GOOD'][classification.sentiment]} @ ${classification.confidence}%`);

  // 2) Post to Oracle
  const poster = new OraclePoster();
  const ok = await poster.initialize();
  if (!ok) throw new Error('Oracle poster failed to initialize');

  const post = await poster.postClassification(
    classification.headline,
    classification.sentiment,
    classification.confidence,
    classification.proofHash
  );
  if (!post.success) throw new Error(`Post failed: ${post.error}`);
  if (!post.classificationId) throw new Error('Missing classificationId from event parsing');

  logger.info(`On-chain Classification ID: ${post.classificationId}`);

  // 3) Execute trade via TradingAgent
  const trader = new PolygonTrader();
  await trader.initialize();
  const trade = await trader.executeTrade(post.classificationId);

  logger.info('E2E Test Complete');
  logger.info(`TX Hash: ${trade.txHash}`);
}

main().catch(err => {
  logger.error(`E2E run failed: ${err.message}`);
  process.exit(1);
});

