const { ethers } = require('ethers');
const dotenv = require('dotenv');
dotenv.config();

async function main() {
  console.log('Testing V2 TradingAgent with existing classification...\n');
  
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);
  
  const AGENT_ADDRESS = process.env.POLYGON_AGENT;
  
  // Use existing classification from earlier test
  const classificationId = '0x02ef8e89edbf6f61bc21a07b5cfd0e782739eaf542bbb88d2c6f74b5f1384e92';
  
  // Agent ABI
  const agentABI = [
    'function reactToNews(bytes32 classificationId) external',
    'function processedClassifications(bytes32) view returns (bool)',
    'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)'
  ];
  
  const agent = new ethers.Contract(AGENT_ADDRESS, agentABI, wallet);
  
  console.log('Wallet:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'POL\n');
  
  // Check if already processed
  const processed = await agent.processedClassifications(classificationId);
  console.log('Classification already processed:', processed);
  
  if (processed) {
    console.log('\n❌ This classification was already processed.');
    console.log('The contract prevents double-processing.');
    console.log('\nLet me check agent balances instead:');
    
    const WPOL = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
    const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    
    const tokenABI = ['function balanceOf(address) view returns (uint256)'];
    const wpol = new ethers.Contract(WPOL, tokenABI, provider);
    const usdc = new ethers.Contract(USDC, tokenABI, provider);
    
    const wpolBalance = await wpol.balanceOf(AGENT_ADDRESS);
    const usdcBalance = await usdc.balanceOf(AGENT_ADDRESS);
    const nativeBalance = await provider.getBalance(AGENT_ADDRESS);
    
    console.log('\nAgent Balances:');
    console.log('Native POL:', ethers.formatEther(nativeBalance));
    console.log('WPOL:', ethers.formatEther(wpolBalance));
    console.log('USDC:', ethers.formatUnits(usdcBalance, 6));
    
    return;
  }
  
  console.log('Classification ID:', classificationId);
  console.log('\n🤖 Executing trade with 1M gas limit...');
  
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
  }
}

main().catch(console.error).then(() => process.exit(0));
