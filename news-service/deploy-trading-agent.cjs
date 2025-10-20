const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');

  // Use Oracle wallet which has funds
  const privateKey = '0xe3fa9c98c07622bef19d4ea8ebcfafcdb3a905071c02295920c724c1cdd7f190';
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('Deployer:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'MATIC\n');

  // Contract addresses
  const ORACLE_ADDRESS = '0x037B74A3c354522312C67a095D043347E9Ffc40f';
  const REGISTRY_ADDRESS = '0x078C7aFbFADAC9BE82F372e867231d605A8d3428';
  const QUICKSWAP_V3_ROUTER = '0xf5b509bB0909a69B1c207E495f687a596C168E12';
  const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

  console.log('Reading contract artifact...');
  const artifactPath = '/home/hshadab/zkml-erc8004/contracts/out/TradingAgentPolygonEnhanced.sol/TradingAgentPolygonEnhanced.json';
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('Creating contract factory...');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, wallet);

  console.log('Deploying TradingAgentPolygonEnhanced...');
  console.log('  Oracle:', ORACLE_ADDRESS);
  console.log('  Registry:', REGISTRY_ADDRESS);
  console.log('  Router:', QUICKSWAP_V3_ROUTER);
  console.log('  USDC:', USDC_ADDRESS);

  const contract = await factory.deploy(
    ORACLE_ADDRESS,
    REGISTRY_ADDRESS,
    QUICKSWAP_V3_ROUTER,
    USDC_ADDRESS
  );

  console.log('\nDeployment TX:', contract.deploymentTransaction().hash);
  console.log('Waiting for confirmation...');

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('\n✅ TradingAgentPolygonEnhanced deployed!');
  console.log('Address:', address);
  console.log('Explorer: https://polygonscan.com/address/' + address);

  return address;
}

main()
  .then(address => {
    console.log('\nNext steps:');
    console.log('1. Update .env files with:', address);
    console.log('2. Fund the agent with USDC and MATIC');
    console.log('3. Register agent in registry (if needed)');
    process.exit(0);
  })
  .catch(error => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
