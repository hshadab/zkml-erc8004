/**
 * Test: Post GOOD_NEWS classification to trigger autonomous USDC→WETH swap
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  const oracleABI = [
    'function postClassification(string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash) external returns (bytes32)',
    'event NewsClassified(bytes32 indexed classificationId, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 indexed oracleTokenId)'
  ];

  const oracle = new ethers.Contract(
    process.env.NEWS_ORACLE_CONTRACT_ADDRESS,
    oracleABI,
    wallet
  );

  console.log('\n🧪 Testing GOOD_NEWS → BUY ETH autonomous trade...\n');

  // Mock zkML proof hash
  const proofHash = ethers.keccak256(ethers.toUtf8Bytes('bitcoin-etf-approval-proof-' + Date.now()));

  const headline = "Bitcoin ETF approval sends crypto markets to all-time highs";
  const sentiment = 2; // GOOD_NEWS
  const confidence = 93;

  console.log(`📰 Classification Details:`);
  console.log(`   Headline: ${headline}`);
  console.log(`   Sentiment: GOOD_NEWS (${sentiment})`);
  console.log(`   Confidence: ${confidence}%`);
  console.log(`   Proof Hash: ${proofHash}\n`);

  console.log('📝 Posting classification to oracle...');
  const tx = await oracle.postClassification(headline, sentiment, confidence, proofHash, {
    gasLimit: 500000
  });

  console.log(`   TX Hash: ${tx.hash}`);
  console.log(`   🔗 BaseScan: https://basescan.org/tx/${tx.hash}\n`);

  console.log('⏳ Waiting for confirmation...');
  const receipt = await tx.wait();

  console.log(`✅ Classification posted! Block: ${receipt.blockNumber}`);
  console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);

  // Extract classificationId from event
  const event = receipt.logs.find(log => {
    try {
      return oracle.interface.parseLog(log)?.name === 'NewsClassified';
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = oracle.interface.parseLog(event);
    const classificationId = parsed.args[0];
    console.log(`🆔 Classification ID: ${classificationId}\n`);
  }

  console.log('🎧 BaseTrader should now detect this event and execute autonomous swap...');
  console.log('📊 Expected trade: Swap $2.50 USDC → WETH (10% of 25 USDC balance)');
  console.log('📺 Check BaseTrader logs and UI at http://localhost:3001\n');
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
