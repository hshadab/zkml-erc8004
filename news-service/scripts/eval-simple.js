const https = require('https');
const { ethers } = require('ethers');
require('dotenv').config();

const RPC_URL = process.env.BASE_MAINNET_RPC_URL;
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS;
const CLASS_ID = '0x038114a244fae54537dbdea7443e5209978ef1681d72173f45044f6d9d0cf5f8';

// Function selector for evaluateTradeProfitability(bytes32)
const FUNC_SELECTOR = '0x7d7c2a1c';

// Encode the classification ID (remove 0x, pad to 64 chars)
const encodedClassId = CLASS_ID.slice(2).padStart(64, '0');
const calldata = FUNC_SELECTOR + encodedClassId;

console.log('🔷 Evaluating trade profitability...');
console.log(`   Classification ID: ${CLASS_ID}`);
console.log(`   Agent: ${AGENT_ADDRESS}`);

// Sign the transaction
const wallet = new ethers.Wallet(PRIVATE_KEY);

// Simple transaction
const tx = {
  to: AGENT_ADDRESS,
  data: calldata,
  gasLimit: '0x7a120', // 500000
  nonce: null, // Will be fetched
  chainId: 8453
};

console.log('\nSending evaluation transaction...');
// We'll need to get nonce and gas price, then sign and send
eval();

async function eval() {
  try {
    // Use basic HTTP request with longer timeout
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    provider.pollingInterval = 15000; // 15 second polling
    
    const connectedWallet = wallet.connect(provider);
    
    console.log('Getting transaction count...');
    const nonce = await connectedWallet.getNonce();
    console.log(`   Nonce: ${nonce}`);
    
    console.log('Getting fee data...');
    const feeData = await provider.getFeeData();
    console.log(`   Max Fee: ${ethers.formatUnits(feeData.maxFeePerGas || 0n, 'gwei')} gwei`);
    
    tx.nonce = nonce;
    tx.maxFeePerGas = feeData.maxFeePerGas;
    tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    
    console.log('\nSigning transaction...');
    const signedTx = await connectedWallet.signTransaction(tx);
    
    console.log('Broadcasting transaction...');
    const response = await provider.broadcastTransaction(signedTx);
    console.log(`\n✅ Transaction sent!`);
    console.log(`   TX Hash: ${response.hash}`);
    console.log(`   🔗 Explorer: https://basescan.org/tx/${response.hash}`);
    
    console.log('\nWaiting for confirmation...');
    const receipt = await response.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}
