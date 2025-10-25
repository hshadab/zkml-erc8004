import dotenv from 'dotenv';
dotenv.config();

/**
 * Configuration for news service
 */
export const config = {
  // Blockchain
  rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  baseMainnetRpcUrl: process.env.BASE_MAINNET_RPC_URL,
  oraclePrivateKey: process.env.ORACLE_PRIVATE_KEY,
  // Prefer Polygon envs; fall back to legacy names if present
  newsOracleAddress: process.env.POLYGON_ORACLE || process.env.NEWS_ORACLE_CONTRACT_ADDRESS,
  registryAddress: process.env.POLYGON_REGISTRY || process.env.VERIFICATION_REGISTRY_ADDRESS || process.env.ZKML_VERIFICATION_REGISTRY,
  oracleTokenId: parseInt(process.env.ORACLE_TOKEN_ID || '1'), // ERC-8004 token ID

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

  // Check actual keys on config (Polygon-first)
  const missing = required.filter(key => !config[key]);

  if (missing.length > 0) {
    console.warn('⚠️  Warning: Missing required configuration:', missing.join(', '));
    console.warn('   Please check your .env file');
  }

  return missing.length === 0;
}
