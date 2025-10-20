import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Env and sanitization
const RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const ORACLE_ADDRESS = process.env.POLYGON_ORACLE;
const pkRaw = (process.env.ORACLE_PRIVATE_KEY || '').replace(/["'\s]/g, '');
const body = pkRaw.startsWith('0x') ? pkRaw.slice(2) : pkRaw;
const hexOnly = body.replace(/[^0-9a-fA-F]/g, '');
const PRIVATE_KEY = '0x' + hexOnly;

if (!ORACLE_ADDRESS || !/^0x[0-9a-fA-F]{40}$/.test(ORACLE_ADDRESS)) {
  console.error('Missing or invalid POLYGON_ORACLE address in .env');
  process.exit(1);
}

// Provider with extended timeout/polling
const fetchReq = new ethers.FetchRequest(RPC_URL);
fetchReq.timeout = 180000;
const provider = new ethers.JsonRpcProvider(fetchReq, { name: 'matic', chainId: 137 }, { staticNetwork: true });
provider.polling = true;
provider.pollingInterval = 4000;

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const oracleAbi = [
  'function postClassification(string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash) external returns (bytes32)',
  'function getClassification(bytes32 id) view returns (tuple(bytes32 id, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId))'
];
const oracle = new ethers.Contract(ORACLE_ADDRESS, oracleAbi, wallet);

function sentimentFromText(text) {
  const lower = text.toLowerCase();
  const pos = /(approve|approved|etf|surge|rally|gain|rise|breakthrough|launch|partnership|integration|institutional|buy)/;
  const neg = /(hack|hacked|exploit|stolen|crash|collapse|ban|banned|regulation|fraud|scam|down|fall|plunge|bearish|warning|risk)/;
  if (neg.test(lower)) return 0; // BAD
  if (pos.test(lower)) return 2; // GOOD
  return 1; // NEUTRAL
}

async function main() {
  const headline = process.argv.slice(2).join(' ') || 'SEC approves spot Bitcoin ETF';
  const sentiment = sentimentFromText(headline);
  const baseConfidence = sentiment === 1 ? 65 : 80; // higher for strong signals
  const confidence = baseConfidence;
  const proofHash = '0x' + crypto.createHash('sha256').update(headline + Date.now()).digest('hex');

  console.log('Posting classification (quick path):');
  console.log('  Headline:', headline);
  console.log('  Sentiment:', sentiment, ['BAD','NEUTRAL','GOOD'][sentiment]);
  console.log('  Confidence:', confidence);
  console.log('  From:', wallet.address);

  const fee = await provider.getFeeData();
  const overrides = {
    gasLimit: 500000n,
    type: 2,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas || 2_000_000_000n,
    maxFeePerGas: fee.maxFeePerGas || 30_000_000_000n
  };

  const tx = await oracle.postClassification(headline, sentiment, confidence, proofHash, overrides);
  console.log('  TX:', tx.hash);
  const receipt = await provider.waitForTransaction(tx.hash, 1, 180000);
  const classification = await oracle.getClassification(
    // recompute ID as in contract? The contract returns stored by ID; simplest is to parse event, but free-tier limits may block
    // We can’t parse event here reliably; UI will fetch latest classification by index. Done.
    tx.hash // placeholder, not used by UI
  ).catch(() => null);
  console.log('  Receipt Status:', receipt && receipt.status);
}

main().catch(e => { console.error('Failed to post classification:', e.message); process.exit(1); });

