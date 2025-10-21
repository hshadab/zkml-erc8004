/**
 * Check if trade was executed for the latest classification
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);

  const agentABI = [
    'function getTradeDetails(bytes32 classificationId) external view returns (tuple(bytes32 classificationId, uint256 oracleTokenId, uint8 sentiment, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, uint256 portfolioValueBefore, uint256 portfolioValueAfter, bool isProfitable, bool hasReported))',
    'function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance)',
    'function getPortfolioValue() external view returns (uint256)',
    'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)'
  ];

  const agent = new ethers.Contract(
    process.env.TRADING_AGENT_ADDRESS,
    agentABI,
    provider
  );

  const classificationId = '0x185a8fab87704a8cf3d77f70ecbc391089665906705bd36fa7d57f921174104a';

  console.log('\n🔍 Checking Trade Results...\n');
  console.log(`Classification ID: ${classificationId}\n`);

  // Get current portfolio
  const [ethBalance, usdcBalance] = await agent.getPortfolio();
  console.log('📊 Current Portfolio:');
  console.log(`   ETH: ${ethers.formatEther(ethBalance)} WETH`);
  console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)} USDC\n`);

  // Get portfolio value
  const portfolioValue = await agent.getPortfolioValue();
  console.log(`💰 Portfolio Value: $${ethers.formatUnits(portfolioValue, 6)} USDC\n`);

  // Get trade details
  try {
    const trade = await agent.getTradeDetails(classificationId);

    if (trade.action === "") {
      console.log('❌ No trade executed for this classification');
      console.log('   The agent may not have detected the event yet');
      console.log('   Or the trade conditions were not met\n');
      return;
    }

    console.log('✅ Trade Details:');
    console.log(`   Action: ${trade.action}`);
    console.log(`   Token In: ${trade.tokenIn}`);
    console.log(`   Token Out: ${trade.tokenOut}`);
    console.log(`   Amount In: ${trade.tokenIn === process.env.USDC_ADDRESS
      ? ethers.formatUnits(trade.amountIn, 6) + ' USDC'
      : ethers.formatEther(trade.amountIn) + ' WETH'}`);
    console.log(`   Amount Out: ${trade.tokenOut === process.env.USDC_ADDRESS
      ? ethers.formatUnits(trade.amountOut, 6) + ' USDC'
      : ethers.formatEther(trade.amountOut) + ' WETH'}`);
    console.log(`   Timestamp: ${new Date(Number(trade.timestamp) * 1000).toISOString()}`);
    console.log(`   Portfolio Before: $${ethers.formatUnits(trade.portfolioValueBefore, 6)}`);
    console.log(`   Portfolio After: $${ethers.formatUnits(trade.portfolioValueAfter, 6)}`);
    console.log(`   Profitable: ${trade.isProfitable ? '✅ Yes' : '⏳ Not evaluated yet'}\n`);

  } catch (error) {
    console.log('❌ Error getting trade details:', error.message);
    console.log('   Trade may not have been executed yet\n');
  }

  // Check for TradeExecuted events
  console.log('🔍 Searching for TradeExecuted events in recent blocks...');
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - 100; // Last 100 blocks (~5 minutes on Base)

  const filter = agent.filters.TradeExecuted(classificationId);
  const events = await agent.queryFilter(filter, fromBlock, currentBlock);

  if (events.length > 0) {
    console.log(`\n✅ Found ${events.length} TradeExecuted event(s):\n`);
    for (const event of events) {
      console.log(`   TX Hash: ${event.transactionHash}`);
      console.log(`   Block: ${event.blockNumber}`);
      console.log(`   🔗 BaseScan: https://basescan.org/tx/${event.transactionHash}\n`);
    }
  } else {
    console.log('   ❌ No TradeExecuted events found');
    console.log('   The trade may not have been executed yet\n');
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
