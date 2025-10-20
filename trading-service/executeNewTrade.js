import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const AGENT_ADDRESS = '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const agentAbi = [
  'function reactToNews(bytes32 classificationId) external'
];

const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, wallet);

// New classification ID
const classificationId = '0x6b9c51a969c5b1edd8a7b24478b3a3b14a237896980c028e249946693fa261c3';

console.log('🎯 Executing trade for new bullish classification...');
console.log(`   ID: ${classificationId}`);
console.log('');

try {
  const tx = await agent.reactToNews(classificationId, { gasLimit: 500000 });
  console.log(`   📤 TX submitted: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`   ✅ Trade executed! Gas used: ${receipt.gasUsed}`);
  console.log(`   🔗 https://sepolia.basescan.org/tx/${tx.hash}`);
  console.log('');
  console.log('✨ Check the UI dashboard - trade should now be visible!');
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
