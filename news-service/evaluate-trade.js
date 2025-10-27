import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function transferToNew() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  const OLD_CONTRACT = '0x08E8BDDf2294fcd3C516d9ec85e37568A68185F2';
  const NEW_CONTRACT = '0x3a757Bd776A439E1CBAB7AC652145fF4442444fA';
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  const oldAgent = new ethers.Contract(
    OLD_CONTRACT,
    [
      'function emergencyWithdraw(address token, uint256 amount) external',
      'function getPortfolio() view returns (uint256, uint256)'
    ],
    wallet
  );

  // Check balances
  const [ethBalance, usdcBalance] = await oldAgent.getPortfolio();
  const nativeEth = await provider.getBalance(OLD_CONTRACT);

  console.log('Old contract balances:');
  console.log('  Native ETH:', ethers.formatEther(nativeEth));
  console.log('  USDC:', ethers.formatUnits(usdcBalance, 6));

  // Withdraw ETH
  if (nativeEth > 0n) {
    console.log('\nWithdrawing ETH...');
    const ethTx = await oldAgent.emergencyWithdraw(ethers.ZeroAddress, nativeEth);
    await ethTx.wait();
    console.log('✅ ETH withdrawn');
  }

  // Withdraw USDC
  if (usdcBalance > 0n) {
    console.log('\nWithdrawing USDC...');
    const usdcTx = await oldAgent.emergencyWithdraw(USDC, usdcBalance);
    await usdcTx.wait();
    console.log('✅ USDC withdrawn');
  }

  // Send to new contract
  if (nativeEth > 0n) {
    console.log('\nSending ETH to new contract...');
    const sendEthTx = await wallet.sendTransaction({
      to: NEW_CONTRACT,
      value: nativeEth
    });
    await sendEthTx.wait();
    console.log('✅ ETH sent');
  }

  if (usdcBalance > 0n) {
    console.log('\nSending USDC to new contract...');
    const usdcContract = new ethers.Contract(
      USDC,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      wallet
    );
    const sendUsdcTx = await usdcContract.transfer(NEW_CONTRACT, usdcBalance);
    await sendUsdcTx.wait();
    console.log('✅ USDC sent');
  }

  // Verify new balances
  const newAgent = new ethers.Contract(
    NEW_CONTRACT,
    ['function getPortfolio() view returns (uint256, uint256)'],
    provider
  );

  const [newEth, newUsdc] = await newAgent.getPortfolio();
  const newNativeEth = await provider.getBalance(NEW_CONTRACT);

  console.log('\n✅ New contract funded:');
  console.log('  Native ETH:', ethers.formatEther(newNativeEth));
  console.log('  USDC:', ethers.formatUnits(newUsdc, 6));
}

transferToNew().catch(console.error);
