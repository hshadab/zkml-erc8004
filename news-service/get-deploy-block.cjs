const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');

async function main() {
  const deployTx = '0x0ac5b41d4f5ba2d271d2ec5ada3f77178032494f8584aade04b9f4523559975b';
  const receipt = await provider.getTransactionReceipt(deployTx);
  console.log('V2 Agent deployed at block:', receipt.blockNumber);
  const currentBlock = await provider.getBlockNumber();
  console.log('Current block:', currentBlock);
  console.log('Blocks since deployment:', currentBlock - receipt.blockNumber);
}
main();
