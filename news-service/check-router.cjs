const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
  
  const QUICKSWAP_V2_ROUTER = '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff';
  const WPOL = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
  const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  
  console.log('Checking QuickSwap V2 Router...');
  const routerCode = await provider.getCode(QUICKSWAP_V2_ROUTER);
  console.log('Router has code:', routerCode.length > 2);
  
  // Check factory address from router
  const routerABI = [
    'function factory() external view returns (address)',
    'function WETH() external view returns (address)'
  ];
  const router = new ethers.Contract(QUICKSWAP_V2_ROUTER, routerABI, provider);
  
  try {
    const factory = await router.factory();
    const weth = await router.WETH();
    console.log('Factory:', factory);
    console.log('WETH:', weth);
    
    // Check if pair exists
    const factoryABI = ['function getPair(address,address) external view returns (address)'];
    const factoryContract = new ethers.Contract(factory, factoryABI, provider);
    const pair = await factoryContract.getPair(WPOL, USDC);
    console.log('\nWPOL/USDC Pair:', pair);
    
    if (pair === ethers.ZeroAddress) {
      console.log('❌ Pair does not exist!');
    } else {
      const pairABI = ['function getReserves() external view returns (uint112,uint112,uint32)'];
      const pairContract = new ethers.Contract(pair, pairABI, provider);
      const reserves = await pairContract.getReserves();
      console.log('Reserves:', ethers.formatEther(reserves[0]), '/', ethers.formatUnits(reserves[1], 6));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main().catch(console.error);
