/**
 * Check trading agent contract configuration
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);

  const agentABI = [
    'function swapRouter() external view returns (address)',
    'function poolFee() external view returns (uint24)',
    'function WETH() external view returns (address)',
    'function USDC() external view returns (address)'
  ];

  const agent = new ethers.Contract(
    process.env.TRADING_AGENT_ADDRESS,
    agentABI,
    provider
  );

  console.log('\n🔍 Trading Agent Configuration:\n');
  console.log(`Agent Address: ${process.env.TRADING_AGENT_ADDRESS}\n`);

  const swapRouter = await agent.swapRouter();
  const poolFee = await agent.poolFee();
  const weth = await agent.WETH();
  const usdc = await agent.USDC();

  console.log(`SwapRouter: ${swapRouter}`);
  console.log(`Pool Fee: ${poolFee} (${poolFee / 10000}%)`);
  console.log(`WETH: ${weth}`);
  console.log(`USDC: ${usdc}\n`);

  // Check expected values
  const expectedRouter = '0x2626664c2603336E57B271c5C0b26F421741e481';
  const expectedWETH = '0x4200000000000000000000000000000000000006';
  const expectedUSDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  console.log('✅ Configuration Check:');
  console.log(`   Router match: ${swapRouter.toLowerCase() === expectedRouter.toLowerCase() ? '✅' : '❌'}`);
  console.log(`   WETH match: ${weth.toLowerCase() === expectedWETH.toLowerCase() ? '✅' : '❌'}`);
  console.log(`   USDC match: ${usdc.toLowerCase() === expectedUSDC.toLowerCase() ? '✅' : '❌'}\n`);

  console.log('📝 Pool Fee Tiers:');
  console.log(`   100 = 0.01% (most common stablecoin pairs)`);
  console.log(`   500 = 0.05% (common pairs)`);
  console.log(`   3000 = 0.3% (standard pairs)`);
  console.log(`   10000 = 1% (exotic pairs)\n`);

  console.log(`🔧 Current pool fee (${poolFee}) = ${poolFee / 10000}%\n`);

  if (poolFee === 500) {
    console.log('⚠️  WARNING: Pool fee 500 (0.05%) may not have sufficient liquidity on Base');
    console.log('   Consider trying 3000 (0.3%) for WETH/USDC pairs\n');
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
