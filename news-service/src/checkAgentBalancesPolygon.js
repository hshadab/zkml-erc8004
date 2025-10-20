import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const AGENT_ADDRESS = process.env.POLYGON_AGENT;

if (!AGENT_ADDRESS) {
  console.error('Missing POLYGON_AGENT in .env');
  process.exit(1);
}

// Polygon token addresses
const WMATIC = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const erc20Abi = [
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const maticBal = await provider.getBalance(AGENT_ADDRESS);

  const wmatic = new ethers.Contract(WMATIC, erc20Abi, provider);
  const usdc = new ethers.Contract(USDC, erc20Abi, provider);

  const [wmaticBal, usdcBal, sym1, sym2] = await Promise.all([
    wmatic.balanceOf(AGENT_ADDRESS),
    usdc.balanceOf(AGENT_ADDRESS),
    wmatic.symbol(),
    usdc.symbol()
  ]);

  console.log('Polygon Agent Balances');
  console.log('Agent:', AGENT_ADDRESS);
  console.log('Explorer:', `https://polygonscan.com/address/${AGENT_ADDRESS}`);
  console.log('---');
  console.log('MATIC:', ethers.formatEther(maticBal));
  console.log(`${sym1}:`, ethers.formatEther(wmaticBal));
  console.log(`${sym2}:`, Number(ethers.formatUnits(usdcBal, 6)).toFixed(2));
}

main().catch(e => { console.error(e); process.exit(1); });

