import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function testSwap() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  const TRADING_AGENT = '0xD2acC1aadF0854FFdFD1d1ccDD5aE19Cd6088512';
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const SWAP_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481';

  // First, let's check if USDC has been approved for the swap router
  const usdcContract = new ethers.Contract(
    USDC,
    ['function allowance(address owner, address spender) view returns (uint256)'],
    provider
  );

  const allowance = await usdcContract.allowance(TRADING_AGENT, SWAP_ROUTER);
  console.log('USDC allowance for SwapRouter:', ethers.formatUnits(allowance, 6), 'USDC');

  // Check if the trading agent has USDC
  const usdcBalance = new ethers.Contract(
    USDC,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );

  const balance = await usdcBalance.balanceOf(TRADING_AGENT);
  console.log('Trading agent USDC balance:', ethers.formatUnits(balance, 6), 'USDC');

  // Now let's try to call reactToNews and see what happens
  const tradingAgent = new ethers.Contract(
    TRADING_AGENT,
    [
      'function reactToNews(bytes32) external',
      'function owner() view returns (address)',
      'function swapRouter() view returns (address)',
      'function poolFee() view returns (uint24)'
    ],
    wallet
  );

  console.log('\nTrading Agent Info:');
  console.log('Owner:', await tradingAgent.owner());
  console.log('Swap Router:', await tradingAgent.swapRouter());
  console.log('Pool Fee:', await tradingAgent.poolFee());

  // Try a static call first to see the revert reason
  const classificationId = '0x48c2da7b256463c523a343d88e489cfcf471d4a7264109c670d356d6095df645';

  console.log('\nAttempting static call to reactToNews...');
  try {
    await tradingAgent.reactToNews.staticCall(classificationId);
    console.log('✅ Static call succeeded!');
  } catch (error) {
    console.log('❌ Static call failed with error:', error.message);
    if (error.data) {
      console.log('Error data:', error.data);
    }
  }
}

testSwap().catch(console.error);
