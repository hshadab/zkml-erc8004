const { ethers } = require('ethers');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  console.log('Testing V2 TradingAgent swap with increased gas limit...\n');
  
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);
  
  const AGENT_ADDRESS = process.env.POLYGON_AGENT;
  const ORACLE_ADDRESS = process.env.POLYGON_ORACLE;
  
  // Oracle ABI
  const oracleABI = [
    'function postClassification(string headline, uint8 sentiment, uint256 confidence, bytes32 proofHash) external returns (bytes32)',
    'function getClassification(bytes32) view returns (tuple(bytes32 classificationId, uint256 oracleTokenId, uint256 timestamp, string headline, uint8 sentiment, uint256 confidence, bytes32 proofHash, bool verified))'
  ];
  
  // Agent ABI
  const agentABI = [
    'function reactToNews(bytes32 classificationId) external',
    'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)'
  ];
  
  const oracle = new ethers.Contract(ORACLE_ADDRESS, oracleABI, wallet);
  const agent = new ethers.Contract(AGENT_ADDRESS, agentABI, wallet);
  
  console.log('Wallet:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'POL\n');
  
  // Post BAD_NEWS classification
  const headline = "Major crypto exchange declares bankruptcy amid market collapse";
  const sentiment = 1; // BAD_NEWS
  const confidence = 92;
  const proofHash = ethers.id('test_proof_v2_' + Date.now());
  
  console.log('📝 Posting BAD_NEWS classification...');
  console.log('Headline:', headline);
  console.log('Sentiment: BAD_NEWS, Confidence:', confidence + '%\n');
  
  const postTx = await oracle.postClassification(headline, sentiment, confidence, proofHash);
  console.log('TX:', postTx.hash);
  const postReceipt = await postTx.wait();
  
  // Extract classification ID from logs
  const classificationId = postReceipt.logs[0].topics[1];
  console.log('Classification ID:', classificationId);
  console.log('✅ Posted!\n');
  
  // Wait 2 seconds
  await new Promise(r => setTimeout(r, 2000));
  
  // Execute trade with increased gas limit
  console.log('🤖 Executing trade with 1M gas limit...');
  const tradeTx = await agent.reactToNews(classificationId, {
    gasLimit: 1000000n
  });
  
  console.log('TX:', tradeTx.hash);
  console.log('Explorer:', 'https://polygonscan.com/tx/' + tradeTx.hash);
  console.log('Waiting for confirmation...\n');
  
  const tradeReceipt = await tradeTx.wait();
  
  console.log('Status:', tradeReceipt.status === 1 ? '✅ SUCCESS' : '❌ FAILED');
  console.log('Gas Used:', tradeReceipt.gasUsed.toString());
  console.log('Gas Limit:', tradeTx.gasLimit.toString());
  
  if (tradeReceipt.status === 1) {
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
      console.log('\n📊 Trade Details:');
      console.log('Action:', parsed.args.action);
      console.log('Token In:', parsed.args.tokenIn);
      console.log('Token Out:', parsed.args.tokenOut);
      console.log('Amount In:', ethers.formatEther(parsed.args.amountIn), 'WPOL');
      console.log('Amount Out:', ethers.formatUnits(parsed.args.amountOut, 6), 'USDC');
    }
  } else {
    console.log('\n❌ Transaction reverted');
  }
}

main().catch(console.error).then(() => process.exit(0));
