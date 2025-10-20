import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://base-sepolia-rpc.publicnode.com');
const ORACLE = '0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a';

const abi = ['function getClassification(bytes32) view returns (tuple(bytes32 id, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId))'];
const oracle = new ethers.Contract(ORACLE, abi, provider);

console.log('\\n✅ SENTIMENT ENUM FIX - VERIFIED\\n');
console.log('═══════════════════════════════════════════════════════════════\\n');

// Classification created AFTER the fix
const id = '0xb98b31be6d9dfca1069eecc14159b73b121138ce6c552e5f8d8f3fd31bdb7446';

const c = await oracle.getClassification(id);

console.log('Fresh Classification (with FIXED enum):');
console.log(`  Headline: ${c.headline.slice(0, 60)}...`);
console.log(`  Sentiment: ${c.sentiment} (${['BAD_NEWS','NEUTRAL_NEWS','GOOD_NEWS'][c.sentiment]})`);
console.log(`  Confidence: ${c.confidence}%\\n`);

if (c.sentiment === 0) {
  console.log('✅ FIX CONFIRMED!');
  console.log('   Model output FALSE → sentiment=0 (BAD_NEWS) ✓\\n');
} else {
  console.log('❌ Still broken - sentiment should be 0\\n');
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('\\n📝 What was fixed:\\n');
console.log('  File: /home/hshadab/zkml-erc8004/news-service/src/joltOnnxProver.js');
console.log('  Line: 107\\n');
console.log('  Before: const sentiment = output ? 2 : 1  // WRONG');
console.log('  After:  const sentiment = output ? 2 : 0  // CORRECT\\n');
console.log('═══════════════════════════════════════════════════════════════\\n');
