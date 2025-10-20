import { ethers } from 'ethers';

console.log('🔐 Generating New Secure Oracle Wallet');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Generate a new random wallet
const newWallet = ethers.Wallet.createRandom();

console.log('✅ New Oracle Wallet Generated:\n');
console.log(`Address: ${newWallet.address}`);
console.log(`Private Key: ${newWallet.privateKey}`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 NEXT STEPS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('1. Update your .env file:');
console.log(`   ORACLE_PRIVATE_KEY=${newWallet.privateKey}\n`);

console.log('2. Fund the new wallet with POL:');
console.log(`   Send to: ${newWallet.address}`);
console.log('   Amount: 1-2 POL');
console.log('   Network: Polygon PoS (Chain ID: 137)\n');

console.log('3. Restart any running services to pick up the new key\n');

console.log('⚠️  SECURITY WARNING:');
console.log('   - Store the private key securely');
console.log('   - Never share it publicly');
console.log('   - Keep backups in a secure location');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
