/**
 * Simple Manual Trading Script
 * Executes trades on all unprocessed classifications
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const ORACLE_ADDRESS = process.env.NEWS_ORACLE_CONTRACT_ADDRESS;
const AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS;

console.log('\n🤖 Simple Trading Script');
console.log('========================\n');

// Provider with explicit timeout
const fetchRequest = new ethers.FetchRequest(RPC_URL);
fetchRequest.timeout = 30000; // 30 second timeout
const provider = new ethers.JsonRpcProvider(fetchRequest);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

console.log(`Wallet: ${wallet.address}`);
console.log(`Oracle: ${ORACLE_ADDRESS}`);
console.log(`Agent: ${AGENT_ADDRESS}\n`);

// Contract ABIs
const oracleAbi = [
  'function getClassificationCount() external view returns (uint256)',
  'function getClassificationIdByIndex(uint256 index) external view returns (bytes32)'
];

const agentAbi = [
  'function reactToNews(bytes32 classificationId) external',
  'function processedClassifications(bytes32) external view returns (bool)',
  'function totalTradesExecuted() external view returns (uint256)',
  'function isPaused() external view returns (bool)'
];

const oracle = new ethers.Contract(ORACLE_ADDRESS, oracleAbi, wallet);
const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, wallet);

async function main() {
  console.log('⏳ Getting classification count (this may take ~5s)...');
  const count = await oracle.getClassificationCount();
  console.log(`📊 Total classifications: ${count.toString()}\n`);

  let tradesExecuted = 0;

  for (let i = 0; i < Number(count); i++) {
    console.log(`\n--- Classification #${i + 1} ---`);
    console.log('   🔍 Fetching classification ID...');

    try {
      // Get the actual classification ID by index
      const classificationId = await oracle.getClassificationIdByIndex(i);
      console.log(`   📋 ID: ${classificationId}`);

      console.log('   🎯 Executing trade...');
      const tx = await agent.reactToNews(classificationId, {
        gasLimit: 500000
      });

      console.log(`   📤 TX: ${tx.hash}`);
      console.log('   ⏳ Waiting for confirmation...');

      const receipt = await tx.wait();

      console.log(`   ✅ Trade executed!`);
      console.log(`   📦 Block: ${receipt.blockNumber}`);
      console.log(`   ⛽ Gas: ${receipt.gasUsed.toString()}`);
      console.log(`   🔗 https://sepolia.basescan.org/tx/${tx.hash}`);

      tradesExecuted++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n\n✨ Complete! Executed ${tradesExecuted} trades\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
