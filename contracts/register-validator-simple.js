/**
 * Register Validator Agent (Simple)
 * This version calls registerAgent with just capabilityType
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const REGISTRY_ABI = [
  'function registerAgent(string calldata capabilityType) external returns (uint256 tokenId)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function getAgentCapabilities(uint256 tokenId) external view returns (string[] memory)'
];

async function main() {
  console.log('\n🏛️ Registering Validator Agent in Identity Registry...\n');

  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log(`Deployer/Validator Owner: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  const REGISTRY_ADDRESS = process.env.ZKML_VERIFICATION_REGISTRY;

  console.log('📋 Configuration:');
  console.log(`   Identity Registry: ${REGISTRY_ADDRESS}\n`);

  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

  // Register validator with zkml-verification capability
  console.log('📝 Registering as Validator with zkml-verification capability...');

  const tx = await registry.registerAgent("zkml-verification", {
    gasLimit: 500000
  });

  console.log(`   TX Hash: ${tx.hash}`);
  console.log(`   Waiting for confirmation...`);

  const receipt = await tx.wait();

  // Get the token ID from the event or receipt
  const tokenId = await new Promise((resolve) => {
    registry.on('AgentRegistered', (returnedTokenId) => {
      resolve(returnedTokenId);
      registry.removeAllListeners();
    });
  });

  console.log(`\n✅ Validator Agent Registered!`);
  console.log(`   Token ID: #${tokenId}`);
  console.log(`   Owner: ${wallet.address}`);
  console.log(`   Capability: zkml-verification`);
  console.log(`   Block: ${receipt.blockNumber}`);

  // Verify registration
  const owner = await registry.ownerOf(tokenId);
  console.log(`\n✅ Verified: Token #${tokenId} owned by ${owner}`);

  const capabilities = await registry.getAgentCapabilities(tokenId);
  console.log(`   Capabilities: ${capabilities.join(', ')}\n`);

  console.log(`🎯 Next steps:`);
  console.log(`   1. Update .env with VALIDATOR_TOKEN_ID=${tokenId}`);
  console.log(`   2. Update NewsClassificationOracle to call ValidationRegistry.requestValidation()`);
  console.log(`   3. Update NewsClassificationVerifier to call ValidationRegistry.submitValidation()`);
  console.log(`   4. Test full ERC-8004 validation flow\n`);
}

main().catch(error => {
  console.error('❌ Registration failed:', error.message);
  if (error.receipt) {
    console.error('Transaction failed with status:', error.receipt.status);
  }
  process.exit(1);
});
