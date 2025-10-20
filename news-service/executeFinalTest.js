import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const AGENT_ADDRESS = '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const agentAbi = [
  'function reactToNews(bytes32 classificationId) external',
  'function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance)',
  'function getTradeDetails(bytes32 classificationId) external view returns (string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)',
  'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)'
];

const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, wallet);

// New classification ID with correct sentiment=0 (BAD_NEWS)
const classificationId = '0x4e663e1c58a7a22028714b8709a2b25873a7f2520c6f576bdfea2cdd2eb089a2';

console.log('🐻 Executing BEARISH trade (sentiment=0, 60% confidence) with FIXED enum mapping...\n');
console.log(`   Classification ID: ${classificationId}`);
console.log('');

// Get portfolio before
const [ethBefore, usdcBefore] = await agent.getPortfolio();
console.log('📊 Portfolio BEFORE trade:');
console.log(`   WETH: ${ethers.formatEther(ethBefore)}`);
console.log(`   USDC: ${Number(usdcBefore) / 1e6}`);
console.log('');

try {
  const tx = await agent.reactToNews(classificationId, { gasLimit: 600000 });
  console.log(`   📤 TX submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`   ✅ Trade transaction mined! Gas used: ${receipt.gasUsed}`);
  console.log(`   🔗 https://sepolia.basescan.org/tx/${tx.hash}`);
  console.log('');

  // Check for TradeExecuted event
  const tradeEvent = receipt.logs.find(log => {
    try {
      const parsed = agent.interface.parseLog(log);
      return parsed?.name === 'TradeExecuted';
    } catch {
      return false;
    }
  });

  if (tradeEvent) {
    const parsed = agent.interface.parseLog(tradeEvent);
    console.log('🎉 TRADE EXECUTED!');
    console.log(`   Action: ${parsed.args.action}`);
    console.log(`   Token In: ${parsed.args.tokenIn}`);
    console.log(`   Token Out: ${parsed.args.tokenOut}`);
    console.log(`   Amount In: ${ethers.formatEther(parsed.args.amountIn)} WETH`);
    console.log(`   Amount Out: ${Number(parsed.args.amountOut) / 1e6} USDC`);
    console.log('');
  } else {
    console.log('❌ NO TRADE EVENT - checking why...');
    console.log(`   Logs count: ${receipt.logs.length}`);
    console.log('');
  }

  // Get portfolio after
  const [ethAfter, usdcAfter] = await agent.getPortfolio();
  console.log('📊 Portfolio AFTER trade:');
  console.log(`   WETH: ${ethers.formatEther(ethAfter)}`);
  console.log(`   USDC: ${Number(usdcAfter) / 1e6}`);
  console.log('');

  const ethChange = ethBefore - ethAfter;
  const usdcChange = usdcAfter - usdcBefore;

  console.log('📈 Changes:');
  console.log(`   WETH: ${ethChange > 0 ? '-' : '+'}${ethers.formatEther(ethChange > 0 ? ethChange : -ethChange)}`);
  console.log(`   USDC: ${usdcChange > 0 ? '+' : '-'}${Math.abs(Number(usdcChange) / 1e6)}`);
  console.log('');

  if (ethChange > 0 && usdcChange > 0) {
    console.log('✅ SUCCESS! Agent sold WETH for USDC (bearish trade executed)');
    console.log('✨ Trades should now appear in the UI at http://localhost:3001');
  } else {
    console.log('❌ No portfolio change detected - trade may have failed');
  }

} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
  if (error.data) {
    console.log(`   Error data: ${error.data}`);
  }
}
