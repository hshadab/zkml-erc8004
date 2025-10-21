const { ethers } = require('ethers');
require('dotenv').config();

const RPC_URL = process.env.BASE_MAINNET_RPC_URL;
const provider = new ethers.JsonRpcProvider(RPC_URL);

const IDENTITY_REGISTRY = '0x909fbFbFE9F7Bdb4d1a6e02F2E91d3f367555b07';
const ORACLE_ADDRESS = '0xe92c7aE9E894a8701583a43363676ff878d5b6ed';

async function checkAuthorization() {
  try {
    console.log('Checking ZkMLVerificationRegistry (Identity Registry) authorization...');
    console.log('Identity Registry:', IDENTITY_REGISTRY);
    console.log('Oracle Address:', ORACLE_ADDRESS);
    console.log('');
    
    const identityRegistryAbi = [
      'function authorizedContracts(address) view returns (bool)'
    ];
    
    const registry = new ethers.Contract(IDENTITY_REGISTRY, identityRegistryAbi, provider);
    
    const isAuthorized = await registry.authorizedContracts(ORACLE_ADDRESS);
    console.log('Is Oracle authorized in Identity Registry?', isAuthorized);
    
    if (!isAuthorized) {
      console.log('');
      console.log('❌ PROBLEM FOUND: Oracle is NOT authorized!');
      console.log('');
      console.log('The Oracle must be authorized by calling:');
      console.log('  identityRegistry.authorizeContract("' + ORACLE_ADDRESS + '", true)');
    } else {
      console.log('✅ Oracle is properly authorized');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAuthorization();
