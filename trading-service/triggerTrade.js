/**
 * Manually trigger a trade for testing
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
const TRADER_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY; // Reuse oracle key for demo
const TRADING_AGENT_ADDRESS = '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';

const TRADING_AGENT_ABI = [
  'function reactToNews(uint256 classificationId) external',
  'function processedClassifications(uint256) external view returns (bool)',
  'function getTradeStats() external view returns (uint256, uint256, uint256, uint256)',
  'function isPaused() external view returns (bool)'
];

async function triggerTrade() {
  console.log('🎯 Manually Triggering Trade...\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(TRADER_PRIVATE_KEY, provider);
  const agentContract = new ethers.Contract(TRADING_AGENT_ADDRESS, TRADING_AGENT_ABI, wallet);

  // Check agent status
  const isPaused = await agentContract.isPaused();
  console.log(`Agent Status: ${isPaused ? 'PAUSED ⏸️' : 'ACTIVE ✅'}`);

  const stats = await agentContract.getTradeStats();
  console.log(`Current Trades: ${stats[0].toString()}\n`);

  // Try classification IDs 1-9 (since we have 9 classifications)
  console.log('Checking which classifications need trading...');

  for (let classId = 1; classId <= 9; classId++) {
    try {
      const isProcessed = await agentContract.processedClassifications(classId);
      console.log(`  Classification #${classId}: ${isProcessed ? 'Already traded ✓' : 'Ready for trade 🎯'}`);

      if (!isProcessed) {
        console.log(`\n⚡ Triggering trade for classification #${classId}...`);
        const tx = await agentContract.reactToNews(classId, {
          gasLimit: 500000
        });

        console.log(`   TX submitted: ${tx.hash}`);
        console.log(`   Waiting for confirmation...`);

        const receipt = await tx.wait();
        console.log(`   ✅ Trade executed! Block: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

        // Check updated stats
        const newStats = await agentContract.getTradeStats();
        console.log(`\n📊 Updated Stats:`);
        console.log(`   Total Trades: ${newStats[0].toString()}`);
        console.log(`   Profitable: ${newStats[1].toString()}`);
        console.log(`   Unprofitable: ${newStats[2].toString()}`);

        console.log(`\n✨ Trade should now appear in UI at http://localhost:3001`);
        return;
      }
    } catch (error) {
      console.error(`   Error checking classification #${classId}: ${error.message}`);
    }
  }

  console.log('\n✅ All classifications have already been traded!');
}

triggerTrade().catch(console.error);
