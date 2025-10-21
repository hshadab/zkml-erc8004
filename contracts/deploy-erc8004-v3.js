/**
 * Deploy ERC-8004 V3 (Fixed ValidationRegistry Integration)
 * 1. Deploy ZkMLVerificationRegistry (Identity Registry) with ownerOf()
 2. Deploy ValidationRegistry with authorized contract support
 * 3. Register Agent NFT #1 for Oracle wallet
 * 4. Authorize Oracle contract
 * 5. Update Oracle to use new ValidationRegistry
 */
import { ethers } from 'ethers';
import fs from 'fs';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('\n🚀 Deploying ERC-8004 V3 (Fixed) to Base Mainnet...\n');

  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance < ethers.parseEther('0.005')) {
    throw new Error('Insufficient balance for deployment');
  }

  // ======================
  // STEP 1: Deploy Identity Registry
  // ======================
  console.log('📝 STEP 1: Deploying ZkMLVerificationRegistry (Identity Registry)...\n');

  const identitySources = {};
  identitySources['ZkMLVerificationRegistry.sol'] = {
    content: fs.readFileSync('./src/ZkMLVerificationRegistry.sol', 'utf8')
  };
  identitySources['interfaces/IERC8004.sol'] = {
    content: fs.readFileSync('./src/interfaces/IERC8004.sol', 'utf8')
  };

  console.log('🔨 Compiling ZkMLVerificationRegistry...');
  const identityInput = {
    language: 'Solidity',
    sources: identitySources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode'] }
      }
    }
  };

  const identityOutput = JSON.parse(solc.compile(JSON.stringify(identityInput)));

  if (identityOutput.errors) {
    const errors = identityOutput.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:');
      errors.forEach(err => console.error(err.formattedMessage));
      throw new Error('Compilation failed');
    }
  }

  const identityContract = identityOutput.contracts['ZkMLVerificationRegistry.sol']['ZkMLVerificationRegistry'];
  const identityAbi = identityContract.abi;
  const identityBytecode = identityContract.evm.bytecode.object;

  console.log('✅ Compilation successful\n');
  console.log('📤 Deploying ZkMLVerificationRegistry...');

  const IdentityFactory = new ethers.ContractFactory(identityAbi, identityBytecode, wallet);
  const identityRegistry = await IdentityFactory.deploy({ gasLimit: 5000000 });
  await identityRegistry.waitForDeployment();

  const identityAddress = await identityRegistry.getAddress();
  console.log(`✅ ZkMLVerificationRegistry deployed at: ${identityAddress}\n`);

  // ======================
  // STEP 2: Deploy ValidationRegistry
  // ======================
  console.log('📝 STEP 2: Deploying ValidationRegistry...\n');

  const validationSources = {};
  validationSources['ValidationRegistry.sol'] = {
    content: fs.readFileSync('./src/ValidationRegistry.sol', 'utf8')
  };
  validationSources['interfaces/IZkMLVerificationRegistry.sol'] = {
    content: fs.readFileSync('./src/interfaces/IZkMLVerificationRegistry.sol', 'utf8')
  };
  validationSources['interfaces/IERC8004.sol'] = {
    content: fs.readFileSync('./src/interfaces/IERC8004.sol', 'utf8')
  };

  console.log('🔨 Compiling ValidationRegistry...');
  const validationInput = {
    language: 'Solidity',
    sources: validationSources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode'] }
      }
    }
  };

  const validationOutput = JSON.parse(solc.compile(JSON.stringify(validationInput)));

  if (validationOutput.errors) {
    const errors = validationOutput.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
      console.error('Compilation errors:');
      errors.forEach(err => console.error(err.formattedMessage));
      throw new Error('Compilation failed');
    }
  }

  const validationContract = validationOutput.contracts['ValidationRegistry.sol']['ValidationRegistry'];
  const validationAbi = validationContract.abi;
  const validationBytecode = validationContract.evm.bytecode.object;

  console.log('✅ Compilation successful\n');
  console.log(`📤 Deploying ValidationRegistry (linked to ${identityAddress})...`);

  const ValidationFactory = new ethers.ContractFactory(validationAbi, validationBytecode, wallet);
  const validationRegistry = await ValidationFactory.deploy(identityAddress, { gasLimit: 3000000 });
  await validationRegistry.waitForDeployment();

  const validationAddress = await validationRegistry.getAddress();
  console.log(`✅ ValidationRegistry deployed at: ${validationAddress}\n`);

  // ======================
  // STEP 3: Register Agent NFT #1
  // ======================
  console.log('📝 STEP 3: Registering Agent NFT #1 for Oracle wallet...\n');

  const registerTx = await identityRegistry.registerAgent('news_classification', { gasLimit: 300000 });
  const registerReceipt = await registerTx.wait();
  console.log(`✅ Agent NFT #1 registered (TX: ${registerReceipt.hash})\n`);

  // ======================
  // STEP 4: Authorize Oracle Contract
  // ======================
  const ORACLE_ADDRESS = process.env.NEWS_ORACLE_CONTRACT_ADDRESS;
  console.log(`📝 STEP 4: Authorizing Oracle contract (${ORACLE_ADDRESS})...\n`);

  const authTx = await identityRegistry.authorizeContract(ORACLE_ADDRESS, true, { gasLimit: 200000 });
  const authReceipt = await authTx.wait();
  console.log(`✅ Oracle contract authorized (TX: ${authReceipt.hash})\n`);

  // ======================
  // STEP 5: Update Oracle Contract
  // ======================
  console.log('📝 STEP 5: Updating Oracle contract with new ValidationRegistry...\n');

  const oracleAbi = [
    'function setValidationRegistry(address _validationRegistry) external',
    'function setVerificationRegistry(address _verificationRegistry) external',
    'function validationRegistry() view returns (address)',
    'function verificationRegistry() view returns (address)'
  ];

  const oracle = new ethers.Contract(ORACLE_ADDRESS, oracleAbi, wallet);

  const updateValidationTx = await oracle.setValidationRegistry(validationAddress, { gasLimit: 200000 });
  await updateValidationTx.wait();
  console.log(`✅ Oracle updated with ValidationRegistry: ${validationAddress}`);

  const updateVerificationTx = await oracle.setVerificationRegistry(identityAddress, { gasLimit: 200000 });
  await updateVerificationTx.wait();
  console.log(`✅ Oracle updated with VerificationRegistry: ${identityAddress}\n`);

  // ======================
  // Summary
  // ======================
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  ERC-8004 V3 Deployment Complete!                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('📋 Deployed Contracts:');
  console.log(`   Identity Registry:   ${identityAddress}`);
  console.log(`   Validation Registry: ${validationAddress}`);
  console.log(`   Oracle Contract:     ${ORACLE_ADDRESS} (updated)\n`);

  console.log('🎯 Next Steps:');
  console.log('   1. Update .env files with new addresses');
  console.log('   2. Restart news service');
  console.log('   3. Post test classification');
  console.log('   4. Verify validation request appears in UI\n');

  console.log('📝 Update these environment variables:');
  console.log(`   ZKML_VERIFICATION_REGISTRY=${identityAddress}`);
  console.log(`   VALIDATION_REGISTRY=${validationAddress}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
