import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Env
const RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const pkRaw = (process.env.ORACLE_PRIVATE_KEY || '').replace(/["'\s]/g, '');
const body = pkRaw.startsWith('0x') ? pkRaw.slice(2) : pkRaw;
const hexOnly = body.replace(/[^0-9a-fA-F]/g, '');
const PRIVATE_KEY = '0x' + hexOnly;
const AGENT_ADDRESS = process.env.POLYGON_AGENT;
const NEW_MIN_REP = process.env.POLYGON_MIN_REPUTATION ? Number(process.env.POLYGON_MIN_REPUTATION) : 0;
const NEW_MIN_CONF = process.env.POLYGON_MIN_CONFIDENCE ? Number(process.env.POLYGON_MIN_CONFIDENCE) : 60;
const NEW_TRADE_SIZE = process.env.POLYGON_TRADE_SIZE_ETH || '0.005';

if (!PRIVATE_KEY || !AGENT_ADDRESS) {
  console.error('Missing ORACLE_PRIVATE_KEY or POLYGON_AGENT in environment');
  process.exit(1);
}

// Provider with extended timeout
const fetchReq = new ethers.FetchRequest(RPC_URL);
fetchReq.timeout = 180000;
const provider = new ethers.JsonRpcProvider(fetchReq, { name: 'matic', chainId: 137 }, { staticNetwork: true });
provider.polling = true;
provider.pollingInterval = 4000;

const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const agentAbi = [
  'function updateStrategy(uint256 _minOracleReputation, uint256 _minConfidence, uint256 _tradeSize) external',
  'function minOracleReputation() view returns (uint256)',
  'function minConfidence() view returns (uint256)',
  'function tradeSize() view returns (uint256)',
  'function owner() view returns (address)'
];

const agent = new ethers.Contract(AGENT_ADDRESS, agentAbi, wallet);

async function main() {
  console.log('🔧 Updating Polygon agent strategy...\n');
  const [currentRep, currentConf, currentSize, owner] = await Promise.all([
    agent.minOracleReputation(),
    agent.minConfidence(),
    agent.tradeSize(),
    agent.owner()
  ]);

  console.log('📊 Current Strategy:');
  console.log(`   Min Oracle Reputation: ${currentRep}`);
  console.log(`   Min Confidence: ${currentConf}%`);
  console.log(`   Trade Size: ${ethers.formatEther(currentSize)} ETH`);
  console.log(`   Owner: ${owner}`);
  console.log(`   Wallet: ${wallet.address}`);

  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.error('\n❌ Wallet is not the owner of the agent');
    process.exit(1);
  }

  const newRep = NEW_MIN_REP;
  const newConf = NEW_MIN_CONF;
  const newSize = ethers.parseEther(NEW_TRADE_SIZE);

  console.log('\n🔄 Updating to:');
  console.log(`   Min Oracle Reputation: ${newRep}`);
  console.log(`   Min Confidence: ${newConf}%`);
  console.log(`   Trade Size: ${ethers.formatEther(newSize)} ETH`);

  // Retry submission with fee bump
  const maxAttempts = 3;
  const nonce = await provider.getTransactionCount(wallet.address, 'latest');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const fee = await provider.getFeeData();
      const bump = 1 + (attempt - 1) * 0.25;
      const maxPriorityFeePerGas = fee.maxPriorityFeePerGas
        ? BigInt(Math.ceil(Number(fee.maxPriorityFeePerGas) * bump))
        : 2_000_000_000n;
      const maxFeePerGas = fee.maxFeePerGas
        ? BigInt(Math.ceil(Number(fee.maxFeePerGas) * bump))
        : 30_000_000_000n;

      const tx = await agent.updateStrategy(newRep, newConf, newSize, {
        gasLimit: 300000n,
        type: 2,
        maxPriorityFeePerGas,
        maxFeePerGas,
        nonce
      });

      console.log(`\n📤 TX submitted: ${tx.hash}`);
      const receipt = await provider.waitForTransaction(tx.hash, 1, 180000);
      if (!receipt) throw new Error('Transaction wait timeout');
      console.log(`   ✅ Strategy updated! Gas used: ${receipt.gasUsed}`);
      console.log(`   🔗 https://polygonscan.com/tx/${tx.hash}`);
      return;
    } catch (err) {
      const msg = (err && err.message) ? err.message.toLowerCase() : '';
      console.warn(`   ❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxAttempts && (msg.includes('timeout') || msg.includes('network'))) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw err;
    }
  }
}

main().catch((e) => {
  console.error(`\n❌ Failed to update strategy: ${e.message}`);
  process.exit(1);
});
