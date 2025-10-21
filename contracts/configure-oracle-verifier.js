/**
 * Configure Oracle and Verifier with ValidationRegistry Integration
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const ORACLE_ABI = [
  'function setOracleTokenId(uint256 tokenId) external',
  'function setValidationRegistry(address _validationRegistry) external',
  'function oracleTokenId() external view returns (uint256)',
  'function owner() external view returns (address)'
];

const VERIFIER_ABI = [
  'function setValidatorTokenId(uint256 _validatorTokenId) external',
  'function setValidationRegistry(address _validationRegistry) external',
  'function validatorTokenId() external view returns (uint256)',
  'function owner() external view returns (address)'
];

async function main() {
  console.log('\n🔧 Configuring Oracle and Verifier with ERC-8004 ValidationRegistry...\n');

  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Contract addresses
  const ORACLE_ADDRESS = '0xB3729A213b31F4d68f9F97b5557743aCc8802762';
  const VERIFIER_ADDRESS = '0x0590f2DFa80BCCc948aDb992737305f2FD01ceba';
  const VALIDATION_REGISTRY = process.env.VALIDATION_REGISTRY_ADDRESS || '0x44fBb986C8705A1de9951131a48D8eBc142c08E6';

  console.log('📋 Configuration:');
  console.log(`   Oracle: ${ORACLE_ADDRESS}`);
  console.log(`   Verifier: ${VERIFIER_ADDRESS}`);
  console.log(`   Validation Registry: ${VALIDATION_REGISTRY}`);
  console.log(`   Oracle Token ID: 1`);
  console.log(`   Validator Token ID: 2\n`);

  // Connect to contracts
  const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, wallet);
  const verifier = new ethers.Contract(VERIFIER_ADDRESS, VERIFIER_ABI, wallet);

  // Configure Oracle
  console.log('🔧 Configuring Oracle...');

  try {
    console.log('   Setting Oracle Token ID to 1...');
    const tx1 = await oracle.setOracleTokenId(1, { gasLimit: 200000 });
    await tx1.wait();
    console.log(`   ✅ Oracle Token ID set (tx: ${tx1.hash})`);
  } catch (error) {
    console.log(`   ⚠️  Oracle Token ID already set or error: ${error.message}`);
  }

  try {
    console.log('   Setting Validation Registry address...');
    const tx2 = await oracle.setValidationRegistry(VALIDATION_REGISTRY, { gasLimit: 200000 });
    await tx2.wait();
    console.log(`   ✅ Validation Registry set (tx: ${tx2.hash})`);
  } catch (error) {
    console.log(`   ⚠️  Validation Registry already set or error: ${error.message}`);
  }

  // Configure Verifier
  console.log('\n🔧 Configuring Verifier...');

  try {
    console.log('   Setting Validator Token ID to 2...');
    const tx3 = await verifier.setValidatorTokenId(2, { gasLimit: 200000 });
    await tx3.wait();
    console.log(`   ✅ Validator Token ID set (tx: ${tx3.hash})`);
  } catch (error) {
    console.log(`   ⚠️  Validator Token ID already set or error: ${error.message}`);
  }

  try {
    console.log('   Setting Validation Registry address...');
    const tx4 = await verifier.setValidationRegistry(VALIDATION_REGISTRY, { gasLimit: 200000 });
    await tx4.wait();
    console.log(`   ✅ Validation Registry set (tx: ${tx4.hash})`);
  } catch (error) {
    console.log(`   ⚠️  Validation Registry already set or error: ${error.message}`);
  }

  // Verify configuration
  console.log('\n✅ Configuration Complete!\n');
  console.log('📊 Verification:');

  try {
    const oracleTokenId = await oracle.oracleTokenId();
    console.log(`   Oracle Token ID: ${oracleTokenId}`);
  } catch (e) {
    console.log(`   Oracle Token ID: Not readable`);
  }

  try {
    const validatorTokenId = await verifier.validatorTokenId();
    console.log(`   Validator Token ID: ${validatorTokenId}`);
  } catch (e) {
    console.log(`   Validator Token ID: Not readable`);
  }

  const finalBalance = await provider.getBalance(wallet.address);
  const spent = ethers.formatEther(balance - finalBalance);
  console.log(`\n💰 Gas spent: ${spent} ETH (~$${(parseFloat(spent) * 2500).toFixed(4)} USD at $2500/ETH)`);

  console.log('\n🎯 Next Steps:');
  console.log('   1. Update .env files with new contract addresses:');
  console.log(`      NEWS_ORACLE_ADDRESS=${ORACLE_ADDRESS}`);
  console.log(`      NEWS_VERIFIER_ADDRESS=${VERIFIER_ADDRESS}`);
  console.log('   2. Restart news service to use new contracts');
  console.log('   3. Test full flow: Post → Verify → Check validation history\n');
}

main().catch(error => {
  console.error('❌ Configuration failed:', error.message);
  process.exit(1);
});
