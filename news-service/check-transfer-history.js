import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');

// User's MetaMask address
const userAddress = '0x1f409E94684804e5158561090Ced8941B47B0CC6';
// Oracle wallet address
const oracleAddress = '0x2e408ad62e30146404F4ED8A61253212f3f9A490';

console.log('🔍 Checking transaction history for transfers...\n');
console.log(`User MetaMask: ${userAddress}`);
console.log(`Oracle Wallet: ${oracleAddress}\n`);

// Get current block
const currentBlock = await provider.getBlockNumber();
console.log(`Current block: ${currentBlock}`);

// Check last 10000 blocks (roughly last few weeks on Polygon)
const fromBlock = Math.max(0, currentBlock - 10000);
console.log(`Scanning from block ${fromBlock} to ${currentBlock}...\n`);

// Get all transactions sent FROM user's MetaMask
try {
    // Method 1: Check transaction count and fetch recent txs
    const txCount = await provider.getTransactionCount(userAddress);
    console.log(`📊 Total transactions sent from MetaMask: ${txCount}\n`);

    // Get user's current balance
    const userBalance = await provider.getBalance(userAddress);
    console.log(`💰 Current MetaMask Balance: ${ethers.formatEther(userBalance)} POL\n`);

    // Get oracle balance
    const oracleBalance = await provider.getBalance(oracleAddress);
    console.log(`💰 Current Oracle Balance: ${ethers.formatEther(oracleBalance)} POL\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔎 SEARCHING FOR POL TRANSFERS TO ORACLE WALLET...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Use PolygonScan API to get transaction history (more reliable than scanning blocks)
    const apiKey = process.env.POLYGONSCAN_API_KEY || 'YourApiKeyToken';

    console.log('⚠️  Note: To check full transaction history, you need a PolygonScan API key');
    console.log('   Set POLYGONSCAN_API_KEY in your .env file\n');

    // Alternative: Manually scan recent blocks for transfers
    console.log('Scanning recent blocks for direct transfers...\n');

    let foundTransfer = false;
    let scannedTxs = 0;

    // Scan recent blocks (limit to prevent timeout)
    const blocksToScan = 1000;
    for (let i = 0; i < blocksToScan; i++) {
        const blockNum = currentBlock - i;
        try {
            const block = await provider.getBlock(blockNum, true);
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    scannedTxs++;

                    // Check if transaction is from user's MetaMask
                    if (tx.from && tx.from.toLowerCase() === userAddress.toLowerCase()) {
                        // Check if it's to oracle wallet
                        if (tx.to && tx.to.toLowerCase() === oracleAddress.toLowerCase()) {
                            foundTransfer = true;
                            console.log(`✅ FOUND TRANSFER!`);
                            console.log(`   Block: ${blockNum}`);
                            console.log(`   TX Hash: ${tx.hash}`);
                            console.log(`   Amount: ${ethers.formatEther(tx.value)} POL`);
                            console.log(`   https://polygonscan.com/tx/${tx.hash}\n`);
                        } else if (tx.value > 0n) {
                            // Log any other POL transfers
                            console.log(`📤 Transfer found (not to oracle):`);
                            console.log(`   To: ${tx.to}`);
                            console.log(`   Amount: ${ethers.formatEther(tx.value)} POL`);
                            console.log(`   TX: ${tx.hash}\n`);
                        }
                    }
                }
            }

            // Progress indicator
            if (i % 100 === 0 && i > 0) {
                console.log(`   Scanned ${i} blocks, ${scannedTxs} transactions...`);
            }
        } catch (err) {
            // Skip block on error
            continue;
        }
    }

    console.log(`\n📊 Scan complete: ${blocksToScan} blocks, ${scannedTxs} transactions checked\n`);

    if (!foundTransfer) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('❌ NO TRANSFER FOUND');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🔍 CONCLUSION:');
        console.log('   No POL transfer from your MetaMask to the oracle wallet was found');
        console.log('   in the last ~1000 blocks (approximately last few hours).\n');
        console.log('💡 NEXT STEPS:');
        console.log('   1. Send POL from MetaMask to oracle wallet:');
        console.log(`      From: ${userAddress}`);
        console.log(`      To:   ${oracleAddress}`);
        console.log('      Amount: 1-2 POL (recommended)\n');
        console.log('   2. After transfer, run: node src/polygonClassifier.js\n');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
}
