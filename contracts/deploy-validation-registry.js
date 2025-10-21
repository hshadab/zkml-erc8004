/**
 * Deploy ValidationRegistry (ERC-8004 Validation Registry)
 * Links to the existing Identity Registry
 */
import { ethers } from 'ethers';
import fs from 'fs';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('\n🚀 Deploying ValidationRegistry (ERC-8004) to Base Mainnet...\n');

  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Existing Identity Registry address
  const IDENTITY_REGISTRY = process.env.ZKML_VERIFICATION_REGISTRY;

  console.log('📋 Configuration:');
  console.log(`   Identity Registry: ${IDENTITY_REGISTRY}\n`);

  // Read and compile contract
  const sources = {};

  // Read main contract
  const mainContract = fs.readFileSync('./src/ValidationRegistry.sol', 'utf8');
  sources['ValidationRegistry.sol'] = { content: mainContract };

  // Read interfaces
  const registryInterface = fs.readFileSync('./src/interfaces/IZkMLVerificationRegistry.sol', 'utf8');
  const erc8004Interface = fs.readFileSync('./src/interfaces/IERC8004.sol', 'utf8');
  sources['interfaces/IZkMLVerificationRegistry.sol'] = { content: registryInterface };
  sources['interfaces/IERC8004.sol'] = { content: erc8004Interface };

  console.log('🔨 Compiling ValidationRegistry...');

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

  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('❌ Compilation errors:');
      errors.forEach(err => console.error(err.formattedMessage));
      process.exit(1);
    }
  }

  const contract = output.contracts['ValidationRegistry.sol']['ValidationRegistry'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log('✅ Compilation successful\n');

  // Deploy
  console.log('📤 Deploying contract...');

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const validationRegistry = await factory.deploy(IDENTITY_REGISTRY, {
    gasLimit: 2000000
  });

  console.log(`   TX Hash: ${validationRegistry.deploymentTransaction().hash}`);
  console.log(`   Waiting for confirmation...`);

  await validationRegistry.waitForDeployment();
  const address = await validationRegistry.getAddress();

  console.log(`\n✅ ValidationRegistry deployed!`);
  console.log(`   Address: ${address}`);
  console.log(`   🔗 BaseScan: https://basescan.org/address/${address}\n`);

  // Verify it's linked correctly
  const linkedRegistry = await validationRegistry.getIdentityRegistry();
  console.log(`✅ Verified link to Identity Registry: ${linkedRegistry}\n`);

  // Save deployment info
  const deployment = {
    network: 'Base Mainnet',
    contract: 'ValidationRegistry',
    address: address,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    config: {
      identityRegistry: IDENTITY_REGISTRY
    },
    transactionHash: validationRegistry.deploymentTransaction().hash
  };

  fs.writeFileSync(
    './deployments/validation-registry-base.json',
    JSON.stringify(deployment, null, 2)
  );

  console.log('📁 Deployment info saved to deployments/validation-registry-base.json\n');
  console.log('🎯 Next steps:');
  console.log(`   1. Register validator agent in Identity Registry (get token ID #3)`);
  console.log(`   2. Update .env: VALIDATION_REGISTRY=${address}`);
  console.log(`   3. Update NewsClassificationOracle to call requestValidation()`);
  console.log(`   4. Update NewsClassificationVerifier to call submitValidation()`);
  console.log(`   5. Test full ERC-8004 validation flow\n`);
}

main().catch(error => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});
