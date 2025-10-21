/**
 * Deploy NewsClassificationOracle V2 with ValidationRegistry Integration (ERC-8004)
 */
import { ethers } from 'ethers';
import fs from 'fs';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('\n🚀 Deploying NewsClassificationOracle V2 (with ERC-8004 Validation) to Base Mainnet...\n');

  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Get existing contract addresses
  const IDENTITY_REGISTRY = process.env.ZKML_VERIFICATION_REGISTRY;
  const VALIDATION_REGISTRY = process.env.VALIDATION_REGISTRY_ADDRESS;

  console.log('📋 Configuration:');
  console.log(`   Identity Registry: ${IDENTITY_REGISTRY}`);
  console.log(`   Validation Registry: ${VALIDATION_REGISTRY}\n`);

  // Read and compile contract
  const sources = {};

  // Read main contract
  const mainContract = fs.readFileSync('./src/NewsClassificationOracle.sol', 'utf8');
  sources['NewsClassificationOracle.sol'] = { content: mainContract };

  // Read interfaces
  const newsOracleInterface = fs.readFileSync('./src/interfaces/INewsOracle.sol', 'utf8');
  const erc8004Interface = fs.readFileSync('./src/interfaces/IERC8004.sol', 'utf8');
  const validationRegistryInterface = fs.readFileSync('./src/interfaces/IValidationRegistry.sol', 'utf8');

  sources['interfaces/INewsOracle.sol'] = { content: newsOracleInterface };
  sources['interfaces/IERC8004.sol'] = { content: erc8004Interface };
  sources['interfaces/IValidationRegistry.sol'] = { content: validationRegistryInterface };

  console.log('🔨 Compiling NewsClassificationOracle V2...');

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode'] }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  // Check for errors
  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('❌ Compilation errors:');
      errors.forEach(error => console.error(error.formattedMessage));
      process.exit(1);
    }
  }

  const contractOutput = output.contracts['NewsClassificationOracle.sol']['NewsClassificationOracle'];
  const abi = contractOutput.abi;
  const bytecode = '0x' + contractOutput.evm.bytecode.object;

  console.log('✅ Compilation successful!\n');

  // Deploy contract
  console.log('📝 Deploying contract...');

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  const oracle = await factory.deploy(IDENTITY_REGISTRY, {
    gasLimit: 3000000
  });

  await oracle.waitForDeployment();
  const address = await oracle.getAddress();

  console.log(`\n✅ NewsClassificationOracle V2 Deployed!`);
  console.log(`   Address: ${address}`);
  console.log(`   Identity Registry: ${IDENTITY_REGISTRY}`);

  // Save deployment info
  const deployment = {
    network: 'Base Mainnet',
    contract: 'NewsClassificationOracle V2',
    address: address,
    identityRegistry: IDENTITY_REGISTRY,
    validationRegistry: VALIDATION_REGISTRY,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    transactionHash: oracle.deploymentTransaction().hash
  };

  fs.writeFileSync(
    './deployments/oracle-v2-base.json',
    JSON.stringify(deployment, null, 2)
  );

  // Save ABI
  fs.writeFileSync(
    './abi/NewsClassificationOracle.json',
    JSON.stringify(abi, null, 2)
  );

  console.log(`\n📁 Deployment info saved to deployments/oracle-v2-base.json`);
  console.log(`📁 ABI saved to abi/NewsClassificationOracle.json`);

  console.log(`\n🔧 Next steps:`);
  console.log(`   1. Run: oracle.setOracleTokenId(1)  // Set Oracle token ID`);
  console.log(`   2. Run: oracle.setValidationRegistry("${VALIDATION_REGISTRY}")`);
  console.log(`   3. Update .env files with new Oracle address: ${address}`);
  console.log(`   4. Test posting a classification\n`);
}

main().catch(error => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});
