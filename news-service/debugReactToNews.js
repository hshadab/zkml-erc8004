import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const AGENT_ADDRESS = '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';
const ORACLE_ADDRESS = '0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Classification ID from our bearish test
const classificationId = '0xa974311ee5145299ee22d948787b00dd6bef21c5d8f8bdde70ab2f67404cd0ce';

console.log('🔍 Debug reactToNews Transaction...\n');

// Get classification details
const oracleAbi = [
  'function getClassification(bytes32 classificationId) external view returns (tuple(string headline, uint8 sentiment, uint8 confidence, uint256 oracleTokenId, uint256 timestamp, bytes32 proofId) classification)'
];
const oracle = new ethers.Contract(ORACLE_ADDRESS, oracleAbi, provider);

const classification = await oracle.getClassification(classificationId);
console.log('📰 Classification:');
console.log(`   Headline: ${classification.headline}`);
console.log(`   Sentiment: ${classification.sentiment} (0=GOOD, 1=BAD, 2=NEUTRAL)`);
console.log(`   Confidence: ${classification.confidence}%`);
console.log(`   Oracle Token ID: ${classification.oracleTokenId}`);
console.log('');

// Check agent's minConfidence
const agentAbi = [
  'function minConfidence() view returns (uint256)',
  'function minOracleReputation() view returns (uint256)',
  'function processedClassifications(bytes32) view returns (bool)'
];
const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, provider);

const minConf = await agent.minConfidence();
const minRep = await agent.minOracleReputation();
const isProcessed = await agent.processedClassifications(classificationId);

console.log('⚙️  Agent Requirements:');
console.log(`   Min Confidence: ${minConf}%`);
console.log(`   Min Oracle Reputation: ${minRep}`);
console.log(`   Already Processed: ${isProcessed}`);
console.log('');

console.log('✅ Checks:');
console.log(`   Sentiment is BAD (1)? ${classification.sentiment === 1 ? '✅ YES' : '❌ NO'}`);
console.log(`   Confidence (${classification.confidence}) >= minConfidence (${minConf})? ${classification.confidence >= minConf ? '✅ YES' : '❌ NO'}`);
console.log(`   Already processed? ${isProcessed ? '❌ YES (will fail!)' : '✅ NO (good)'}`);
console.log('');

if (classification.confidence < minConf) {
  console.log('🚨 PROBLEM: Confidence too low!');
  console.log(`   Classification has ${classification.confidence}% but agent requires ${minConf}%`);
  console.log('');
  console.log('💡 Fix: Update agent minConfidence to 60 or lower:');
  console.log('   agent.updateStrategy(250, 60, <tradeSize>)');
} else if (classification.sentiment !== 1) {
  console.log('🚨 PROBLEM: Sentiment is not BAD (bearish)!');
  console.log(`   Expected sentiment=1 (BAD), got sentiment=${classification.sentiment}`);
} else {
  console.log('✅ All checks pass - trade should have executed!');
  console.log('   The issue must be in the swap itself.');
}
