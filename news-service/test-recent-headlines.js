import { extractFeatures, mapFeaturesToClassification } from './src/featureExtractor.js';

const recentHeadlines = [
  { headline: 'HBAR Drops 5.4% to $0.1695 as Key Support Crumbles', expected: 'BAD' },
  { headline: 'Crypto Markets Today: Zcash Surges to Lead Altcoin Market as Bitcoin Stalls Near $108K', expected: 'MIXED/GOOD' },
  { headline: 'Galaxy Digital Price Targets Hiked Across Street Following Record 3Q Earnings', expected: 'GOOD' },
  { headline: 'Bitcoin Fear and Greed Index May Signal Prolonged Market Anxiety', expected: 'BAD/NEUTRAL' },
  { headline: 'Deribit, Komainu Join Forces for Institutional In-Custody Crypto Trading', expected: 'GOOD' },
  { headline: 'Coinbase Is Building Private Transactions for Base, CEO Brian Armstrong Says', expected: 'GOOD' },
  { headline: 'Crypto Prime Broker FalconX to Buy ETF Provider 21Shares: WSJ', expected: 'GOOD' }
];

const sentimentLabels = ['BAD', 'NEUTRAL', 'GOOD'];

console.log('='.repeat(80));
console.log('SENTIMENT CLASSIFIER ACCURACY TEST');
console.log('Testing Recent Headlines from Production');
console.log('='.repeat(80));
console.log();

let correctCount = 0;
let totalCount = recentHeadlines.length;

recentHeadlines.forEach((item, i) => {
  const features = extractFeatures(item.headline);
  const result = mapFeaturesToClassification(features);
  const predicted = sentimentLabels[result.sentiment];

  // Check if prediction matches any of the expected values
  const isCorrect = item.expected.includes(predicted);
  if (isCorrect) correctCount++;

  console.log(`${i+1}. "${item.headline}"`);
  console.log(`   Expected: ${item.expected.padEnd(15)} | Predicted: ${predicted} (${result.confidence}%)`);
  console.log(`   Features: VADER=${features[0].toFixed(2)}, Positive=${features[3]}, Negative=${features[4]}`);
  console.log(`   Status: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
  console.log();
});

const accuracy = (correctCount / totalCount * 100).toFixed(1);
console.log('='.repeat(80));
console.log(`ACCURACY: ${correctCount}/${totalCount} correct (${accuracy}%)`);
console.log('='.repeat(80));
console.log();

// Analyze problematic patterns
console.log('ANALYSIS:');
console.log('-'.repeat(80));

const problematicHeadlines = recentHeadlines.filter((item, i) => {
  const features = extractFeatures(item.headline);
  const result = mapFeaturesToClassification(features);
  const predicted = sentimentLabels[result.sentiment];
  return !item.expected.includes(predicted);
});

if (problematicHeadlines.length > 0) {
  console.log('❌ Misclassified Headlines:');
  problematicHeadlines.forEach(item => {
    const features = extractFeatures(item.headline);
    const result = mapFeaturesToClassification(features);
    console.log(`   • "${item.headline}"`);
    console.log(`     Expected ${item.expected}, got ${sentimentLabels[result.sentiment]}`);
  });
} else {
  console.log('✅ All headlines classified correctly!');
}

console.log();
console.log('TRADING IMPACT:');
console.log('-'.repeat(80));
const goodCount = recentHeadlines.filter(item => {
  const features = extractFeatures(item.headline);
  const result = mapFeaturesToClassification(features);
  return result.sentiment === 2; // GOOD
}).length;

console.log(`• ${goodCount}/${totalCount} headlines classified as GOOD (${(goodCount/totalCount*100).toFixed(1)}%)`);
console.log(`• Result: ${goodCount > totalCount/2 ? 'BUYING' : 'SELLING/HOLDING'} bias`);
console.log();
console.log('⚠️  PROBLEM: If most news is classified as GOOD but market is sideways/down,');
console.log('    the agent will keep buying ETH and losing money to slippage and fees!');
console.log();
