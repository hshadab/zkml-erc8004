import vader from 'vader-sentiment';

/**
 * Extract features from news headline for classification
 * Simplified approach: 3 core features
 *
 * Features:
 * 1. Sentiment score (-1.0 to 1.0)
 * 2. Positive keywords flag (0 or 1)
 * 3. Negative keywords flag (0 or 1)
 */

const POSITIVE_KEYWORDS = [
  'approve', 'approved', 'adoption', 'bullish', 'surge', 'rally',
  'gain', 'rise', 'up', 'breakthrough', 'launch', 'partnership',
  'integration', 'etf', 'institutional', 'buy', 'buying'
];

const NEGATIVE_KEYWORDS = [
  'hack', 'hacked', 'exploit', 'stolen', 'crash', 'collapse',
  'ban', 'banned', 'regulation', 'sec', 'fraud', 'scam',
  'down', 'fall', 'plunge', 'bearish', 'warning', 'risk'
];

/**
 * Extract features from headline
 * @param {string} headline - News headline
 * @returns {Array<number>} Feature vector [sentiment, hasPositive, hasNegative]
 */
export function extractFeatures(headline) {
  const lower = headline.toLowerCase();

  // 1. Sentiment score using VADER
  const sentimentResult = vader.SentimentIntensityAnalyzer.polarity_scores(headline);
  const sentiment = sentimentResult.compound; // Range: -1.0 to 1.0

  // 2. Check for positive keywords
  const hasPositive = POSITIVE_KEYWORDS.some(keyword => lower.includes(keyword)) ? 1 : 0;

  // 3. Check for negative keywords
  const hasNegative = NEGATIVE_KEYWORDS.some(keyword => lower.includes(keyword)) ? 1 : 0;

  return [sentiment, hasPositive, hasNegative];
}

/**
 * Map features to classification (simple rule-based for now)
 * In production, this would use the ONNX model
 *
 * @param {Array<number>} features - Feature vector
 * @returns {Object} Classification result
 */
export function mapFeaturesToClassification(features) {
  const [sentiment, hasPositive, hasNegative] = features;

  // Simple heuristic classification
  let classification = 1; // NEUTRAL
  let confidence = 60;

  if (hasNegative === 1 || sentiment < -0.3) {
    classification = 0; // BAD_NEWS
    confidence = Math.min(100, 60 + Math.abs(sentiment * 40));
  } else if (hasPositive === 1 || sentiment > 0.3) {
    classification = 2; // GOOD_NEWS
    confidence = Math.min(100, 60 + Math.abs(sentiment * 40));
  }

  // Return classification with probabilities
  const probabilities = [0, 0, 0];
  probabilities[classification] = confidence / 100;

  // Distribute remaining probability
  const remaining = (100 - confidence) / 200;
  for (let i = 0; i < 3; i++) {
    if (i !== classification) {
      probabilities[i] = remaining;
    }
  }

  return {
    sentiment: classification, // 0=BAD, 1=NEUTRAL, 2=GOOD
    confidence: Math.round(confidence),
    probabilities,
    features
  };
}

/**
 * Test the feature extraction
 */
export function testFeatureExtraction() {
  const testHeadlines = [
    "SEC approves spot Bitcoin ETF",
    "Major crypto exchange hacked, $500M stolen",
    "Bitcoin price remains stable amid sideways trading",
    "Ethereum upgrade launches successfully",
    "Regulatory crackdown threatens crypto industry"
  ];

  console.log('Testing Feature Extraction:\n');

  testHeadlines.forEach(headline => {
    const features = extractFeatures(headline);
    const result = mapFeaturesToClassification(features);

    console.log(`Headline: "${headline}"`);
    console.log(`Features: [${features.map(f => f.toFixed(2)).join(', ')}]`);
    console.log(`Classification: ${['BAD', 'NEUTRAL', 'GOOD'][result.sentiment]}`);
    console.log(`Confidence: ${result.confidence}%`);
    console.log(`Probabilities: [${result.probabilities.map(p => (p * 100).toFixed(1) + '%').join(', ')}]\n`);
  });
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFeatureExtraction();
}
