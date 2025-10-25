import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

async function sendFunds() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  // Send 0.002 ETH to new trading agent
  console.log('Sending 0.002 ETH to new trading agent...');
  const tx = await wallet.sendTransaction({
    to: '0x42510Ab38351EDf65D2cD7dd970622f903d9CEd5',
    value: ethers.parseEther('0.002')
  });

  console.log('Transaction hash:', tx.hash);
  await tx.wait();
  console.log('✅ ETH sent successfully!');

  // Send 25 USDC to new trading agent
  console.log('\nYou need to manually send 25 USDC to: 0x42510Ab38351EDf65D2cD7dd970622f903d9CEd5');
}

sendFunds().catch(console.error);
