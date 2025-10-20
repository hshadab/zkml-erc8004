import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const AGENT_ADDRESS = '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const UNISWAP_ROUTER = '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4';
const UNISWAP_FACTORY = '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

console.log('🔍 Diagnosing Trading Agent...\n');

// Check WETH balance
const wethAbi = ['function balanceOf(address) view returns (uint256)'];
const weth = new ethers.Contract(WETH_ADDRESS, wethAbi, provider);

const balance = await weth.balanceOf(AGENT_ADDRESS);
console.log(`📊 Agent WETH Balance: ${ethers.formatEther(balance)} WETH`);
console.log(`   Raw: ${balance.toString()}`);
console.log(`   Meets minimum (0.001)? ${balance >= ethers.parseEther('0.001') ? '✅ YES' : '❌ NO'}`);
console.log('');

// Check if Uniswap pool exists
const factoryAbi = ['function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)'];
const factory = new ethers.Contract(UNISWAP_FACTORY, factoryAbi, provider);

const poolAddress = await factory.getPool(WETH_ADDRESS, USDC_ADDRESS, 3000);
console.log(`🏊 Uniswap V3 Pool (WETH/USDC 0.3%):`);
console.log(`   Address: ${poolAddress}`);
console.log(`   Exists? ${poolAddress !== '0x0000000000000000000000000000000000000000' ? '✅ YES' : '❌ NO'}`);
console.log('');

// Check pool liquidity if it exists
if (poolAddress !== '0x0000000000000000000000000000000000000000') {
  const poolAbi = [
    'function liquidity() view returns (uint128)',
    'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)'
  ];
  const pool = new ethers.Contract(poolAddress, poolAbi, provider);

  try {
    const liquidity = await pool.liquidity();
    const slot0 = await pool.slot0();

    console.log(`   Liquidity: ${liquidity.toString()}`);
    console.log(`   Has liquidity? ${liquidity > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`   Current tick: ${slot0.tick}`);
    console.log('');
  } catch (e) {
    console.log(`   ❌ Error reading pool: ${e.message}\n`);
  }
}

// Check agent's contract state
const agentAbi = [
  'function minConfidence() view returns (uint8)',
  'function WETH() view returns (address)',
  'function USDC() view returns (address)',
  'function swapRouter() view returns (address)',
  'function newsOracle() view returns (address)'
];
const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, provider);

const minConf = await agent.minConfidence();
const agentWeth = await agent.WETH();
const agentUsdc = await agent.USDC();
const agentRouter = await agent.swapRouter();
const agentOracle = await agent.newsOracle();

console.log(`⚙️  Agent Configuration:`);
console.log(`   Min Confidence: ${minConf}%`);
console.log(`   WETH: ${agentWeth}`);
console.log(`   USDC: ${agentUsdc}`);
console.log(`   Router: ${agentRouter}`);
console.log(`   Oracle: ${agentOracle}`);
console.log('');

console.log(`✅ Expected WETH: ${WETH_ADDRESS}`);
console.log(`✅ Expected USDC: ${USDC_ADDRESS}`);
console.log(`✅ Expected Router: ${UNISWAP_ROUTER}`);
console.log('');

// Check WETH approval for router
const allowance = await weth.balanceOf(AGENT_ADDRESS);
console.log(`🔐 WETH Allowance Check:`);
console.log(`   Balance: ${ethers.formatEther(allowance)} WETH`);
console.log('');

console.log('💡 Summary:');
if (balance >= ethers.parseEther('0.001')) {
  console.log('   ✅ Agent has sufficient WETH balance');
} else {
  console.log('   ❌ Agent WETH balance below minimum (0.001 WETH)');
}

if (poolAddress !== '0x0000000000000000000000000000000000000000') {
  console.log('   ✅ Uniswap pool exists');
} else {
  console.log('   ❌ Uniswap pool does NOT exist - this is likely the issue!');
}

console.log('');
console.log('🎯 Next Steps:');
if (poolAddress === '0x0000000000000000000000000000000000000000') {
  console.log('   1. Pool does not exist on Base Sepolia');
  console.log('   2. Need to either:');
  console.log('      a) Create the pool with liquidity, OR');
  console.log('      b) Mock the swap for demo purposes');
}
