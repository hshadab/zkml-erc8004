// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ZkMLVerificationRegistry.sol";
import "../src/NewsClassificationOracle.sol";
import "../src/TradingAgent.sol";

/**
 * @title DeployScript
 * @notice Deployment script for all contracts on Base Sepolia
 * @dev Run with: forge script script/Deploy.s.sol:DeployScript --rpc-url base-sepolia --broadcast
 */
contract DeployScript is Script {
    // Base Sepolia addresses
    address constant UNISWAP_V3_ROUTER = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;  // Base Sepolia USDC

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts to Base Sepolia");
        console.log("Deployer address:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ZkMLVerificationRegistry
        console.log("\n1. Deploying ZkMLVerificationRegistry...");
        ZkMLVerificationRegistry registry = new ZkMLVerificationRegistry();
        console.log("   Registry deployed at:", address(registry));

        // 2. Deploy NewsClassificationOracle
        console.log("\n2. Deploying NewsClassificationOracle...");
        NewsClassificationOracle oracle = new NewsClassificationOracle(address(registry));
        console.log("   Oracle deployed at:", address(oracle));

        // 3. Register oracle as ERC-8004 agent
        console.log("\n3. Registering oracle as ERC-8004 agent...");
        uint256 oracleTokenId = registry.registerAgent("news_classification");
        console.log("   Oracle token ID:", oracleTokenId);

        // 4. Set oracle token ID
        console.log("\n4. Setting oracle token ID...");
        oracle.setOracleTokenId(oracleTokenId);
        console.log("   Oracle token ID set");

        // 5. Deploy TradingAgent
        console.log("\n5. Deploying TradingAgent...");
        TradingAgent agent = new TradingAgent(
            address(oracle),
            address(registry),
            UNISWAP_V3_ROUTER,
            USDC_BASE_SEPOLIA
        );
        console.log("   TradingAgent deployed at:", address(agent));

        // 6. Register agent as ERC-8004 agent
        console.log("\n6. Registering trading agent as ERC-8004 agent...");
        uint256 agentTokenId = registry.registerAgent("autonomous_trading");
        console.log("   Agent token ID:", agentTokenId);

        // 7. Set agent token ID
        console.log("\n7. Setting agent token ID...");
        agent.setAgentTokenId(agentTokenId);
        console.log("   Agent token ID set");

        vm.stopBroadcast();

        // Print summary
        console.log("\n========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("Network: Base Sepolia (Chain ID: 84532)");
        console.log("\nContracts:");
        console.log("  ZkMLVerificationRegistry:", address(registry));
        console.log("  NewsClassificationOracle:", address(oracle));
        console.log("  TradingAgent:", address(agent));
        console.log("\nERC-8004 Tokens:");
        console.log("  Oracle Token ID:", oracleTokenId);
        console.log("  Agent Token ID:", agentTokenId);
        console.log("\nNext Steps:");
        console.log("1. Verify contracts on BaseScan");
        console.log("2. Update .env files with contract addresses");
        console.log("3. Fund TradingAgent with Base Sepolia ETH and USDC");
        console.log("4. Start news-service to begin classifications");
        console.log("========================================");
    }
}
