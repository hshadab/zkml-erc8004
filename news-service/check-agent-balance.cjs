const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
  
  const AGENT_ADDRESS = '0x2B2c8F40b7Ee5064f55f1FF91a200264DA88915f';
  const WPOL = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
  const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  
  console.log('Checking TradingAgent balances...\n');
  
  // Native POL balance
  const nativeBalance = await provider.getBalance(AGENT_ADDRESS);
  console.log('Native POL:', ethers.formatEther(nativeBalance));
  
  // WPOL balance
  const wpolABI = ['function balanceOf(address) external view returns (uint256)'];
  const wpol = new ethers.Contract(WPOL, wpolABI, provider);
  const wpolBalance = await wpol.balanceOf(AGENT_ADDRESS);
  console.log('WPOL:', ethers.formatEther(wpolBalance));
  
  // USDC balance
  const usdc = new ethers.Contract(USDC, wpolABI, provider);
  const usdcBalance = await usdc.balanceOf(AGENT_ADDRESS);
  console.log('USDC:', ethers.formatUnits(usdcBalance, 6));
  
  if (wpolBalance === 0n) {
    console.log('\n❌ ISSUE FOUND: Agent has 0 WPOL!');
    console.log('The contract needs WPOL (wrapped POL) to trade on QuickSwap.');
    console.log('Native POL needs to be wrapped first.');
  }
}

main().catch(console.error);
