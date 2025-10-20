const { ethers } = require('ethers');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
  
  const txHash = '0x33402c713e4afb677f0c8aeb2f643bdfdcca2c7d8252648a6e83f7796adb42dd';
  
  console.log('Fetching transaction details...\n');
  
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);
  
  console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
  console.log('Gas Used:', receipt.gasUsed.toString());
  console.log('Gas Limit:', tx.gasLimit.toString());
  console.log('\nTransaction to:', tx.to);
  console.log('Value:', ethers.formatEther(tx.value), 'POL');
  
  // Decode input data
  const agentABI = [
    'function reactToNews(bytes32 classificationId)'
  ];
  const iface = new ethers.Interface(agentABI);
  
  try {
    const decoded = iface.parseTransaction({ data: tx.data });
    console.log('\nFunction called:', decoded.name);
    console.log('Classification ID:', decoded.args[0]);
  } catch (e) {
    console.log('Could not decode input');
  }
  
  console.log('\nLogs count:', receipt.logs.length);
  if (receipt.logs.length > 0) {
    console.log('Events were emitted (transaction executed some logic)');
  } else {
    console.log('No events emitted (likely reverted early)');
  }
}

main().catch(console.error);
