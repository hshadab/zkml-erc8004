import { ethers } from 'ethers';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function deploy() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  console.log('Deploying from wallet:', wallet.address);

  // Read compiled contract
  const artifact = JSON.parse(fs.readFileSync('/home/hshadab/zkml-erc8004/contracts/out/TradingAgentBase.sol/TradingAgentBase.json', 'utf8'));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, wallet);

  console.log('Deploying TradingAgentBase with SwapRouter02 fix...');
  const contract = await factory.deploy(
    '0xfe47ba256043617f4acaF0c74Af25ba95be61b95', // NEWS_ORACLE
    '0x0D5F44E626E56b928c273460C73bfe724aef977A', // VERIFICATION_REGISTRY
    '0x2626664c2603336E57B271c5C0b26F421741e481', // UNISWAP_ROUTER (SwapRouter02)
    '0x4200000000000000000000000000000000000006', // WETH
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    500 // POOL_FEE
  );

  console.log('Deployment transaction sent:', contract.deploymentTransaction().hash);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('\n✅ TradingAgentBase deployed to:', address);
  console.log('Update your .env with: TRADING_AGENT_ADDRESS=' + address);
}

deploy().catch(console.error);
