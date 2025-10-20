import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
const registryAddress = process.env.POLYGON_REGISTRY;
const oracleAddress = process.env.POLYGON_ORACLE;
const privateKey = process.env.ORACLE_PRIVATE_KEY;

const wallet = new ethers.Wallet(privateKey, provider);

console.log('🔐 Authorizing Oracle Contract in Registry');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`Registry: ${registryAddress}`);
console.log(`Oracle Contract: ${oracleAddress}`);
console.log(`Your Wallet: ${wallet.address}\n`);

const registryAbi = [
    'function owner() external view returns (address)',
    'function authorizeContract(address contractAddress, bool authorized) external',
    'function authorizedContracts(address contractAddress) external view returns (bool)',
    'event ContractAuthorized(address indexed contractAddress, bool authorized)'
];

const registry = new ethers.Contract(registryAddress, registryAbi, wallet);

try {
    // Check if we're the owner
    const owner = await registry.owner();
    console.log(`Registry Owner: ${owner}`);

    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.log('❌ ERROR: Your wallet is not the registry owner!');
        console.log(`   Owner: ${owner}`);
        console.log(`   You: ${wallet.address}\n`);
        process.exit(1);
    }

    console.log('✅ You are the registry owner\n');

    // Check current status
    const isAuthorized = await registry.authorizedContracts(oracleAddress);
    console.log(`Current Status: ${isAuthorized ? 'Already Authorized' : 'Not Authorized'}\n`);

    if (isAuthorized) {
        console.log('✅ Oracle contract is already authorized!');
        process.exit(0);
    }

    // Authorize the contract
    console.log('📤 Submitting authorization transaction...\n');
    const tx = await registry.authorizeContract(oracleAddress, true);

    console.log(`   TX Hash: ${tx.hash}`);
    console.log(`   🔗 https://polygonscan.com/tx/${tx.hash}\n`);
    console.log('   Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed! Gas used: ${receipt.gasUsed}\n`);

    // Verify
    const nowAuthorized = await registry.authorizedContracts(oracleAddress);
    if (nowAuthorized) {
        console.log('✅ SUCCESS! Oracle contract is now authorized!');
        console.log('   The oracle can now submit proofs to the registry.\n');
    } else {
        console.log('❌ ERROR: Authorization may have failed. Please check the transaction.');
    }

} catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
    if (error.code === 'CALL_EXCEPTION') {
        console.log('   This might be a permission issue or the contract may not be deployed.');
    }
    process.exit(1);
}
