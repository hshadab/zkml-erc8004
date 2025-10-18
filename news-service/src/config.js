import dotenv from 'dotenv';
dotenv.config();

/**
 * Configuration for news service
 */
export const config = {
  // Blockchain
  rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  oraclePrivateKey: process.env.ORACLE_PRIVATE_KEY,
  newsOracleAddress: process.env.NEWS_ORACLE_CONTRACT_ADDRESS,
  registryAddress: process.env.VERIFICATION_REGISTRY_ADDRESS,

  // News sources
  coinDeskRssUrl: process.env.COINDESK_RSS_URL || 'https://www.coindesk.com/arc/outboundfeeds/rss/',
  cryptoCompareApiKey: process.env.CRYPTOCOMPARE_API_KEY || '',

  // Service settings
  pollIntervalMinutes: parseInt(process.env.POLL_INTERVAL_MINUTES || '5'),
  minConfidenceThreshold: parseInt(process.env.MIN_CONFIDENCE_THRESHOLD || '60'),
  maxClassificationsPerCycle: parseInt(process.env.MAX_CLASSIFICATIONS_PER_CYCLE || '5'),

  // JOLT-Atlas
  joltAtlasPath: process.env.JOLT_ATLAS_PATH || '../zkml-model',
  proofTimeoutMs: parseInt(process.env.PROOF_TIMEOUT_MS || '5000'),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // API server
  port: parseInt(process.env.PORT || '3000'),
};

// Validate required config
export function validateConfig() {
  const required = [
    'oraclePrivateKey',
    'newsOracleAddress',
    'registryAddress'
  ];

  const missing = required.filter(key => !config[key.replace(/([A-Z])/g, '_$1').toLowerCase()]);

  if (missing.length > 0) {
    console.warn('⚠️  Warning: Missing required configuration:', missing.join(', '));
    console.warn('   Please check your .env file');
  }

  return missing.length === 0;
}
