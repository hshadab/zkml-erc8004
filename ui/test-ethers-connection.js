const { ethers } = require('ethers');

const ALCHEMY_URL = 'https://polygon-mainnet.g.alchemy.com/v2/7OimkSMssMZr7nYzzenak';

console.log('Testing ethers.js connectivity to Alchemy endpoint...');
console.log(`URL: ${ALCHEMY_URL}\n`);

// Test 1: Simple provider without network specification
console.log('Test 1: Simple JsonRpcProvider (no network)');
const startTime1 = Date.now();
const provider1 = new ethers.JsonRpcProvider(ALCHEMY_URL);

provider1.getBlockNumber()
    .then(blockNumber => {
        console.log(`✅ Success! Block: ${blockNumber}`);
        console.log(`⏱️  Time: ${Date.now() - startTime1}ms\n`);

        // Test 2: Provider with explicit network
        console.log('Test 2: JsonRpcProvider with explicit network');
        const startTime2 = Date.now();
        const network = {
            name: 'matic',
            chainId: 137
        };
        const provider2 = new ethers.JsonRpcProvider(ALCHEMY_URL, network);

        return provider2.getBlockNumber();
    })
    .then(blockNumber => {
        console.log(`✅ Success! Block: ${blockNumber}`);
        console.log(`⏱️  Time: ${Date.now() - startTime1}ms\n`);

        // Test 3: Provider with staticNetwork
        console.log('Test 3: JsonRpcProvider with staticNetwork: true');
        const startTime3 = Date.now();
        const network = {
            name: 'matic',
            chainId: 137
        };
        const provider3 = new ethers.JsonRpcProvider(ALCHEMY_URL, network, {
            staticNetwork: true
        });

        return provider3.getBlockNumber();
    })
    .then(blockNumber => {
        console.log(`✅ Success! Block: ${blockNumber}`);
        console.log(`⏱️  Time: ${Date.now() - startTime1}ms\n`);

        console.log('✅ All tests passed!');
        process.exit(0);
    })
    .catch(error => {
        console.error(`❌ Error: ${error.message}`);
        console.error(`⏱️  Time: ${Date.now() - startTime1}ms`);
        process.exit(1);
    });

// Set overall timeout
setTimeout(() => {
    console.error('⏱️  Overall timeout after 90 seconds');
    process.exit(1);
}, 90000);
