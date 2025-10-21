/**
 * Deploy NewsClassificationOracleVerified V3 with ValidationRegistry Integration (ERC-8004)
 */
import { ethers } from 'ethers';
import fs from 'fs';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('\n🚀 Deploying NewsClassificationOracleVerified V3 (with ERC-8004 Validation) to Base Mainnet...\n');

  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Get existing contract addresses
  const IDENTITY_REGISTRY = process.env.ZKML_VERIFICATION_REGISTRY;
  const NEWS_VERIFIER = process.env.NEWS_VERIFIER_ADDRESS;
  const VALIDATION_REGISTRY = process.env.VALIDATION_REGISTRY_ADDRESS;

  console.log('📋 Configuration:');
  console.log(`   Identity Registry: ${IDENTITY_REGISTRY}`);
  console.log(`   News Verifier: ${NEWS_VERIFIER}`);
  console.log(`   Validation Registry: ${VALIDATION_REGISTRY}\n`);

  // Read and compile contract
  const sources = {};

  // Read main contract
  const mainContract = fs.readFileSync('./src/NewsClassificationOracleVerified.sol', 'utf8');
  sources['NewsClassificationOracleVerified.sol'] = { content: mainContract };

  // Read NewsVerifier contract
  const newsVerifierContract = fs.readFileSync('./src/NewsVerifier.sol', 'utf8');
  sources['NewsVerifier.sol'] = { content: newsVerifierContract };

  // Read Groth16Verifier contract (required by NewsVerifier)
  const groth16VerifierContract = fs.readFileSync('./src/Groth16Verifier.sol', 'utf8');
  sources['Groth16Verifier.sol'] = { content: groth16VerifierContract };

  // Read interfaces
  const newsOracleInterface = fs.readFileSync('./src/interfaces/INewsOracle.sol', 'utf8');
  const erc8004Interface = fs.readFileSync('./src/interfaces/IERC8004.sol', 'utf8');
  const validationRegistryInterface = fs.readFileSync('./src/interfaces/IValidationRegistry.sol', 'utf8');

  sources['interfaces/INewsOracle.sol'] = { content: newsOracleInterface };
  sources['interfaces/IERC8004.sol'] = { content: erc8004Interface };
  sources['interfaces/IValidationRegistry.sol'] = { content: validationRegistryInterface };

  console.log('🔨 Compiling NewsClassificationOracleVerified V3...');

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

  const contractOutput = output.contracts['NewsClassificationOracleVerified.sol']['NewsClassificationOracleVerified'];
  const abi = contractOutput.abi;
  const bytecode = '0x' + contractOutput.evm.bytecode.object;

  console.log('✅ Compilation successful!\n');

  // Deploy contract
  console.log('📝 Deploying contract...');

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  const oracle = await factory.deploy(
    IDENTITY_REGISTRY,
    NEWS_VERIFIER,
    VALIDATION_REGISTRY,
    {
      gasLimit: 3500000
    }
  );

  await oracle.waitForDeployment();
  const address = await oracle.getAddress();

  console.log(`\n✅ NewsClassificationOracleVerified V3 Deployed!`);
  console.log(`   Address: ${address}`);
  console.log(`   Identity Registry: ${IDENTITY_REGISTRY}`);
  console.log(`   News Verifier: ${NEWS_VERIFIER}`);
  console.log(`   Validation Registry: ${VALIDATION_REGISTRY}`);

  // Save deployment info
  const deployment = {
    network: 'Base Mainnet',
    contract: 'NewsClassificationOracleVerified V3',
    address: address,
    identityRegistry: IDENTITY_REGISTRY,
    newsVerifier: NEWS_VERIFIER,
    validationRegistry: VALIDATION_REGISTRY,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    transactionHash: oracle.deploymentTransaction().hash
  };

  fs.writeFileSync(
    './deployments/oracle-v3-base.json',
    JSON.stringify(deployment, null, 2)
  );

  // Save ABI
  fs.writeFileSync(
    './abi/NewsClassificationOracleVerified.json',
    JSON.stringify(abi, null, 2)
  );

  console.log(`\n📁 Deployment info saved to deployments/oracle-v3-base.json`);
  console.log(`📁 ABI saved to abi/NewsClassificationOracleVerified.json`);

  console.log(`\n🔧 Next steps:`);
  console.log(`   1. Run: oracle.setOracleTokenId(1)  // Set Oracle token ID`);
  console.log(`   2. Update .env files with new Oracle address: ${address}`);
  console.log(`   3. Test posting a classification\n`);
}

main().catch(error => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});
