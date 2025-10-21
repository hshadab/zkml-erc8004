/**
 * Manually trigger trade execution for a classification
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  const agentABI = [
    'function reactToNews(bytes32 classificationId) external',
    'function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance)',
    'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)'
  ];

  const agent = new ethers.Contract(
    process.env.TRADING_AGENT_ADDRESS,
    agentABI,
    wallet
  );

  const classificationId = '0x185a8fab87704a8cf3d77f70ecbc391089665906705bd36fa7d57f921174104a';

  console.log('\n💱 Manually triggering trade execution...\n');
  console.log(`Classification ID: ${classificationId}`);
  console.log(`Agent Address: ${process.env.TRADING_AGENT_ADDRESS}\n`);

  // Get portfolio before
  const [ethBefore, usdcBefore] = await agent.getPortfolio();
  console.log('📊 Portfolio BEFORE:');
  console.log(`   WETH: ${ethers.formatEther(ethBefore)}`);
  console.log(`   USDC: ${ethers.formatUnits(usdcBefore, 6)}\n`);

  console.log('📝 Calling reactToNews()...');
  const tx = await agent.reactToNews(classificationId, {
    gasLimit: 1000000
  });

  console.log(`   TX Hash: ${tx.hash}`);
  console.log(`   🔗 BaseScan: https://basescan.org/tx/${tx.hash}\n`);

  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();

  console.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`);
  console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);

  // Check if TradeExecuted event was emitted
  const tradeEvents = receipt.logs.filter(log => {
    try {
      return agent.interface.parseLog(log)?.name === 'TradeExecuted';
    } catch {
      return false;
    }
  });

  if (tradeEvents.length > 0) {
    console.log('🎉 TradeExecuted event emitted!');
    const parsed = agent.interface.parseLog(tradeEvents[0]);
    console.log(`   Action: ${parsed.args.action}`);
    console.log(`   Amount In: ${parsed.args.tokenIn === process.env.USDC_ADDRESS
      ? ethers.formatUnits(parsed.args.amountIn, 6) + ' USDC'
      : ethers.formatEther(parsed.args.amountIn) + ' WETH'}`);
    console.log(`   Amount Out: ${parsed.args.tokenOut === process.env.USDC_ADDRESS
      ? ethers.formatUnits(parsed.args.amountOut, 6) + ' USDC'
      : ethers.formatEther(parsed.args.amountOut) + ' WETH'}\n`);
  } else {
    console.log('⚠️  No TradeExecuted event emitted');
    console.log('   Trade conditions may not have been met\n');
  }

  // Get portfolio after
  const [ethAfter, usdcAfter] = await agent.getPortfolio();
  console.log('📊 Portfolio AFTER:');
  console.log(`   WETH: ${ethers.formatEther(ethAfter)}`);
  console.log(`   USDC: ${ethers.formatUnits(usdcAfter, 6)}\n`);

  console.log('📺 Check UI at http://localhost:3001 for updated trade display\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  if (error.data) {
    console.error('Error data:', error.data);
  }
  process.exit(1);
});
