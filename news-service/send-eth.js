import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function sendEth() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  console.log('Sending 0.001 ETH to new contract...');
  const tx = await wallet.sendTransaction({
    to: '0x08E8BDDf2294fcd3C516d9ec85e37568A68185F2',
    value: ethers.parseEther('0.001')
  });

  console.log('Transaction:', tx.hash);
  await tx.wait();
  console.log('✅ ETH sent!');

  // Check balance
  const balance = await provider.getBalance('0x08E8BDDf2294fcd3C516d9ec85e37568A68185F2');
  console.log('Contract ETH balance:', ethers.formatEther(balance));
}

sendEth().catch(console.error);
