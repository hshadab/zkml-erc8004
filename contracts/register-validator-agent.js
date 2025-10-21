/**
 * Register Validator Agent in Identity Registry (ERC-8004)
 * This will mint token ID #3 for the NewsClassificationVerifier
 */
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const REGISTRY_ABI = [
  'function registerAgent(address agentAddress, string memory agentType, string memory metadata) external returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function getAgentInfo(uint256 tokenId) external view returns (address agentAddress, string agentType, string metadata, uint256 reputation, bool isActive)'
];

async function main() {
  console.log('\n🏛️ Registering Validator Agent in Identity Registry (ERC-8004)...\n');

  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  const REGISTRY_ADDRESS = process.env.ZKML_VERIFICATION_REGISTRY;
  const VERIFIER_ADDRESS = process.env.NEWS_VERIFIER_ADDRESS;

  console.log('📋 Configuration:');
  console.log(`   Identity Registry: ${REGISTRY_ADDRESS}`);
  console.log(`   NewsClassificationVerifier: ${VERIFIER_ADDRESS}\n`);

  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

  // Expected token ID #3 (Oracle=#1, TradingAgent=#2, Validator=#3)
  console.log(`Expected new token ID: #3\n`);

  // Register validator agent
  console.log('📝 Registering NewsClassificationVerifier as Validator...');

  const metadata = JSON.stringify({
    name: "NewsClassificationVerifier",
    description: "zkML proof verifier for news classifications (ERC-8004 Validator)",
    version: "1.0.0",
    role: "validator",
    capabilities: ["zkml-verification", "groth16-proofs", "erc8004-validation"]
  });

  const tx = await registry.registerAgent(
    VERIFIER_ADDRESS,
    "validator",
    metadata,
    { gasLimit: 500000 }
  );

  console.log(`   TX Hash: ${tx.hash}`);
  console.log(`   Waiting for confirmation...`);

  const receipt = await tx.wait();

  // Get the token ID from the event
  const event = receipt.logs.find(log => {
    try {
      const parsed = registry.interface.parseLog(log);
      return parsed.name === 'AgentRegistered';
    } catch {
      return false;
    }
  });

  let tokenId;
  if (event) {
    const parsed = registry.interface.parseLog(event);
    tokenId = parsed.args.tokenId;
  } else {
    tokenId = 3n; // Expected token ID #3
  }

  console.log(`\n✅ Validator Agent Registered!`);
  console.log(`   Token ID: #${tokenId}`);
  console.log(`   Agent Address: ${VERIFIER_ADDRESS}`);
  console.log(`   Type: validator`);
  console.log(`   Block: ${receipt.blockNumber}`);

  // Verify registration
  const owner = await registry.ownerOf(tokenId);
  console.log(`\n✅ Verified: Token #${tokenId} owned by ${owner}`);

  const agentInfo = await registry.getAgentInfo(tokenId);
  console.log(`\n📊 Agent Info:`);
  console.log(`   Address: ${agentInfo.agentAddress}`);
  console.log(`   Type: ${agentInfo.agentType}`);
  console.log(`   Reputation: ${agentInfo.reputation}`);
  console.log(`   Active: ${agentInfo.isActive}`);

  // Save deployment info
  const deployment = {
    network: 'Base Mainnet',
    agent: 'NewsClassificationVerifier (Validator)',
    tokenId: tokenId.toString(),
    agentAddress: VERIFIER_ADDRESS,
    registryAddress: REGISTRY_ADDRESS,
    timestamp: new Date().toISOString(),
    transactionHash: tx.hash
  };

  const fs = await import('fs');
  fs.writeFileSync(
    './deployments/validator-registration.json',
    JSON.stringify(deployment, null, 2)
  );

  console.log(`\n📁 Registration info saved to deployments/validator-registration.json`);
  console.log(`\n🎯 Next steps:`);
  console.log(`   1. Update NewsClassificationOracle to call ValidationRegistry.requestValidation()`);
  console.log(`   2. Update NewsClassificationVerifier to call ValidationRegistry.submitValidation()`);
  console.log(`   3. Test full ERC-8004 validation flow\n`);
}

main().catch(error => {
  console.error('❌ Registration failed:', error.message);
  process.exit(1);
});
