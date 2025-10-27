import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function transferFunds() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  const OLD_CONTRACT = "0xD2acC1aadF0854FFdFD1d1ccDD5aE19Cd6088512";
  const NEW_CONTRACT = '0x08E8BDDf2294fcd3C516d9ec85e37568A68185F2';
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  const oldTradingAgent = new ethers.Contract(
    OLD_CONTRACT,
    [
      'function emergencyWithdraw(address token, uint256 amount) external',
      'function getPortfolio() view returns (uint256, uint256)'
    ],
    wallet
  );

  // Check balances
  const [ethBalance, usdcBalance] = await oldTradingAgent.getPortfolio();
  console.log('Old contract balances:');
  console.log('  ETH:', ethers.formatEther(ethBalance));
  console.log('  USDC:', ethers.formatUnits(usdcBalance, 6));

  // Withdraw ETH (address(0) for ETH)
  console.log('\n1. Withdrawing ETH...');
  const ethTx = await oldTradingAgent.emergencyWithdraw(ethers.ZeroAddress, ethBalance);
  await ethTx.wait();
  console.log('✅ ETH withdrawn to owner wallet');

  // Withdraw USDC
  console.log('\n2. Withdrawing USDC...');
  const usdcTx = await oldTradingAgent.emergencyWithdraw(USDC, usdcBalance);
  await usdcTx.wait();
  console.log('✅ USDC withdrawn to owner wallet');

  // Now send to new contract
  console.log('\n3. Sending ETH to new contract...');
  const sendEthTx = await wallet.sendTransaction({
    to: NEW_CONTRACT,
    value: ethBalance
  });
  await sendEthTx.wait();
  console.log('✅ ETH sent to new contract');

  // Send USDC to new contract
  console.log('\n4. Sending USDC to new contract...');
  const usdcContract = new ethers.Contract(
    USDC,
    ['function transfer(address to, uint256 amount) returns (bool)'],
    wallet
  );
  const sendUsdcTx = await usdcContract.transfer(NEW_CONTRACT, usdcBalance);
  await sendUsdcTx.wait();
  console.log('✅ USDC sent to new contract');

  // Verify new contract balances
  const newTradingAgent = new ethers.Contract(
    NEW_CONTRACT,
    ['function getPortfolio() view returns (uint256, uint256)'],
    provider
  );

  const [newEthBalance, newUsdcBalance] = await newTradingAgent.getPortfolio();
  console.log('\n✅ New contract funded:');
  console.log('  ETH:', ethers.formatEther(newEthBalance));
  console.log('  USDC:', ethers.formatUnits(newUsdcBalance, 6));
}

transferFunds().catch(console.error);
