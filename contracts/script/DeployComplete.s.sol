// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ZkMLVerificationRegistry.sol";
import "../src/Groth16Verifier.sol";
import "../src/NewsVerifier.sol";
import "../src/NewsClassificationOracleVerified.sol";
import "../src/TradingAgentEnhanced.sol";
import "../src/ValidationRegistry.sol";

/**
 * @title DeployComplete
 * @notice Complete deployment with on-chain verification and reputation mechanics
 * @dev Deploys all contracts in correct order with proper initialization
 */
contract DeployComplete is Script {
    // Base Sepolia addresses
    address constant UNISWAP_V3_ROUTER = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("COMPLETE DEPLOYMENT - Base Sepolia");
        console.log("========================================");
        console.log("Deployer address:", deployer);
        console.log("Network: Base Sepolia (Chain ID: 84532)\n");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy ZkMLVerificationRegistry (ERC-8004)
        console.log("Step 1: Deploying ZkMLVerificationRegistry...");
        ZkMLVerificationRegistry registry = new ZkMLVerificationRegistry();
        console.log("   Registry deployed at:", address(registry));
        console.log("   Features: Dynamic reputation, validation tracking, streak bonuses\n");

        // Step 2: Deploy Groth16Verifier
        console.log("Step 2: Deploying Groth16Verifier...");
        Groth16Verifier groth16 = new Groth16Verifier();
        console.log("   Groth16Verifier deployed at:", address(groth16));
        console.log("   Function: Cryptographic proof verification\n");

        // Step 3: Deploy NewsVerifier (wraps Groth16)
        console.log("Step 3: Deploying NewsVerifier...");
        NewsVerifier newsVerifier = new NewsVerifier();
        console.log("   NewsVerifier deployed at:", address(newsVerifier));
        console.log("   Function: News classification proof storage\n");

        // Step 3.5: Deploy ValidationRegistry
        console.log("Step 3.5: Deploying ValidationRegistry...");
        ValidationRegistry validationRegistry = new ValidationRegistry(address(registry));
        console.log("   ValidationRegistry deployed at:", address(validationRegistry));
        console.log("   Function: Validation request tracking\n");

        // Step 4: Deploy NewsClassificationOracleVerified
        console.log("Step 4: Deploying NewsClassificationOracleVerified...");
        NewsClassificationOracleVerified oracle = new NewsClassificationOracleVerified(
            address(registry),
            address(newsVerifier),
            address(validationRegistry)
        );
        console.log("   Oracle deployed at:", address(oracle));
        console.log("   Features: On-chain verification, reputation integration\n");

        // Step 5: Register Oracle as ERC-8004 Agent
        console.log("Step 5: Registering Oracle as ERC-8004 agent...");
        uint256 oracleTokenId = registry.registerAgent("news_classification");
        console.log("   Oracle Token ID:", oracleTokenId);
        console.log("   Initial Reputation: 250/1000\n");

        // Step 6: Set Oracle Token ID
        console.log("Step 6: Configuring Oracle...");
        oracle.setOracleTokenId(oracleTokenId);
        console.log("   Oracle configured with token ID:", oracleTokenId, "\n");

        // Step 7: Deploy TradingAgentEnhanced
        console.log("Step 7: Deploying TradingAgentEnhanced...");
        TradingAgentEnhanced agent = new TradingAgentEnhanced(
            address(oracle),
            address(registry),
            UNISWAP_V3_ROUTER,
            USDC_BASE_SEPOLIA
        );
        console.log("   TradingAgent deployed at:", address(agent));
        console.log("   Features: Trade tracking, P&L calculation, reputation feedback\n");

        // Step 8: Register Trading Agent as ERC-8004 Agent
        console.log("Step 8: Registering Trading Agent...");
        uint256 agentTokenId = registry.registerAgent("autonomous_trading");
        console.log("   Agent Token ID:", agentTokenId);
        console.log("   Initial Reputation: 250/1000\n");

        // Step 9: Set Agent Token ID
        console.log("Step 9: Configuring Trading Agent...");
        agent.setAgentTokenId(agentTokenId);
        console.log("   Agent configured with token ID:", agentTokenId, "\n");

        vm.stopBroadcast();

        // Print complete summary
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================\n");

        console.log("Core Contracts:");
        console.log("  ZkMLVerificationRegistry:", address(registry));
        console.log("  Groth16Verifier:", address(groth16));
        console.log("  NewsVerifier:", address(newsVerifier));
        console.log("  NewsClassificationOracle:", address(oracle));
        console.log("  TradingAgent:", address(agent));

        console.log("\nERC-8004 Tokens:");
        console.log("  Oracle Token ID:", oracleTokenId, "(Reputation: 250)");
        console.log("  Agent Token ID:", agentTokenId, "(Reputation: 250)");

        console.log("\nIntegration Details:");
        console.log("  Uniswap V3 Router:", UNISWAP_V3_ROUTER);
        console.log("  USDC (Base Sepolia):", USDC_BASE_SEPOLIA);

        console.log("\nNew Features:");
        console.log("  [x] On-chain Groth16 proof verification");
        console.log("  [x] Dynamic reputation mechanics");
        console.log("  [x] Trade profitability tracking");
        console.log("  [x] Automatic oracle feedback");
        console.log("  [x] Validation history storage");
        console.log("  [x] Streak bonuses and progressive penalties");

        console.log("\nNext Steps:");
        console.log("1. Verify contracts on BaseScan:");
        console.log("   forge verify-contract <address> <contract> --chain-id 84532");
        console.log("\n2. Update .env files with addresses:");
        console.log("   ZKML_VERIFICATION_REGISTRY=", address(registry));
        console.log("   NEWS_ORACLE_ADDRESS=", address(oracle));
        console.log("   TRADING_AGENT_ADDRESS=", address(agent));
        console.log("   NEWS_VERIFIER_ADDRESS=", address(newsVerifier));
        console.log("\n3. Fund TradingAgent:");
        console.log("   - Send 0.1 Base Sepolia ETH");
        console.log("   - Send 10 USDC or swap ETH to WETH");
        console.log("\n4. Start news-service:");
        console.log("   cd news-service && npm start");
        console.log("\n5. Test manual classification:");
        console.log("   curl -X POST http://localhost:3000/api/demo/classify \\");
        console.log("     -d '{\"headline\": \"Bitcoin ETF approved\"}'");
        console.log("\n6. Monitor trades on BaseScan:");
        console.log("   https://sepolia.basescan.org/address/", address(agent));

        console.log("\n========================================");
        console.log("Ready for production testing!");
        console.log("========================================\n");
    }
}
