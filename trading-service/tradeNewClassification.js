import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS;

const fetchRequest = new ethers.FetchRequest(RPC_URL);
fetchRequest.timeout = 30000;
const provider = new ethers.JsonRpcProvider(fetchRequest);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const agentAbi = [
  'function reactToNews(bytes32 classificationId) external'
];

const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, wallet);

const classificationId = '0xb742c96cd24b5aa099f0d4d657d7b449120e0288b7855aed789433629e1724c8';

console.log('🎯 Executing trade for new classification...');
console.log(`   ID: ${classificationId}`);

try {
  const tx = await agent.reactToNews(classificationId, { gasLimit: 500000 });
  console.log(`   📤 TX: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`   ✅ Trade executed!`);
  console.log(`   🔗 https://sepolia.basescan.org/tx/${tx.hash}`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
