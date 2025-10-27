import { BaseTrader } from './src/baseTrader.js';
import { logger } from './src/logger.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment from parent directory
dotenv.config({ path: resolve(__dirname, '../.env') });

async function testTrade() {
  try {
    logger.info('🧪 Testing trade execution...');

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

    // Use the first classification ID
    const classificationId = '0x48c2da7b256463c523a343d88e489cfcf471d4a7264109c670d356d6095df645';

    logger.info(`Executing trade for classification: ${classificationId}`);
    await trader.executeTrade(classificationId, { waitForEvaluation: true });

    logger.info('✅ Trade test complete!');
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Trade test failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

testTrade();
