import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;

const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const POOL_ADDRESS = '0x46880b404CD35c165EDdefF7421019F8dD25F4Ad';
const POSITION_MANAGER = '0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2'; // Uniswap V3 NonfungiblePositionManager on Base Sepolia

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

console.log('💧 Adding liquidity to Uniswap V3 WETH/USDC pool on Base Sepolia...\n');

// Step 1: Get current pool state to determine price range
const poolAbi = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)'
];

const pool = new ethers.Contract(POOL_ADDRESS, poolAbi, provider);

const [slot0, token0, token1, fee] = await Promise.all([
  pool.slot0(),
  pool.token0(),
  pool.token1(),
  pool.fee()
]);

console.log('📊 Current Pool State:');
console.log(`   Token0: ${token0} ${token0.toLowerCase() === USDC_ADDRESS.toLowerCase() ? '(USDC)' : '(WETH)'}`);
console.log(`   Token1: ${token1} ${token1.toLowerCase() === WETH_ADDRESS.toLowerCase() ? '(WETH)' : '(USDC)'}`);
console.log(`   Fee: ${fee} (${Number(fee) / 10000}%)`);
console.log(`   Current Tick: ${slot0.tick}`);
console.log(`   Sqrt Price X96: ${slot0.sqrtPriceX96}\n`);

// Step 2: Check wallet balances
const erc20Abi = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function deposit() payable external' // For WETH
];

const weth = new ethers.Contract(WETH_ADDRESS, erc20Abi, wallet);
const usdc = new ethers.Contract(USDC_ADDRESS, erc20Abi, wallet);

let [wethBalance, usdcBalance, ethBalance] = await Promise.all([
  weth.balanceOf(wallet.address),
  usdc.balanceOf(wallet.address),
  provider.getBalance(wallet.address)
]);

console.log('💰 Wallet Balances:');
console.log(`   ETH: ${ethers.formatEther(ethBalance)}`);
console.log(`   WETH: ${ethers.formatEther(wethBalance)}`);
console.log(`   USDC: ${Number(usdcBalance) / 1e6}\n`);

// Step 3: Wrap some ETH if we don't have enough WETH
const targetWETH = ethers.parseEther('0.1'); // We want 0.1 WETH for liquidity

if (wethBalance < targetWETH) {
  const wrapAmount = targetWETH - wethBalance;
  console.log(`🔄 Wrapping ${ethers.formatEther(wrapAmount)} ETH → WETH...`);

  try {
    const wrapTx = await weth.deposit({ value: wrapAmount });
    console.log(`   📤 TX: ${wrapTx.hash}`);
    await wrapTx.wait();
    console.log(`   ✅ Wrapped successfully\n`);

    wethBalance = await weth.balanceOf(wallet.address);
    console.log(`   New WETH balance: ${ethers.formatEther(wethBalance)}\n`);
  } catch (error) {
    console.log(`   ❌ Wrap failed: ${error.message}\n`);
  }
}

// Step 4: Get USDC from faucet or swap if needed
// For now, let's check if we need USDC
const targetUSDC = 300n * 1000000n; // 300 USDC (assuming ~$3000 ETH price)

if (usdcBalance < targetUSDC) {
  console.log(`⚠️  Insufficient USDC! Have: ${Number(usdcBalance) / 1e6}, Need: ${Number(targetUSDC) / 1e6}`);
  console.log(`   You may need to:`);
  console.log(`   1. Use a Base Sepolia USDC faucet`);
  console.log(`   2. Swap some ETH for USDC first`);
  console.log(`   3. Bridge from another testnet\n`);
  console.log(`   For now, we'll proceed with whatever USDC you have...\n`);
}

// Step 5: Approve tokens for PositionManager
console.log('✅ Checking token approvals...');

const [wethAllowance, usdcAllowance] = await Promise.all([
  weth.allowance(wallet.address, POSITION_MANAGER),
  usdc.allowance(wallet.address, POSITION_MANAGER)
]);

const amount0ToAdd = token0.toLowerCase() === USDC_ADDRESS.toLowerCase() ? usdcBalance : wethBalance;
const amount1ToAdd = token1.toLowerCase() === WETH_ADDRESS.toLowerCase() ? wethBalance : usdcBalance;

console.log(`   WETH allowance: ${ethers.formatEther(wethAllowance)}`);
console.log(`   USDC allowance: ${Number(usdcAllowance) / 1e6}\n`);

if (wethAllowance < wethBalance) {
  console.log('🔓 Approving WETH...');
  const approveTx = await weth.approve(POSITION_MANAGER, ethers.MaxUint256);
  console.log(`   📤 TX: ${approveTx.hash}`);
  await approveTx.wait();
  console.log(`   ✅ WETH approved\n`);
}

if (usdcAllowance < usdcBalance) {
  console.log('🔓 Approving USDC...');
  const approveTx = await usdc.approve(POSITION_MANAGER, ethers.MaxUint256);
  console.log(`   📤 TX: ${approveTx.hash}`);
  await approveTx.wait();
  console.log(`   ✅ USDC approved\n`);
}

// Step 6: Calculate tick range
// We'll use a wide range: current tick ± 10% (about ±8000 ticks for a 0.3% fee pool)
const tickSpacing = 60; // 0.3% fee tier uses 60 tick spacing
const currentTick = Number(slot0.tick);
const tickRange = 10000; // Wide range to ensure liquidity is usable

let tickLower = currentTick - tickRange;
let tickUpper = currentTick + tickRange;

// Round to tick spacing
tickLower = Math.floor(tickLower / tickSpacing) * tickSpacing;
tickUpper = Math.ceil(tickUpper / tickSpacing) * tickSpacing;

console.log('📐 Tick Range Calculation:');
console.log(`   Current Tick: ${currentTick}`);
console.log(`   Tick Lower: ${tickLower}`);
console.log(`   Tick Upper: ${tickUpper}`);
console.log(`   Range: ±${tickRange} ticks (~±${(tickRange / 8000 * 10).toFixed(1)}%)\n`);

// Step 7: Mint position
const positionManagerAbi = [
  'function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)'
];

const positionManager = new ethers.Contract(POSITION_MANAGER, positionManagerAbi, wallet);

const mintParams = {
  token0: token0,
  token1: token1,
  fee: fee,
  tickLower: tickLower,
  tickUpper: tickUpper,
  amount0Desired: amount0ToAdd,
  amount1Desired: amount1ToAdd,
  amount0Min: 0, // Accept any amount (for simplicity)
  amount1Min: 0,
  recipient: wallet.address,
  deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
};

console.log('💧 Minting liquidity position...');
console.log(`   Amount0 (${token0.toLowerCase() === USDC_ADDRESS.toLowerCase() ? 'USDC' : 'WETH'}): ${token0.toLowerCase() === USDC_ADDRESS.toLowerCase() ? Number(amount0ToAdd) / 1e6 : ethers.formatEther(amount0ToAdd)}`);
console.log(`   Amount1 (${token1.toLowerCase() === WETH_ADDRESS.toLowerCase() ? 'WETH' : 'USDC'}): ${token1.toLowerCase() === WETH_ADDRESS.toLowerCase() ? ethers.formatEther(amount1ToAdd) : Number(amount1ToAdd) / 1e6}\n`);

try {
  const mintTx = await positionManager.mint(mintParams);
  console.log(`   📤 TX: ${mintTx.hash}`);

  const receipt = await mintTx.wait();
  console.log(`   ✅ Position minted! Gas used: ${receipt.gasUsed}`);
  console.log(`   🔗 https://sepolia.basescan.org/tx/${mintTx.hash}\n`);

  // Parse the mint event to get position details
  const mintEvent = receipt.logs.find(log => {
    try {
      const parsed = positionManager.interface.parseLog(log);
      return parsed && parsed.name === 'IncreaseLiquidity';
    } catch {
      return false;
    }
  });

  console.log('✅ SUCCESS! Liquidity has been added to the pool.');
  console.log('   The TradingAgent should now be able to execute swaps.\n');
  console.log('   Try running: node executeE2ETrade.js');

} catch (error) {
  console.log(`❌ Mint failed: ${error.message}`);

  if (error.message.includes('STF')) {
    console.log('\n💡 Error STF = "SafeTransferFrom" failed');
    console.log('   This likely means insufficient token balance or approval.');
  } else if (error.message.includes('TLM')) {
    console.log('\n💡 Error TLM = "Tick Lower/Upper Mismatch"');
    console.log('   Tick range is invalid for this fee tier.');
  } else if (error.message.includes('Price slippage check')) {
    console.log('\n💡 Price moved too much during transaction.');
    console.log('   Try again with updated tick range.');
  }
}
