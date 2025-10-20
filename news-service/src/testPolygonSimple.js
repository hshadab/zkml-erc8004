import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const AGENT = process.env.POLYGON_AGENT;
const ORACLE = process.env.POLYGON_ORACLE;
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;

console.log('\n🚀 Polygon Trading Agent Test\n');
console.log(`   Agent:  ${AGENT}`);
console.log(`   Oracle: ${ORACLE}\n`);

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Agent ABI
const agentAbi = [
  'function reactToNews(bytes32 classificationId) external',
  'function getBalance() external view returns (uint256)',
  'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)'
];

// Oracle ABI
const oracleAbi = [
  'function submitClassification(string headline, uint8 sentiment, uint16 confidence) external returns (bytes32)',
  'function getClassification(bytes32 id) external view returns (tuple(string headline, uint8 sentiment, uint16 confidence, uint256 timestamp, address submitter))'
];

const agent = new ethers.Contract(AGENT, agentAbi, wallet);
const oracle = new ethers.Contract(ORACLE, oracleAbi, wallet);

async function main() {
  try {
    // Step 1: Check agent balance (using provider)
    console.log('Step 1: Checking agent balance...');
    const balance = await provider.getBalance(AGENT);
    console.log(`   ✅ Agent balance: ${ethers.formatEther(balance)} MATIC\n`);

    if (balance === 0n) {
      console.log('❌ Agent has no funds! Fund it first.');
      process.exit(1);
    }

    // Step 2: Submit bullish classification to Polygon Oracle
    console.log('Step 2: Submitting bullish classification to Polygon Oracle...');
    const headline = "Bitcoin ETF Approved - Price Surges to ATH";
    const sentiment = 1; // GOOD
    const confidence = 80;

    console.log(`   Headline: "${headline}"`);
    console.log(`   Sentiment: ${sentiment} (GOOD)`);
    console.log(`   Confidence: ${confidence}%\n`);

    const submitTx = await oracle.submitClassification(headline, sentiment, confidence);
    console.log(`   📤 TX submitted: ${submitTx.hash}`);

    const submitReceipt = await submitTx.wait();
    console.log(`   ✅ Classification posted! Gas: ${submitReceipt.gasUsed}\n`);

    // Extract classification ID from events
    const classificationId = submitTx.hash; // Use tx hash as temp ID
    // In real deployment, parse from event logs

    console.log(`   Classification ID: ${classificationId}\n`);

    // Step 3: Execute trade
    console.log('Step 3: Executing trade on QuickSwap...');

    const tradeTx = await agent.reactToNews(classificationId, { gasLimit: 500000 });
    console.log(`   📤 TX submitted: ${tradeTx.hash}`);
    console.log(`   🔗 https://polygonscan.com/tx/${tradeTx.hash}\n`);

    const tradeReceipt = await tradeTx.wait();
    console.log(`   ✅ Trade executed! Gas used: ${tradeReceipt.gasUsed}\n`);

    // Parse trade event
    const tradeEvent = tradeReceipt.logs.find(log => {
      try {
        const parsed = agent.interface.parseLog(log);
        return parsed && parsed.name === 'TradeExecuted';
      } catch {
        return false;
      }
    });

    if (tradeEvent) {
      const parsed = agent.interface.parseLog(tradeEvent);
      console.log('📊 Trade Details:');
      console.log(`   Action:     ${parsed.args.action}`);
      console.log(`   Amount In:  ${ethers.formatEther(parsed.args.amountIn)} MATIC`);
      console.log(`   Amount Out: ${Number(parsed.args.amountOut) / 1e6} USDC\n`);
    }

    // Calculate cost
    const gasPrice = tradeReceipt.gasPrice;
    const gasCost = gasPrice * (submitReceipt.gasUsed + tradeReceipt.gasUsed);
    const costMATIC = ethers.formatEther(gasCost);
    const costUSD = (Number(costMATIC) * 0.75).toFixed(4); // Assuming $0.75/MATIC

    console.log(`💰 Total Gas Cost: ${costMATIC} MATIC (~$${costUSD})\n`);
    console.log('✅ SUCCESS! Your zkML agent just executed a real trade on Polygon!');
    console.log('🔗 View on PolygonScan:');
    console.log(`   https://polygonscan.com/tx/${tradeTx.hash}\n`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.data) {
      console.error(`   Data: ${error.data}`);
    }
    process.exit(1);
  }
}

main();
