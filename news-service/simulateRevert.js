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

const classificationId = '0xb98b31be6d9dfca1069eecc14159b73b121138ce6c552e5f8d8f3fd31bdb7446';

console.log('🔍 Simulating transaction to get revert reason...\\n');

try {
  // Use staticCall to simulate without actually sending the transaction
  await agent.reactToNews.staticCall(classificationId);
  console.log('✅ Transaction would succeed!');
} catch (error) {
  console.log('❌ Transaction would revert:');
  console.log(`   Error: ${error.message}`);

  if (error.data) {
    console.log(`   Data: ${error.data}`);
  }

  // Try to decode revert reason
  if (error.reason) {
    console.log(`   Reason: ${error.reason}`);
  }

  // Check if it's a custom error
  if (error.error && error.error.data) {
    console.log(`   Error data: ${error.error.data}`);
  }
}
