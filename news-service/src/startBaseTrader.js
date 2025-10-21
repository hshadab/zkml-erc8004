/**
 * @file startBaseTrader.js
 * @description Entry point to start the BaseTrader service
 */

import dotenv from 'dotenv';
import { BaseTrader } from './baseTrader.js';
import { logger } from './logger.js';

dotenv.config();

async function main() {
  try {
    logger.info('🚀 Starting BaseTrader service...');

    const config = {
      rpcUrl: process.env.BASE_MAINNET_RPC_URL,
      privateKey: process.env.ORACLE_PRIVATE_KEY,
      oracleAddress: process.env.NEWS_ORACLE_CONTRACT_ADDRESS,
      agentAddress: process.env.TRADING_AGENT_ADDRESS,
      registryAddress: process.env.VERIFICATION_REGISTRY_ADDRESS,
      uniswapRouter: process.env.UNISWAP_V3_ROUTER,
      wethAddress: process.env.WETH_ADDRESS,
      usdcAddress: process.env.USDC_ADDRESS
    };

    const trader = new BaseTrader(config);

    // Check wallet balance
    await trader.checkBalance();

    // Get current portfolio
    const portfolio = await trader.getPortfolio();
    logger.info(`📊 Agent Portfolio: ${portfolio.eth} ETH, ${portfolio.usdc} USDC`);

    // Start listening for events
    await trader.startListening();

    // Keep the process running
    process.on('SIGINT', async () => {
      logger.info('\n🛑 Shutting down BaseTrader...');
      await trader.stopListening();
      process.exit(0);
    });

  } catch (error) {
    logger.error(`❌ Failed to start BaseTrader: ${error.message}`);
    process.exit(1);
  }
}

main();
