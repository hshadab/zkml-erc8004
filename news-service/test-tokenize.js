import { promises as fs } from 'fs';

const VOCAB_PATH = '/home/hshadab/agentkit/jolt-atlas/onnx-tracer/models/crypto_sentiment/vocab.json';

const vocabData = await fs.readFile(VOCAB_PATH, 'utf8');
const vocab = JSON.parse(vocabData);

function tokenize(text) {
  const words = text.toLowerCase().split(/\s+/);
  const tokens = words.map(word => vocab[word] || 0);
  const matched = tokens.filter(t => t !== 0);
  return {words, tokens, matched};
}

const headlines = [
  'Bitcoin price surge great news',
  'Ethereum hack exploit vulnerability',
  'Crypto crash fraud investigation',
  'Bitcoin approval breakthrough gains',
  'Bitcoin surges past record high amid institutional demand',
];

console.log('Testing tokenization with crypto_sentiment vocabulary:\n');

headlines.forEach(h => {
  const result = tokenize(h);
  console.log(`"${h}"`);
  console.log(`  Words: [${result.words.join(', ')}]`);
  console.log(`  Tokens: [${result.tokens.join(', ')}]`);
  console.log(`  Matched: ${result.matched.length} words (${result.matched.join(', ')})`);
  const sentiment = result.matched.reduce((sum, t) => sum + (t < 31 ? 1 : -1), 0);
  console.log(`  Sentiment: ${sentiment > 0 ? 'GOOD' : 'BAD'} (score: ${sentiment})`);
  console.log();
});
