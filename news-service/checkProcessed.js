import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const AGENT_ADDRESS = '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';
const ORACLE_ADDRESS = '0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a';

const provider = new ethers.JsonRpcProvider(RPC_URL);

const classificationId = '0xb98b31be6d9dfca1069eecc14159b73b121138ce6c552e5f8d8f3fd31bdb7446';

console.log('🔍 Checking classification status...\\n');
console.log(`Classification ID: ${classificationId}`);
console.log('');

// Get classification from oracle
const oracleAbi = [
  'function getClassification(bytes32) view returns (tuple(bytes32 id, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId))'
];
const oracle = new ethers.Contract(ORACLE_ADDRESS, oracleAbi, provider);

try {
  const classification = await oracle.getClassification(classificationId);
  console.log('📰 Classification:');
  console.log(`   Headline: ${classification.headline}`);
  console.log(`   Sentiment: ${classification.sentiment} (0=BAD, 1=NEUTRAL, 2=GOOD)`);
  console.log(`   Confidence: ${classification.confidence}%`);
  console.log(`   Oracle Token ID: ${classification.oracleTokenId}`);
  console.log('');

  // Check if already processed
  const agentAbi = [
    'function processedClassifications(bytes32) view returns (bool)',
    'function minConfidence() view returns (uint256)',
    'function minOracleReputation() view returns (uint256)'
  ];
  const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, provider);

  const isProcessed = await agent.processedClassifications(classificationId);
  const minConf = await agent.minConfidence();
  const minRep = await agent.minOracleReputation();

  console.log('⚙️  Agent State:');
  console.log(`   Already Processed: ${isProcessed ? '❌ YES (will revert!)' : '✅ NO (good)'}`);
  console.log(`   Min Confidence: ${minConf}%`);
  console.log(`   Min Reputation: ${minRep}`);
  console.log('');

  console.log('✅ Validation:');
  console.log(`   Sentiment is BAD (0)? ${classification.sentiment === 0 ? '✅ YES' : '❌ NO'}`);
  console.log(`   Confidence (${classification.confidence}) >= minConfidence (${minConf})? ${classification.confidence >= minConf ? '✅ YES' : '❌ NO'}`);
  console.log(`   Not processed yet? ${!isProcessed ? '✅ YES' : '❌ NO - THIS IS THE ISSUE!'}`);

  if (isProcessed) {
    console.log('');
    console.log('🚨 PROBLEM: This classification has already been processed!');
    console.log('   The contract prevents duplicate trades on the same classification.');
    console.log('   You need to create a NEW classification to test another trade.');
  }

} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}
