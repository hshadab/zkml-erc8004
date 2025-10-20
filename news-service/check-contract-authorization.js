import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
const oracleAddress = process.env.POLYGON_ORACLE;
const registryAddress = process.env.POLYGON_REGISTRY;

console.log('🔍 Checking Contract Authorization in Registry');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check if oracle contract is authorized in registry
const registryAbi = [
    'function authorizedContracts(address contractAddress) external view returns (bool)'
];
const registry = new ethers.Contract(registryAddress, registryAbi, provider);

const isAuthorized = await registry.authorizedContracts(oracleAddress);

console.log(`Oracle Contract: ${oracleAddress}`);
console.log(`Registry Contract: ${registryAddress}`);
console.log(`\nAuthorized Status: ${isAuthorized ? '✅ YES' : '❌ NO'}\n`);

if (!isAuthorized) {
    console.log('❌ ORACLE CONTRACT NOT AUTHORIZED!');
    console.log('   The oracle contract must be authorized in the registry');
    console.log('   to call submitProof() on behalf of the agent.\n');
    console.log('   Solution: Call registry.authorizeContract(oracleAddress, true)');
    console.log('   This must be done by the registry owner.\n');
} else {
    console.log('✅ Oracle contract is authorized to submit proofs!');
}
