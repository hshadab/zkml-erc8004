import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function testApprove() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  const TRADING_AGENT = '0xD2acC1aadF0854FFdFD1d1ccDD5aE19Cd6088512';
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const SWAP_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481';

  console.log('Testing manual approve from trading agent contract...\n');

  // Create trading agent contract instance
  const tradingAgent = new ethers.Contract(
    TRADING_AGENT,
    [
      'function emergencyWithdraw(address token, uint256 amount) external',
      'function owner() view returns (address)'
    ],
    wallet
  );

  // Verify we're the owner
  const owner = await tradingAgent.owner();
  console.log('Contract owner:', owner);
  console.log('Our wallet:', wallet.address);
  console.log('We are owner:', owner.toLowerCase() === wallet.address.toLowerCase());

  // Try using emergencyWithdraw to approve (we'll withdraw 0 to test)
  // Actually, let's try a direct low-level call to approve from the contract

  console.log('\nLet me try calling approve directly using a low-level call...');

  // Create the approve call data
  const iface = new ethers.Interface(['function approve(address spender, uint256 amount) returns (bool)']);
  const approveData = iface.encodeFunctionData('approve', [SWAP_ROUTER, ethers.parseUnits('25', 6)]);

  console.log('Approve calldata:', approveData);

  // Try to execute this as a transaction FROM the trading agent
  // We need to add a function to the contract that can make arbitrary calls
  // Since we don't have that, let's check if there's another way

  console.log('\nThe issue is: the contract needs to call approve() on USDC');
  console.log('But the _approveToken function in the contract is being called during reactToNews()');
  console.log('Yet the allowance is still 0 after the call...\n');

  // Let's check the USDC contract to see if approve returns a value
  const usdc = new ethers.Contract(
    USDC,
    ['function approve(address spender, uint256 amount) returns (bool)'],
    provider
  );

  console.log('Testing if USDC approve returns boolean...');
  try {
    // Static call to see what approve returns
    const result = await usdc.approve.staticCall(SWAP_ROUTER, ethers.parseUnits('1', 6));
    console.log('USDC approve static call result:', result);
    console.log('Type:', typeof result);
  } catch (error) {
    console.log('Static call failed:', error.message);
  }

  // The real issue might be that the Uniswap V3 SwapRouter02 interface is different
  // Let's check the exact function signature SwapRouter02 uses
  console.log('\nChecking SwapRouter02 interface...');
  console.log('We are calling: exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))');
  console.log('With 7 parameters (no deadline)');

  // Let's verify the pool actually exists
  const FACTORY = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
  const factory = new ethers.Contract(
    FACTORY,
    ['function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)'],
    provider
  );

  const WETH = '0x4200000000000000000000000000000000000006';
  const pool = await factory.getPool(USDC, WETH, 500);
  console.log('\nUniswap V3 Pool (USDC/WETH 0.05%):', pool);

  if (pool === ethers.ZeroAddress) {
    console.log('❌ Pool does not exist!');
  } else {
    console.log('✅ Pool exists');

    // Check pool liquidity
    const poolContract = new ethers.Contract(
      pool,
      ['function liquidity() view returns (uint128)'],
      provider
    );

    try {
      const liquidity = await poolContract.liquidity();
      console.log('Pool liquidity:', liquidity.toString());
    } catch (e) {
      console.log('Could not check liquidity:', e.message);
    }
  }
}

testApprove().catch(console.error);
