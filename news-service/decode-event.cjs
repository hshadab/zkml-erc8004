const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
  
  const txHash = '0x33402c713e4afb677f0c8aeb2f643bdfdcca2c7d8252648a6e83f7796adb42dd';
  const receipt = await provider.getTransactionReceipt(txHash);
  
  console.log('Event logs:\n');
  
  const agentABI = [
    'event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)',
    'event TradeProfitabilityDetermined(bytes32 indexed classificationId, bool profitable, uint256 valueBefore, uint256 valueAfter, int256 profitLossPercent)'
  ];
  
  const iface = new ethers.Interface(agentABI);
  
  for (let i = 0; i < receipt.logs.length; i++) {
    const log = receipt.logs[i];
    console.log(`Log ${i}:`);
    console.log('  Address:', log.address);
    console.log('  Topics:', log.topics);
    
    try {
      const parsed = iface.parseLog(log);
      console.log('  Event:', parsed.name);
      console.log('  Args:', parsed.args);
    } catch (e) {
      console.log('  (Could not decode - might be from another contract)');
      // Try ERC20 Transfer event
      const erc20ABI = ['event Transfer(address indexed from, address indexed to, uint256 value)', 'event Approval(address indexed owner, address indexed spender, uint256 value)'];
      const erc20Iface = new ethers.Interface(erc20ABI);
      try {
        const parsed = erc20Iface.parseLog(log);
        console.log('  Event:', parsed.name);
        if (parsed.name === 'Approval') {
          console.log('  Owner:', parsed.args[0]);
          console.log('  Spender:', parsed.args[1]);
          console.log('  Amount:', ethers.formatEther(parsed.args[2]));
        }
      } catch (e2) {
        console.log('  (Unknown event)');
      }
    }
    console.log('');
  }
}

main().catch(console.error);
