import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const AGENT_ADDRESS = '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const agentAbi = [
  'function updateStrategy(uint256 _minOracleReputation, uint256 _minConfidence, uint256 _tradeSize) external',
  'function minOracleReputation() view returns (uint256)',
  'function minConfidence() view returns (uint256)',
  'function tradeSize() view returns (uint256)',
  'function owner() view returns (address)'
];

const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, wallet);

console.log('🔧 Updating agent strategy to bypass swap issue...\\n');

// Check current settings
const [currentRep, currentConf, currentSize, owner] = await Promise.all([
  agent.minOracleReputation(),
  agent.minConfidence(),
  agent.tradeSize(),
  agent.owner()
]);

console.log('📊 Current Strategy:');
console.log(`   Min Oracle Reputation: ${currentRep}`);
console.log(`   Min Confidence: ${currentConf}%`);
console.log(`   Trade Size: ${ethers.formatEther(currentSize)} ETH`);
console.log(`   Owner: ${owner}`);
console.log(`   Wallet: ${wallet.address}`);
console.log('');

if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
  console.log('❌ ERROR: Wallet is not the owner of the agent!');
  console.log('   Cannot update strategy.');
  process.exit(1);
}

// Update strategy: Keep reputation at 0, confidence at 60, but try smaller trade size
const newRep = 0;  // Allow any oracle
const newConf = 50;  // Lower confidence threshold
const newSize = ethers.parseEther('0.005');  // Smaller trade size (0.005 ETH instead of 0.01)

console.log('🔄 Updating to:');
console.log(`   Min Oracle Reputation: ${newRep} (allow all oracles)`);
console.log(`   Min Confidence: ${newConf}% (lower threshold)`);
console.log(`   Trade Size: ${ethers.formatEther(newSize)} ETH (smaller trades)`);
console.log('');

try {
  const tx = await agent.updateStrategy(newRep, newConf, newSize);
  console.log(`   📤 TX submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`   ✅ Strategy updated! Gas used: ${receipt.gasUsed}`);
  console.log(`   🔗 https://sepolia.basescan.org/tx/${tx.hash}`);
  console.log('');
  console.log('✅ Agent now configured with lower requirements');

} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
