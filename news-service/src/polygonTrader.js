import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Polygon Trading Agent Executor
 * Triggers trades on QuickSwap based on zkML classifications
 */
export class PolygonTrader {
  constructor() {
    this.rpcUrl = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    this.agentAddress = process.env.POLYGON_AGENT;
    this.oracleAddress = process.env.POLYGON_ORACLE;
    // Sanitize private key (strip quotes/whitespace and enforce hex-only)
    const pkRaw = (process.env.ORACLE_PRIVATE_KEY || '').replace(/["'\s]/g, '');
    const body = pkRaw.startsWith('0x') ? pkRaw.slice(2) : pkRaw;
    const hexOnly = body.replace(/[^0-9a-fA-F]/g, '');
    this.privateKey = '0x' + hexOnly;

    // Create custom FetchRequest with extended timeout for WSL2 compatibility
    const fetchReq = new ethers.FetchRequest(this.rpcUrl);
    fetchReq.timeout = 180000; // 180 second timeout

    // Explicitly specify Polygon PoS Mainnet network (Chain ID: 137)
    const network = {
      name: 'matic',
      chainId: 137
    };

    this.provider = new ethers.JsonRpcProvider(fetchReq, network, {
      staticNetwork: true
    });
    this.wallet = new ethers.Wallet(this.privateKey, this.provider);
    this.provider.polling = true;
    this.provider.pollingInterval = 4000;

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
      // Execute trade with retry and fee bump
      logger.info(`\n📤 Calling TradingAgent.reactToNews()...`);
      const maxAttempts = 3;
      const baseGasLimit = 1000000n; // Increased for QuickSwap V2 swap + contract logic
      const nonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');
      let tx, receipt;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const fee = await this.provider.getFeeData();
          const bump = 1 + (attempt - 1) * 0.25;
          const maxPriorityFeePerGas = fee.maxPriorityFeePerGas
            ? BigInt(Math.ceil(Number(fee.maxPriorityFeePerGas) * bump))
            : 2_000_000_000n;
          const maxFeePerGas = fee.maxFeePerGas
            ? BigInt(Math.ceil(Number(fee.maxFeePerGas) * bump))
            : 30_000_000_000n;

          tx = await this.agent.reactToNews(classificationId, {
            gasLimit: baseGasLimit,
            type: 2,
            maxPriorityFeePerGas,
            maxFeePerGas,
            nonce
          });

          logger.info(`   TX submitted: ${tx.hash}`);
          logger.info(`   🔗 https://polygonscan.com/tx/${tx.hash}`);

          receipt = await this.provider.waitForTransaction(tx.hash, 1, 180000);
          if (!receipt) throw new Error('Transaction wait timeout');
          break;
        } catch (error) {
          const msg = (error && error.message) ? error.message.toLowerCase() : '';
          logger.warn(`   ❌ Attempt ${attempt} failed: ${error.message}`);
          if (attempt < maxAttempts && (msg.includes('timeout') || msg.includes('network'))) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }
          throw error;
        }
      }

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

      // Get updated stats (best-effort; some versions may not expose these views)
      let totalTrades = 0n;
      let profitLoss = 0n;
      try { totalTrades = await this.agent.getTotalTrades(); } catch {}
      try { profitLoss = await this.agent.getProfitLoss(); } catch {}

      logger.info(`\n📈 Agent Statistics:`);
      logger.info(`   Total Trades: ${totalTrades}`);
      logger.info(`   P&L: ${ethers.formatEther(profitLoss)} MATIC`);

      // Calculate gas cost
      const gasPrice = receipt.gasPrice || 0n;
      const gasCost = gasPrice * (receipt.gasUsed || 0n);
      const costMATIC = ethers.formatEther(gasCost);
      const costUSD = (Number(costMATIC) * 0.75).toFixed(4); // Assuming $0.75/MATIC

      logger.info(`\n💰 Gas Cost: ${costMATIC} MATIC (~$${costUSD})`);

      logger.info(`\n════════════════════════════════════════════════════════════`);
      logger.info(`  ✅ TRADE COMPLETE`);
      logger.info(`════════════════════════════════════════════════════════════\n`);

      // Schedule trade profitability evaluation (asynchronous, non-blocking)
      setTimeout(async () => {
        try {
          logger.info(`⏱️  Evaluating trade profitability (10s post-trade)...`);
          const evalTx = await this.agent.evaluateTradeProfitability(classificationId, {
            gasLimit: 500000
          });
          logger.info(`   📝 Evaluation TX: ${evalTx.hash}`);
          const evalReceipt = await evalTx.wait();
          logger.info(`   ✅ Trade profitability evaluated! Gas used: ${evalReceipt.gasUsed}`);
        } catch (error) {
          logger.error(`   ❌ Failed to evaluate trade profitability: ${error.message}`);
        }
      }, 11000); // Wait 11 seconds (contract requires minimum 10s)

      return {
        txHash: tx.hash,
        gasUsed: (receipt.gasUsed || 0n).toString(),
        action: tradeEvent ? parsed.args.action : 'unknown',
        totalTrades: totalTrades.toString(),
        profitLoss: ethers.formatEther(profitLoss)
      };

    } catch (error) {
      logger.error(`❌ Trade execution failed: ${error.message}`);
      // Surface best-effort result if tx sent
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
