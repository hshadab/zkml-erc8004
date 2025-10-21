/**
 * Deploy NewsVerifier V2 with ValidationRegistry Integration (ERC-8004)
 */
import { ethers } from 'ethers';
import fs from 'fs';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('\n🚀 Deploying NewsVerifier V2 (with ERC-8004 Validation) to Base Mainnet...\n');

  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Get existing contract addresses
  const VALIDATION_REGISTRY = process.env.VALIDATION_REGISTRY_ADDRESS;

  console.log('📋 Configuration:');
  console.log(`   Validation Registry: ${VALIDATION_REGISTRY}\n`);

  // Read and compile contract
  const sources = {};

  // Read main contract
  const newsVerifierContract = fs.readFileSync('./src/NewsVerifier.sol', 'utf8');
  const groth16Contract = fs.readFileSync('./src/Groth16Verifier.sol', 'utf8');

  sources['NewsVerifier.sol'] = { content: newsVerifierContract };
  sources['Groth16Verifier.sol'] = { content: groth16Contract };

  // Read interface
  const validationRegistryInterface = fs.readFileSync('./src/interfaces/IValidationRegistry.sol', 'utf8');
  sources['interfaces/IValidationRegistry.sol'] = { content: validationRegistryInterface };

  console.log('🔨 Compiling NewsVerifier V2...');

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

  const contractOutput = output.contracts['NewsVerifier.sol']['NewsVerifier'];
  const abi = contractOutput.abi;
  const bytecode = '0x' + contractOutput.evm.bytecode.object;

  console.log('✅ Compilation successful!\n');

  // Deploy contract
  console.log('📝 Deploying contract...');

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  const verifier = await factory.deploy({
    gasLimit: 5000000  // Higher gas limit for verifier
  });

  await verifier.waitForDeployment();
  const address = await verifier.getAddress();

  console.log(`\n✅ NewsVerifier V2 Deployed!`);
  console.log(`   Address: ${address}`);

  // Save deployment info
  const deployment = {
    network: 'Base Mainnet',
    contract: 'NewsVerifier V2',
    address: address,
    validationRegistry: VALIDATION_REGISTRY,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    transactionHash: verifier.deploymentTransaction().hash
  };

  fs.writeFileSync(
    './deployments/verifier-v2-base.json',
    JSON.stringify(deployment, null, 2)
  );

  // Save ABI
  fs.writeFileSync(
    './abi/NewsVerifier.json',
    JSON.stringify(abi, null, 2)
  );

  console.log(`\n📁 Deployment info saved to deployments/verifier-v2-base.json`);
  console.log(`📁 ABI saved to abi/NewsVerifier.json`);

  console.log(`\n🔧 Next steps:`);
  console.log(`   1. Run: verifier.setValidatorTokenId(2)  // Token ID #2 for validator`);
  console.log(`   2. Run: verifier.setValidationRegistry("${VALIDATION_REGISTRY}")`);
  console.log(`   3. Update .env files with new Verifier address: ${address}`);
  console.log(`   4. Test proof verification\n`);
}

main().catch(error => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});
