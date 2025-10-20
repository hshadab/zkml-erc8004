import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const AGENT_ADDRESS = '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';
const POOL_ADDRESS = '0x46880b404CD35c165EDdefF7421019F8dD25F4Ad';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const ROUTER_ADDRESS = '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4';

const provider = new ethers.JsonRpcProvider(RPC_URL);

console.log('🔍 Diagnosing Uniswap V3 swap failure...\\n');

// Check pool state
const poolAbi = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() external view returns (uint128)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)'
];

const pool = new ethers.Contract(POOL_ADDRESS, poolAbi, provider);

try {
  const [slot0, liquidity, token0, token1, fee] = await Promise.all([
    pool.slot0(),
    pool.liquidity(),
    pool.token0(),
    pool.token1(),
    pool.fee()
  ]);

  console.log('📊 Pool State:');
  console.log(`   Token0: ${token0} ${token0.toLowerCase() === USDC_ADDRESS.toLowerCase() ? '(USDC)' : '(WETH)'}`);
  console.log(`   Token1: ${token1} ${token1.toLowerCase() === WETH_ADDRESS.toLowerCase() ? '(WETH)' : '(USDC)'}`);
  console.log(`   Fee: ${fee} (${fee / 10000}%)`);
  console.log(`   Liquidity: ${liquidity}`);
  console.log(`   Sqrt Price: ${slot0.sqrtPriceX96}`);
  console.log(`   Current Tick: ${slot0.tick}`);
  console.log(`   Unlocked: ${slot0.unlocked}`);
  console.log('');

  if (!slot0.unlocked) {
    console.log('🚨 PROBLEM: Pool is LOCKED!');
    console.log('   The pool may not be properly initialized.');
  }

  if (liquidity === 0n) {
    console.log('🚨 PROBLEM: Pool has ZERO liquidity!');
    console.log('   Cannot execute swaps without liquidity.');
  }

  // Check agent's token balances
  const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
  const weth = new ethers.Contract(WETH_ADDRESS, erc20Abi, provider);
  const usdc = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);

  const [wethBalance, usdcBalance] = await Promise.all([
    weth.balanceOf(AGENT_ADDRESS),
    usdc.balanceOf(AGENT_ADDRESS)
  ]);

  console.log('💰 Agent Balances:');
  console.log(`   WETH: ${ethers.formatEther(wethBalance)}`);
  console.log(`   USDC: ${Number(usdcBalance) / 1e6}`);
  console.log('');

  // Calculate swap amount (10% of WETH)
  const swapAmount = wethBalance / 10n;
  console.log('🔄 Planned Swap:');
  console.log(`   Amount In: ${ethers.formatEther(swapAmount)} WETH`);
  console.log(`   Direction: WETH → USDC`);
  console.log('');

  // Try to quote the swap
  const quoterAbi = [
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
  ];

  const quoterAddress = '0xC5290058841028F1614F3A6F0F5816cAd0df5E27'; // Uniswap V3 Quoter on Base Sepolia
  const quoter = new ethers.Contract(quoterAddress, quoterAbi, provider);

  try {
    const quote = await quoter.quoteExactInputSingle.staticCall({
      tokenIn: WETH_ADDRESS,
      tokenOut: USDC_ADDRESS,
      amountIn: swapAmount,
      fee: 3000,
      sqrtPriceLimitX96: 0
    });

    console.log('✅ Swap Quote Successful:');
    console.log(`   Expected Output: ${Number(quote.amountOut) / 1e6} USDC`);
    console.log(`   Ticks Crossed: ${quote.initializedTicksCrossed}`);
    console.log('');
  } catch (quoteError) {
    console.log('❌ Swap Quote Failed:');
    console.log(`   Error: ${quoteError.message}`);
    console.log('');
    console.log('🚨 This indicates the swap would fail!');
    console.log('   Possible causes:');
    console.log('   - Insufficient liquidity in pool');
    console.log('   - Price impact too high');
    console.log('   - Pool not properly initialized');
  }

} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}
