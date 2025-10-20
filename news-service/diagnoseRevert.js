import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const AGENT_ADDRESS = '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';
const ORACLE_ADDRESS = '0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a';
const REGISTRY_ADDRESS = '0xC9a94a1168eB7ad8146f26B8F5dFcdC50d0Eb33E';

const provider = new ethers.JsonRpcProvider(RPC_URL);

const classificationId = '0x4e663e1c58a7a22028714b8709a2b25873a7f2520c6f576bdfea2cdd2eb089a2';

console.log('🔍 Diagnosing transaction revert...\n');

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

  // Check oracle reputation
  const registryAbi = ['function getReputationScore(uint256 tokenId, string capability) view returns (uint256)'];
  const registry = new ethers.Contract(REGISTRY_ADDRESS, registryAbi, provider);

  const reputation = await registry.getReputationScore(classification.oracleTokenId, 'news_classification');
  console.log(`📊 Oracle Reputation: ${reputation}`);
  console.log('');

  // Check agent requirements
  const agentAbi = [
    'function minOracleReputation() view returns (uint256)',
    'function minConfidence() view returns (uint256)'
  ];
  const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, provider);

  const minRep = await agent.minOracleReputation();
  const minConf = await agent.minConfidence();

  console.log('⚙️  Agent Requirements:');
  console.log(`   Min Oracle Reputation: ${minRep}`);
  console.log(`   Min Confidence: ${minConf}%`);
  console.log('');

  console.log('✅ Validation:');
  console.log(`   Sentiment is BAD (0)? ${classification.sentiment === 0 ? '✅ YES' : '❌ NO'}`);
  console.log(`   Confidence (${classification.confidence}) >= minConfidence (${minConf})? ${classification.confidence >= minConf ? '✅ YES' : '❌ NO'}`);
  console.log(`   Oracle reputation (${reputation}) >= minOracleReputation (${minRep})? ${reputation >= minRep ? '✅ YES' : '❌ NO - THIS IS THE ISSUE!'}`);
  console.log('');

  if (reputation < minRep) {
    console.log('🚨 PROBLEM IDENTIFIED:');
    console.log(`   Oracle reputation (${reputation}) is below minimum required (${minRep})`);
    console.log('');
    console.log('💡 Solution: Update agent strategy to lower minOracleReputation to 0');
    console.log('   This will allow the demo to work without setting up full ERC-8004 reputation');
  }

} catch (error) {
  console.log(`❌ Error: ${error.message}`);
}
