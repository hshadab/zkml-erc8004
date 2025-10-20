// Simplified trades API that uses tx cache
const fs = require('fs');
const txCache = JSON.parse(fs.readFileSync('/home/hshadab/zkml-erc8004/ui/tx-cache.json', 'utf8'));

async function getTradesWithCache(agentContract) {
  const recentTrades = await agentContract.getRecentTrades(10);
  
  const trades = [...recentTrades].reverse().map((trade) => {
    const txHash = txCache[trade.classificationId] || '0x';
    const explorerUrl = txHash !== '0x' 
      ? `https://polygonscan.com/tx/${txHash}`
      : `https://polygonscan.com/address/0x2B2c8F40b7Ee5064f55f1FF91a200264DA88915f`;
    
    let profitPercent = 0;
    if (trade.portfolioValueAfter > 0n && trade.portfolioValueBefore > 0n) {
      const diff = trade.portfolioValueAfter - trade.portfolioValueBefore;
      profitPercent = Number((diff * 10000n) / trade.portfolioValueBefore) / 100;
    }
    
    const {ethers} = require('ethers');
    const inUsdc = trade.tokenIn.toLowerCase().includes('2791bca1');
    const outUsdc = trade.tokenOut.toLowerCase().includes('2791bca1');
    
    return {
      classificationId: trade.classificationId,
      oracleTokenId: trade.oracleTokenId.toString(),
      sentiment: ['NEUTRAL', 'BAD', 'GOOD'][trade.sentiment] || 'UNKNOWN',
      action: trade.action,
      amountIn: inUsdc ? (Number(trade.amountIn) / 1e6).toFixed(4) : ethers.formatEther(trade.amountIn),
      amountOut: outUsdc ? (Number(trade.amountOut) / 1e6).toFixed(2) : ethers.formatEther(trade.amountOut),
      timestamp: trade.timestamp.toString(),
      portfolioValueBefore: (Number(trade.portfolioValueBefore) / 1e6).toFixed(2),
      portfolioValueAfter: trade.portfolioValueAfter > 0n ? (Number(trade.portfolioValueAfter) / 1e6).toFixed(2) : '0',
      isProfitable: trade.isProfitable,
      profitPercent: profitPercent.toFixed(2),
      txHash: txHash,
      explorerUrl: explorerUrl
    };
  });
  
  return { trades };
}

module.exports = { getTradesWithCache };
