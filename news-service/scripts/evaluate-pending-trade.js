#!/usr/bin/env node
/**
 * @file evaluate-pending-trade.js
 * @description Manually evaluate pending trade profitability for the most recent trade
 * @usage node scripts/evaluate-pending-trade.js [classificationId]
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS;
const BASE_RPC_URL = process.env.BASE_MAINNET_RPC_URL;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;

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

async function evaluatePendingTrade(specificClassificationId = null) {
  try {
    console.log('🔷 Connecting to Base Mainnet...');
    console.log(`   RPC: ${BASE_RPC_URL}\n`);

    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
    const agent = new ethers.Contract(AGENT_ADDRESS, AGENT_ABI, wallet);

    console.log(`📋 Agent Address: ${AGENT_ADDRESS}`);
    console.log(`👛 Wallet: ${wallet.address}\n`);

    let classificationId;
    let trade;

    if (specificClassificationId) {
      // Use provided classification ID
      classificationId = specificClassificationId;
      console.log(`🎯 Using provided classification ID: ${classificationId}\n`);
      trade = await agent.getTradeDetails(classificationId);
    } else {
      // Get most recent trade
      console.log('🔍 Fetching recent trades...');
      const trades = await agent.getRecentTrades(1);

      if (trades.length === 0) {
        console.log('❌ No trades found');
        process.exit(1);
      }

      trade = trades[0];
      classificationId = trade.classificationId;
    }

    console.log('📊 Trade Details:');
    console.log(`   Classification ID: ${classificationId}`);
    console.log(`   Sentiment: ${trade.sentiment}`);
    console.log(`   Action: ${trade.action}`);
    console.log(`   Timestamp: ${new Date(Number(trade.timestamp) * 1000).toISOString()}`);
    console.log(`   Portfolio Value Before: ${ethers.formatUnits(trade.portfolioValueBefore, 6)} USDC`);
    console.log(`   Portfolio Value After: ${ethers.formatUnits(trade.portfolioValueAfter, 6)} USDC`);
    console.log(`   Has Been Reported: ${trade.hasReported}`);

    // Check if evaluation is needed
    if (trade.portfolioValueAfter > 0 && trade.hasReported) {
      console.log('\n✅ Trade already evaluated!');
      console.log(`   Result: ${trade.isProfitable ? '🟢 Profitable' : '🔴 Unprofitable'}`);

      const valueBefore = Number(ethers.formatUnits(trade.portfolioValueBefore, 6));
      const valueAfter = Number(ethers.formatUnits(trade.portfolioValueAfter, 6));
      const profitLoss = ((valueAfter - valueBefore) / valueBefore * 100).toFixed(2);
      console.log(`   Profit/Loss: ${profitLoss}%`);
      process.exit(0);
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
    console.log(`   Value Before: ${ethers.formatUnits(updatedTrade.portfolioValueBefore, 6)} USDC`);
    console.log(`   Value After: ${ethers.formatUnits(updatedTrade.portfolioValueAfter, 6)} USDC`);

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

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('   Error data:', error.data);
    }
    if (error.code === 'TIMEOUT') {
      console.error('\n💡 Tip: This might be a network connectivity issue.');
      console.error('   - Check that BASE_MAINNET_RPC_URL is set correctly in .env');
      console.error('   - Verify your Alchemy API key is valid');
      console.error('   - Try using a different RPC endpoint');
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const classificationId = args[0] || null;

if (classificationId && !classificationId.startsWith('0x')) {
  console.error('❌ Invalid classification ID. Must start with 0x');
  process.exit(1);
}

evaluatePendingTrade(classificationId);
