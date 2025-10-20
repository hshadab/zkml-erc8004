import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { logger } from './logger.js';

dotenv.config();

/**
 * Polygon Trading Agent Executor
 * Triggers trades on QuickSwap based on zkML classifications
 */
export class PolygonTrader {
  constructor() {
    this.rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.agentAddress = process.env.POLYGON_AGENT;
    this.oracleAddress = process.env.POLYGON_ORACLE;
    this.privateKey = process.env.ORACLE_PRIVATE_KEY;

    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);

    // TradingAgent ABI
    this.agentAbi = [
      'function reactToNews(bytes32 classificationId) external',
      'function getTotalTrades() external view returns (uint256)',
      'function getProfitLoss() external view returns (int256)',
      'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)'
    ];

    this.agent = new ethers.Contract(this.agentAddress, this.agentAbi, this.wallet);
  }

  async initialize() {
    const network = await this.provider.getNetwork();
    logger.info(`Polygon Trader initialized on Chain ID: ${network.chainId}`);

    const balance = await this.provider.getBalance(this.agentAddress);
    logger.info(`TradingAgent balance: ${ethers.formatEther(balance)} MATIC`);
  }

  /**
   * Execute trade based on classification
   */
  async executeTrade(classificationId) {
    logger.info(`\n════════════════════════════════════════════════════════════`);
    logger.info(`  🤖 EXECUTING TRADE ON QUICKSWAP`);
    logger.info(`════════════════════════════════════════════════════════════\n`);

    logger.info(`Classification ID: ${classificationId}`);

    try {
      // Execute trade
      logger.info(`\n📤 Calling TradingAgent.reactToNews()...`);
      const tx = await this.agent.reactToNews(classificationId, { gasLimit: 500000 });

      logger.info(`   TX submitted: ${tx.hash}`);
      logger.info(`   🔗 https://polygonscan.com/tx/${tx.hash}`);

      const receipt = await tx.wait();
      logger.info(`   ✅ Trade executed! Gas used: ${receipt.gasUsed}`);

      // Parse trade event
      const tradeEvent = receipt.logs.find(log => {
        try {
          const parsed = this.agent.interface.parseLog(log);
          return parsed && parsed.name === 'TradeExecuted';
        } catch {
          return false;
        }
      });

      if (tradeEvent) {
        const parsed = this.agent.interface.parseLog(tradeEvent);

        logger.info(`\n📊 Trade Details:`);
        logger.info(`   Action:     ${parsed.args.action}`);
        logger.info(`   Token In:   ${parsed.args.tokenIn}`);
        logger.info(`   Token Out:  ${parsed.args.tokenOut}`);
        logger.info(`   Amount In:  ${ethers.formatEther(parsed.args.amountIn)} MATIC`);
        logger.info(`   Amount Out: ${Number(parsed.args.amountOut) / 1e6} USDC`);
        logger.info(`   Timestamp:  ${new Date(Number(parsed.args.timestamp) * 1000).toISOString()}`);
      }

      // Get updated stats
      const totalTrades = await this.agent.getTotalTrades();
      const profitLoss = await this.agent.getProfitLoss();

      logger.info(`\n📈 Agent Statistics:`);
      logger.info(`   Total Trades: ${totalTrades}`);
      logger.info(`   P&L: ${ethers.formatEther(profitLoss)} MATIC`);

      // Calculate gas cost
      const gasPrice = receipt.gasPrice;
      const gasCost = gasPrice * receipt.gasUsed;
      const costMATIC = ethers.formatEther(gasCost);
      const costUSD = (Number(costMATIC) * 0.75).toFixed(4); // Assuming $0.75/MATIC

      logger.info(`\n💰 Gas Cost: ${costMATIC} MATIC (~$${costUSD})`);

      logger.info(`\n════════════════════════════════════════════════════════════`);
      logger.info(`  ✅ TRADE COMPLETE`);
      logger.info(`════════════════════════════════════════════════════════════\n`);

      return {
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        action: tradeEvent ? parsed.args.action : 'unknown',
        totalTrades: totalTrades.toString(),
        profitLoss: ethers.formatEther(profitLoss)
      };

    } catch (error) {
      logger.error(`❌ Trade execution failed: ${error.message}`);
      throw error;
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const classificationId = process.argv[2];

  if (!classificationId) {
    console.error('Usage: node polygonTrader.js <classificationId>');
    process.exit(1);
  }

  const trader = new PolygonTrader();
  await trader.initialize();

  const result = await trader.executeTrade(classificationId);

  console.log(`\n✅ Trade executed successfully!`);
  console.log(`   TX: https://polygonscan.com/tx/${result.txHash}`);
}
