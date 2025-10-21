const { ethers } = require('ethers');
require('dotenv').config();

const RPC_URL = process.env.BASE_MAINNET_RPC_URL;
const provider = new ethers.JsonRpcProvider(RPC_URL);

const VALIDATION_REGISTRY = '0x04C6276830DA145ee465194131B7beC22aa2d0d3';
const CLASSIFICATION_ID = '0x038114a244fae54537dbdea7443e5209978ef1681d72173f45044f6d9d0cf5f8';

async function checkValidation() {
  try {
    console.log('Checking ValidationRegistry for classification:', CLASSIFICATION_ID);
    console.log('');
    
    const validationRegistryAbi = [
      'function validationRequests(bytes32) view returns (uint256 agentTokenId, bytes32 workId, bytes32 workHash, uint256 requestTime, uint8 status, uint256 responseCount)'
    ];
    
    const registry = new ethers.Contract(VALIDATION_REGISTRY, validationRegistryAbi, provider);
    
    const validation = await registry.validationRequests(CLASSIFICATION_ID);
    
    console.log('Validation Request Data:');
    console.log('  Agent Token ID:', validation.agentTokenId.toString());
    console.log('  Work ID:', validation.workId);
    console.log('  Work Hash:', validation.workHash);
    console.log('  Request Time:', validation.requestTime.toString());
    console.log('  Status:', validation.status.toString());
    console.log('  Response Count:', validation.responseCount.toString());
    console.log('');
    
    if (validation.requestTime.toString() === '0') {
      console.log('❌ Validation request was NEVER created (requestTime = 0)');
      console.log('');
      console.log('This means validationRegistry.requestValidation() either:');
      console.log('1. Was never called, OR');
      console.log('2. Reverted with an error');
      console.log('');
      console.log('The Oracle contract SHOULD be calling requestValidation() at line 208,');
      console.log('but it appears this call is failing silently.');
    } else {
      console.log('✅ Validation request exists');
      const date = new Date(Number(validation.requestTime) * 1000);
      console.log('   Created at:', date.toISOString());
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkValidation();
