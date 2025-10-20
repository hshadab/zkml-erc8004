import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const privateKey = process.env.ORACLE_PRIVATE_KEY;

if (!privateKey) {
    console.error('❌ ORACLE_PRIVATE_KEY not found in .env');
    process.exit(1);
}

const wallet = new ethers.Wallet(privateKey);

console.log('🔑 Oracle Wallet Configuration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Address: ${wallet.address}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Now check the balance on Polygon
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
const balance = await provider.getBalance(wallet.address);

console.log(`💰 Polygon Balance: ${ethers.formatEther(balance)} POL`);

if (balance === 0n) {
    console.log('\n❌ Wallet has 0 balance - needs funding!\n');
    console.log('📋 FUNDING INSTRUCTIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Send POL to: ${wallet.address}`);
    console.log('Recommended amount: 1-2 POL');
    console.log('Network: Polygon PoS (Chain ID: 137)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
} else {
    console.log(`\n✅ Wallet is funded and ready!`);
}
