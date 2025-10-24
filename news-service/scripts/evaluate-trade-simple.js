/**
 * Evaluate pending trade profitability
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS;
const BASE_RPC_URL = process.env.BASE_MAINNET_RPC_URL;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;

// Complete ABI from baseTrader.js
const AGENT_ABI = [
  'function reactToNews(bytes32 classificationId) external',
  'function evaluateTradeProfitability(bytes32 classificationId) external',
  'function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance)',
  'function getPortfolioValue() external view returns (uint256)',
  'function getTradeDetails(bytes32 classificationId) external view returns (tuple(bytes32 classificationId, uint256 oracleTokenId, uint8 sentiment, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, uint256 portfolioValueBefore, uint256 portfolioValueAfter, bool isProfitable, bool hasReported))',
  'function getRecentTrades(uint256 count) external view returns (tuple(bytes32 classificationId, uint256 oracleTokenId, uint8 sentiment, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, uint256 portfolioValueBefore, uint256 portfolioValueAfter, bool isProfitable, bool hasReported)[])',
  'function getTradeStats() external view returns (uint256 total, uint256 profitable, uint256 unprofitable, uint256 winRate)',
  'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)',
  'event TradeProfitabilityDetermined(bytes32 indexed classificationId, bool profitable, uint256 valueBefore, uint256 valueAfter, int256 profitLossPercent)'
];

async function evaluatePendingTrade() {
  try {
    console.log('🔷 Connecting to Base Mainnet...');
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
    const agent = new ethers.Contract(AGENT_ADDRESS, AGENT_ABI, wallet);

    console.log(`📋 Agent Address: ${AGENT_ADDRESS}`);
    console.log(`👛 Wallet: ${wallet.address}\n`);

    // Get most recent trade
    console.log('🔍 Fetching recent trades...');
    const trades = await agent.getRecentTrades(1);

    if (trades.length === 0) {
      console.log('❌ No trades found');
      return;
    }

    const trade = trades[0];
    const classificationId = trade.classificationId;

    console.log('\n📊 Most Recent Trade:');
    console.log(`   Classification ID: ${classificationId}`);
    console.log(`   Sentiment: ${trade.sentiment}`);
    console.log(`   Action: ${trade.action}`);
    console.log(`   Timestamp: ${new Date(Number(trade.timestamp) * 1000).toISOString()}`);
    console.log(`   Portfolio Value Before: $${ethers.formatUnits(trade.portfolioValueBefore, 6)}`);
    console.log(`   Portfolio Value After: $${ethers.formatUnits(trade.portfolioValueAfter, 6)}`);
    console.log(`   Has Been Reported: ${trade.hasReported}`);

    // Check if evaluation is needed
    if (trade.portfolioValueAfter > 0 && trade.hasReported) {
      console.log('\n✅ Trade already evaluated!');
      console.log(`   Result: ${trade.isProfitable ? '🟢 Profitable' : '🔴 Unprofitable'}`);
      return;
    }

    // Check if enough time has passed (contract requires 10s minimum)
    const now = Math.floor(Date.now() / 1000);
    const tradeTime = Number(trade.timestamp);
    const elapsed = now - tradeTime;

    console.log(`\n⏱️  Time since trade: ${elapsed}s (minimum required: 10s)`);

    if (elapsed < 10) {
      const waitTime = 10 - elapsed + 1;
      console.log(`⏳ Waiting ${waitTime} more seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
    }

    // Evaluate trade profitability
    console.log('\n💹 Evaluating trade profitability...');
    const tx = await agent.evaluateTradeProfitability(classificationId, {
      gasLimit: 500000
    });

    console.log(`   📝 Transaction: ${tx.hash}`);
    console.log(`   🔗 Explorer: https://basescan.org/tx/${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Evaluation complete! Gas used: ${receipt.gasUsed}`);

    // Get updated trade details
    const updatedTrade = await agent.getTradeDetails(classificationId);
    console.log('\n📈 Final Results:');
    console.log(`   Value Before: $${ethers.formatUnits(updatedTrade.portfolioValueBefore, 6)}`);
    console.log(`   Value After: $${ethers.formatUnits(updatedTrade.portfolioValueAfter, 6)}`);

    const valueBefore = Number(ethers.formatUnits(updatedTrade.portfolioValueBefore, 6));
    const valueAfter = Number(ethers.formatUnits(updatedTrade.portfolioValueAfter, 6));
    const profitLoss = ((valueAfter - valueBefore) / valueBefore * 100).toFixed(2);

    console.log(`   Profit/Loss: ${profitLoss}%`);
    console.log(`   Result: ${updatedTrade.isProfitable ? '🟢 PROFITABLE' : '🔴 UNPROFITABLE'}`);

    // Get overall stats
    const [total, profitable, unprofitable, winRate] = await agent.getTradeStats();
    console.log('\n📊 Overall Trading Stats:');
    console.log(`   Total Trades: ${total}`);
    console.log(`   Profitable: ${profitable}`);
    console.log(`   Unprofitable: ${unprofitable}`);
    console.log(`   Win Rate: ${winRate}%`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('   Error data:', error.data);
    }
    process.exit(1);
  }
}

evaluatePendingTrade();
