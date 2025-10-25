// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/NewsClassificationOracleVerified.sol";
import "../src/TradingAgentEnhanced.sol";
import "../src/ValidationRegistry.sol";

/**
 * @title RedeployWithNewRegistry
 * @notice Redeploy oracle and agent with new registry
 */
contract RedeployWithNewRegistry is Script {
    // New registry address
    address constant NEW_REGISTRY = 0xC9a94a1168eB7ad8146f26B8F5dFcdC50d0Eb33E;

    // Existing contracts
    address constant GROTH16_VERIFIER = 0x2B5D0aee4aEd6E90e63dEBa0D0244106308B9372;
    address constant NEWS_VERIFIER = 0x76a96c27BE6c96415f93514573Ee753582ebA5E6;

    // Base Sepolia addresses
    address constant UNISWAP_V3_ROUTER = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        console.log("========================================");
        console.log("REDEPLOY WITH NEW REGISTRY");
        console.log("========================================");
        console.log("New Registry:", NEW_REGISTRY);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy ValidationRegistry first
        console.log("Step 1: Deploying ValidationRegistry...");
        ValidationRegistry validationRegistry = new ValidationRegistry(NEW_REGISTRY);
        console.log("   ValidationRegistry deployed at:", address(validationRegistry));
        console.log("");

        // Deploy new Oracle
        console.log("Step 2: Deploying new NewsClassificationOracleVerified...");
        NewsClassificationOracleVerified newOracle = new NewsClassificationOracleVerified(
            NEW_REGISTRY,
            NEWS_VERIFIER,
            address(validationRegistry)
        );
        console.log("   New Oracle deployed at:", address(newOracle));
        console.log("");

        // Set oracle token ID (it's already registered as ID 1)
        console.log("Step 3: Setting Oracle Token ID...");
        newOracle.setOracleTokenId(1);
        console.log("   Oracle token ID set to: 1");
        console.log("");

        // Deploy new Trading Agent
        console.log("Step 4: Deploying new TradingAgentEnhanced...");
        TradingAgentEnhanced newAgent = new TradingAgentEnhanced(
            address(newOracle),
            NEW_REGISTRY,
            UNISWAP_V3_ROUTER,
            USDC_BASE_SEPOLIA
        );
        console.log("   New Agent deployed at:", address(newAgent));
        console.log("");

        // Set agent token ID (it's already registered as ID 2)
        console.log("Step 4: Setting Agent Token ID...");
        newAgent.setAgentTokenId(2);
        console.log("   Agent token ID set to: 2");
        console.log("");

        vm.stopBroadcast();

        console.log("========================================");
        console.log("REDEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("");
        console.log("Updated Addresses:");
        console.log("  ZkMLVerificationRegistry:", NEW_REGISTRY);
        console.log("  NewsClassificationOracle:", address(newOracle));
        console.log("  TradingAgent:", address(newAgent));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Authorize new oracle in registry:");
        console.log("   Already authorized:", address(newOracle) == 0x618DAb5EBaEeb427d29E8BCcED486377CC258D74 ? "YES" : "NO - NEEDS AUTHORIZATION");
        console.log("");
        console.log("2. Transfer funds from old agent to new agent:");
        console.log("   Old Agent: 0x2C348370074E573f665AEaDffd9af59A0a23bE8e");
        console.log("   New Agent:", address(newAgent));
        console.log("");
        console.log("3. Update .env files:");
        console.log("   ZKML_VERIFICATION_REGISTRY=", NEW_REGISTRY);
        console.log("   NEWS_ORACLE_ADDRESS=", address(newOracle));
        console.log("   TRADING_AGENT_ADDRESS=", address(newAgent));
        console.log("");
    }
}
