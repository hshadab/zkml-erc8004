import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
const oracleAddress = process.env.POLYGON_ORACLE;

console.log('🔍 Checking Oracle Contract on Polygon');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`Oracle Address: ${oracleAddress}\n`);

// Check if contract exists
const code = await provider.getCode(oracleAddress);
console.log(`Contract Code Length: ${code.length} bytes`);

if (code === '0x') {
    console.log('\n❌ NO CONTRACT DEPLOYED AT THIS ADDRESS!');
    console.log('   This address has no contract bytecode.');
    console.log('   You need to deploy the oracle contract first.\n');
} else {
    console.log('✅ Contract exists at this address\n');

    // Try to call getClassificationCount to verify it's the right contract
    const oracleAbi = ['function getClassificationCount() external view returns (uint256)'];
    const oracle = new ethers.Contract(oracleAddress, oracleAbi, provider);

    try {
        const count = await oracle.getClassificationCount();
        console.log(`✅ getClassificationCount() works: ${count} classifications`);
    } catch (error) {
        console.log(`❌ getClassificationCount() failed: ${error.message}`);
    }

    // Check function selector for submitClassificationWithProof
    const iface = new ethers.Interface([
        'function submitClassificationWithProof(string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, bytes proof) external returns (bytes32)'
    ]);

    const selector = iface.getFunction('submitClassificationWithProof').selector;
    console.log(`\nFunction selector for submitClassificationWithProof: ${selector}`);
    console.log(`Checking if contract has this function...`);

    // Check if the contract code contains this selector
    if (code.includes(selector.slice(2))) {
        console.log('✅ Contract likely has submitClassificationWithProof function');
    } else {
        console.log('⚠️  Cannot confirm function exists (selector not found in bytecode)');
    }
}
