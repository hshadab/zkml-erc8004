import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
const oracleAddress = process.env.POLYGON_ORACLE;
const currentWallet = process.env.ORACLE_PRIVATE_KEY;

const oracleAbi = ['function owner() external view returns (address)'];
const oracle = new ethers.Contract(oracleAddress, oracleAbi, provider);

const owner = await oracle.owner();
const wallet = new ethers.Wallet(currentWallet);

console.log('🔍 Oracle Ownership Check');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`Oracle Contract: ${oracleAddress}`);
console.log(`Contract Owner:  ${owner}`);
console.log(`Your Wallet:     ${wallet.address}`);
console.log(`\nMatch: ${owner.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);

if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.log('\n⚠️  YOUR WALLET IS NOT THE OWNER!');
    console.log('   You need to either:');
    console.log('   1. Transfer ownership to your new wallet, OR');
    console.log('   2. Use the owner wallet\'s private key\n');
}
