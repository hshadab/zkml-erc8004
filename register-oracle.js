import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const REGISTRY_ABI = [
  'function registerAgent(string calldata capabilityType) external returns (uint256 tokenId)',
  'function authorizeContract(address contractAddress, bool authorized) external',
  'function getReputationScore(uint256 tokenId, string calldata capabilityType) external view returns (uint256)'
];

async function register() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  const registryAddress = process.argv[2];
  const oracleAddress = process.argv[3];

  const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, wallet);

  console.log('Registering oracle agent...');
  const tx1 = await registry.registerAgent('news_classification');
  const receipt1 = await tx1.wait();

  // Parse tokenId from logs
  const tokenId = receipt1.logs[0].topics[1];
  console.log(`✓ Oracle registered with token ID: ${parseInt(tokenId, 16)}`);

  console.log('Authorizing oracle contract...');
  const tx2 = await registry.authorizeContract(oracleAddress, true);
  await tx2.wait();
  console.log('✓ Oracle contract authorized');

  const reputation = await registry.getReputationScore(parseInt(tokenId, 16), 'news_classification');
  console.log(`Initial reputation: ${reputation}/1000`);

  return parseInt(tokenId, 16);
}

register()
  .then(tokenId => {
    console.log(`\nORACLE_TOKEN_ID=${tokenId}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
