import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

async function evaluateTrade() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  const TRADING_AGENT = '0x08E8BDDf2294fcd3C516d9ec85e37568A68185F2';
  const CLASSIFICATION_ID = '0x48c2da7b256463c523a343d88e489cfcf471d4a7264109c670d356d6095df645';

  const agent = new ethers.Contract(
    TRADING_AGENT,
    ['function evaluateTradeProfitability(bytes32 classificationId) external'],
    wallet
  );

  console.log('Evaluating trade profitability...');
  const tx = await agent.evaluateTradeProfitability(CLASSIFICATION_ID);
  console.log('TX:', tx.hash);
  await tx.wait();
  console.log('✅ Evaluated!');
}

evaluateTrade().catch(console.error);
