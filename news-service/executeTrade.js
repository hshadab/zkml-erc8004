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

// Bearish classification ID
const classificationId = '0xa974311ee5145299ee22d948787b00dd6bef21c5d8f8bdde70ab2f67404cd0ce';

console.log('🐻 Executing BEARISH trade (sentiment=BAD, 60% confidence)...');
console.log(`   ID: ${classificationId}`);
console.log('');

try {
  const tx = await agent.reactToNews(classificationId, { gasLimit: 500000 });
  console.log(`   📤 TX submitted: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`   ✅ Trade executed! Gas used: ${receipt.gasUsed}`);
  console.log(`   🔗 https://sepolia.basescan.org/tx/${tx.hash}`);
  console.log('');
  console.log('🎉 This should be a REAL trade - agent should sell WETH for USDC!');
  console.log('✨ Refresh the UI at http://localhost:3001 to see the trade!');
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
