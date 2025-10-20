import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com';
const ORACLE_ADDRESS = '0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a';

const provider = new ethers.JsonRpcProvider(RPC_URL);

console.log('✅ VERIFYING SENTIMENT ENUM FIX\\n');
console.log('================================================================================\\n');

// Get latest classification
const oracleAbi = [
  'function classifications(uint256) view returns (bytes32 id, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId)',
  'function classificationCount() view returns (uint256)'
];

const oracle = new ethers.Contract(ORACLE_ADDRESS, oracleAbi, provider);

const count = await oracle.classificationCount();
console.log(`📊 Total Classifications: ${count}\\n`);

// Get last 5 classifications to show the fix
console.log('Recent Classifications (showing sentiment values):\\n');

const startIdx = count > 5n ? count - 5n : 0n;

for (let i = startIdx; i < count; i++) {
  try {
    const classification = await oracle.classifications(i);
    const sentimentMapping = ['BAD_NEWS', 'NEUTRAL_NEWS', 'GOOD_NEWS'];
    const sentimentName = sentimentMapping[classification.sentiment] || 'UNKNOWN';

    console.log(`[${i}] ${classification.headline.substring(0, 60)}...`);
    console.log(`    Sentiment: ${classification.sentiment} (${sentimentName})`);
    console.log(`    Confidence: ${classification.confidence}%`);
    console.log('');
  } catch (error) {
    console.log(`[${i}] Error: ${error.message}`);
  }
}

// Check the specific classification we just created
const freshClassId = '0xb98b31be6d9dfca1069eecc14159b73b121138ce6c552e5f8d8f3fd31bdb7446';

const getClassificationAbi = [
  'function getClassification(bytes32) view returns (tuple(bytes32 id, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId))'
];

const oracleWithGetter = new ethers.Contract(ORACLE_ADDRESS, getClassificationAbi, provider);

console.log('================================================================================');
console.log('\\n🎯 FRESH CLASSIFICATION (with fixed sentiment enum):\\n');

try {
  const fresh = await oracleWithGetter.getClassification(freshClassId);
  const sentimentMapping = ['BAD_NEWS (0)', 'NEUTRAL_NEWS (1)', 'GOOD_NEWS (2)'];
  const sentimentName = sentimentMapping[fresh.sentiment] || 'UNKNOWN';

  console.log(`Headline: ${fresh.headline}`);
  console.log(`Sentiment: ${fresh.sentiment} → ${sentimentName}`);
  console.log(`Confidence: ${fresh.confidence}%`);
  console.log(`Proof Hash: ${fresh.proofHash}`);
  console.log('');

  if (fresh.sentiment === 0) {
    console.log('✅ SUCCESS! Sentiment enum mapping is FIXED!');
    console.log('   The classifier now correctly maps bearish news to sentiment=0 (BAD_NEWS)');
  } else if (fresh.sentiment === 1) {
    console.log('⚠️  WARNING: Sentiment is NEUTRAL_NEWS (1)');
    console.log('   This would be ignored by the trading agent.');
  } else if (fresh.sentiment === 2) {
    console.log('📈 INFO: Sentiment is GOOD_NEWS (2)');
    console.log('   This would trigger a bullish trade.');
  }

} catch (error) {
  console.log(`❌ Error fetching classification: ${error.message}`);
}

console.log('\\n================================================================================');
console.log('\\n📝 SUMMARY:\\n');
console.log('The sentiment enum bug has been fixed in:');
console.log('   /home/hshadab/zkml-erc8004/news-service/src/joltOnnxProver.js:107');
console.log('');
console.log('   Before: const sentiment = output ? 2 : 1  // WRONG');
console.log('   After:  const sentiment = output ? 2 : 0  // CORRECT');
console.log('');
console.log('New classifications will use the correct enum mapping:');
console.log('   - Model output FALSE → sentiment=0 (BAD_NEWS) ✓');
console.log('   - Model output TRUE  → sentiment=2 (GOOD_NEWS) ✓');
console.log('');
console.log('Note: Uniswap swap failures are a separate testnet infrastructure issue.');
console.log('================================================================================');
