/**
 * Deploy TradingAgentBaseV2 with Uniswap V2 Router
 * Uses BaseSwap router on Base Mainnet
 */
import { ethers } from 'ethers';
import fs from 'fs';
import solc from 'solc';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('\n🚀 Deploying TradingAgentBaseV2 to Base Mainnet...\n');

  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Contract addresses
  const NEWS_ORACLE = process.env.NEWS_CLASSIFICATION_ORACLE;
  const VERIFICATION_REGISTRY = process.env.ZKML_VERIFICATION_REGISTRY;
  const BASESWAP_ROUTER = '0x327Df1E6de05895d2ab08513aaDD9313Fe505d86'; // BaseSwap (Uniswap V2 fork)
  const WETH = '0x4200000000000000000000000000000000000006'; // Base WETH
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC

  console.log('📋 Configuration:');
  console.log(`   Oracle: ${NEWS_ORACLE}`);
  console.log(`   Registry: ${VERIFICATION_REGISTRY}`);
  console.log(`   Router: ${BASESWAP_ROUTER} (BaseSwap V2)`);
  console.log(`   WETH: ${WETH}`);
  console.log(`   USDC: ${USDC}\n`);

  // Read and compile contract
  const sources = {};

  // Read main contract
  const mainContract = fs.readFileSync('./src/TradingAgentBaseV2.sol', 'utf8');
  sources['TradingAgentBaseV2.sol'] = { content: mainContract };

  // Read interface files
  const newsOracleInterface = fs.readFileSync('./src/interfaces/INewsOracle.sol', 'utf8');
  const registryInterface = fs.readFileSync('./src/interfaces/IZkMLVerificationRegistry.sol', 'utf8');
  const erc8004Interface = fs.readFileSync('./src/interfaces/IERC8004.sol', 'utf8');
  sources['interfaces/INewsOracle.sol'] = { content: newsOracleInterface };
  sources['interfaces/IZkMLVerificationRegistry.sol'] = { content: registryInterface };
  sources['interfaces/IERC8004.sol'] = { content: erc8004Interface };

  console.log('🔨 Compiling TradingAgentBaseV2...');

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

  const contract = output.contracts['TradingAgentBaseV2.sol']['TradingAgentBaseV2'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log('✅ Compilation successful\n');

  // Deploy
  console.log('📤 Deploying contract...');

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const tradingAgent = await factory.deploy(
    NEWS_ORACLE,
    VERIFICATION_REGISTRY,
    BASESWAP_ROUTER,
    WETH,
    USDC,
    { gasLimit: 3000000 }
  );

  console.log(`   TX Hash: ${tradingAgent.deploymentTransaction().hash}`);
  console.log(`   Waiting for confirmation...`);

  await tradingAgent.waitForDeployment();
  const address = await tradingAgent.getAddress();

  console.log(`\n✅ TradingAgentBaseV2 deployed!`);
  console.log(`   Address: ${address}`);
  console.log(`   🔗 BaseScan: https://basescan.org/address/${address}\n`);

  // Save deployment info
  const deployment = {
    network: 'Base Mainnet',
    contract: 'TradingAgentBaseV2',
    address: address,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    config: {
      newsOracle: NEWS_ORACLE,
      verificationRegistry: VERIFICATION_REGISTRY,
      swapRouter: BASESWAP_ROUTER,
      routerType: 'BaseSwap (Uniswap V2)',
      weth: WETH,
      usdc: USDC
    },
    transactionHash: tradingAgent.deploymentTransaction().hash
  };

  fs.writeFileSync(
    './deployments/trading-agent-v2-base.json',
    JSON.stringify(deployment, null, 2)
  );

  console.log('📁 Deployment info saved to deployments/trading-agent-v2-base.json\n');
  console.log('🎯 Next steps:');
  console.log(`   1. Update .env files with: TRADING_AGENT_ADDRESS=${address}`);
  console.log(`   2. Send USDC to agent for trading: ${address}`);
  console.log(`   3. Restart BaseTrader service to use new agent\n`);
}

main().catch(error => {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
});
