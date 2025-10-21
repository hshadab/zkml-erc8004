const { ethers } = require('ethers');
require('dotenv').config({ path: '../ui/.env' });

const CLASSIFICATION_ID = '0x038114a244fae54537dbdea7443e5209978ef1681d72173f45044f6d9d0cf5f8';

async function evaluateTrade() {
  try {
    // You'll need to provide a wallet with the .env file
    // For now, let's just check if evaluation is needed
    const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
    const AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS;

    const agentABI = [
      'function getTradeDetails(bytes32) view returns (tuple(bytes32 classificationId, uint256 oracleTokenId, uint8 sentiment, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, uint256 portfolioValueBefore, uint256 portfolioValueAfter, bool isProfitable, bool hasReported))',
      'function evaluateTradeProfitability(bytes32 classificationId) external'
    ];

    const agent = new ethers.Contract(AGENT_ADDRESS, agentABI, provider);

    const trade = await agent.getTradeDetails(CLASSIFICATION_ID);

    console.log('Trade Status:');
    console.log('  Timestamp:', new Date(Number(trade.timestamp) * 1000).toISOString());
    console.log('  Portfolio Value Before: $' + (Number(trade.portfolioValueBefore) / 1e6).toFixed(2));
    console.log('  Portfolio Value After: $' + (Number(trade.portfolioValueAfter) / 1e6).toFixed(2));
    console.log('  Has Been Evaluated:', trade.hasReported);
    console.log('');

    if (!trade.hasReported && trade.portfolioValueAfter === 0n) {
      console.log('❌ This trade has NOT been evaluated yet.');
      console.log('');
      console.log('To evaluate this trade, someone needs to call:');
      console.log('  agent.evaluateTradeProfitability("' + CLASSIFICATION_ID + '")');
      console.log('');
      console.log('This requires:');
      console.log('1. A wallet with a private key');
      console.log('2. ETH on Base Mainnet for gas fees');
      console.log('3. At least 10 seconds must have passed since the trade (already passed)');
      console.log('');
      console.log('The evaluation should be done by the news-service or a separate monitoring script.');
    } else {
      console.log('✅ Trade has been evaluated');
      console.log('  Is Profitable:', trade.isProfitable);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

evaluateTrade();
