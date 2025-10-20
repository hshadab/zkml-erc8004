const https = require('https');

const ALCHEMY_URL = 'https://polygon-mainnet.g.alchemy.com/v2/7OimkSMssMZr7nYzzenak';

console.log('Testing basic HTTPS connectivity to Alchemy endpoint...');
console.log(`URL: ${ALCHEMY_URL}\n`);

// Test 1: Basic HTTPS request
console.log('Test 1: Basic HTTPS request to Alchemy');
const jsonData = JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_chainId',
    params: [],
    id: 1
});

const url = new URL(ALCHEMY_URL);
const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(jsonData)
    },
    timeout: 30000
};

const startTime = Date.now();

const req = https.request(options, (res) => {
    console.log(`✅ Response received! Status: ${res.statusCode}`);
    console.log(`⏱️  Time: ${Date.now() - startTime}ms`);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response body:', data);
        try {
            const parsed = JSON.parse(data);
            if (parsed.result) {
                const chainId = parseInt(parsed.result, 16);
                console.log(`\n✅ Chain ID: ${chainId} (${chainId === 137 ? 'Polygon Mainnet' : 'Unknown'})`);
            }
        } catch (e) {
            console.error('Failed to parse response:', e.message);
        }
    });
});

req.on('error', (error) => {
    console.error(`❌ Request failed: ${error.message}`);
    console.error(`⏱️  Time: ${Date.now() - startTime}ms`);
});

req.on('timeout', () => {
    console.error(`⏱️  Request timeout after ${Date.now() - startTime}ms`);
    req.destroy();
});

req.write(jsonData);
req.end();
