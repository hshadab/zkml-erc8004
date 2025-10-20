import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
const oracleAddress = process.env.POLYGON_ORACLE;
const registryAddress = process.env.POLYGON_REGISTRY;

console.log('🔍 Checking Oracle Authorization');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`Oracle Contract: ${oracleAddress}`);
console.log(`Registry Contract: ${registryAddress}\n`);

// Get oracle token ID
const oracleAbi = ['function oracleTokenId() external view returns (uint256)'];
const oracle = new ethers.Contract(oracleAddress, oracleAbi, provider);

try {
    const tokenId = await oracle.oracleTokenId();
    console.log(`✅ Oracle Token ID: ${tokenId}\n`);

    // Check if authorized
    const registryAbi = [
        'function isAuthorized(uint256 tokenId, string calldata capabilityType) external view returns (bool)'
    ];
    const registry = new ethers.Contract(registryAddress, registryAbi, provider);

    const isAuthorized = await registry.isAuthorized(tokenId, 'news_classification');

    console.log(`Authorization Status:`);
    console.log(`   Capability: news_classification`);
    console.log(`   Authorized: ${isAuthorized ? '✅ YES' : '❌ NO'}\n`);

    if (!isAuthorized) {
        console.log('❌ ORACLE NOT AUTHORIZED!');
        console.log('   The oracle token must be authorized in the ERC-8004 registry');
        console.log('   before it can submit classifications.\n');
        console.log('   You need to call setOracleTokenId() with an authorized token ID,');
        console.log('   or register and authorize this token in the registry.\n');
    } else {
        console.log('✅ Oracle is properly authorized!');
    }

} catch (error) {
    console.log(`❌ Error checking authorization: ${error.message}\n`);
    console.log('   This might mean oracleTokenId is not set (defaults to 0).');
    console.log('   You need to call setOracleTokenId() with a valid token ID.\n');
}
