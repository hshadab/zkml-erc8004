// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ZkMLVerificationRegistry.sol";
import "../src/Groth16Verifier.sol";
import "../src/NewsVerifier.sol";
import "../src/NewsClassificationOracleVerified.sol";
import "../src/TradingAgentBase.sol";
import "../src/ValidationRegistry.sol";

/**
 * @title DeployAll
 * @notice Complete deployment for Base Mainnet with ERC-8004 + X402 integration
 * @dev Deploys all contracts in correct order with proper initialization
 */
contract DeployAll is Script {
    // Base Mainnet addresses
    address constant UNISWAP_V3_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address constant WETH_BASE_MAINNET = 0x4200000000000000000000000000000000000006;
    address constant USDC_BASE_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    uint24 constant POOL_FEE = 500; // 0.05% pool fee

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("ERC-8004 + X402 INTEGRATION DEPLOYMENT");
        console.log("Base Mainnet (Chain ID: 8453)");
        console.log("========================================");
        console.log("Deployer address:", deployer);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy ZkMLVerificationRegistry (ERC-8004)
        console.log("Step 1: Deploying ZkMLVerificationRegistry...");
        ZkMLVerificationRegistry registry = new ZkMLVerificationRegistry();
        console.log("   Registry deployed at:", address(registry));
        console.log("   Features: Payment tracking, dynamic reputation, X402 integration\n");

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

        // Step 4: Deploy ValidationRegistry
        console.log("Step 4: Deploying ValidationRegistry...");
        ValidationRegistry validationRegistry = new ValidationRegistry(address(registry));
        console.log("   ValidationRegistry deployed at:", address(validationRegistry));
        console.log("   Function: Validation request tracking\n");

        // Step 5: Deploy NewsClassificationOracle
        console.log("Step 5: Deploying NewsClassificationOracle...");
        NewsClassificationOracleVerified oracle = new NewsClassificationOracleVerified(
            address(registry),
            address(newsVerifier),
            address(validationRegistry)
        );
        console.log("   Oracle deployed at:", address(oracle));
        console.log("   Features: On-chain verification, paid classifications, X402 support\n");

        // Step 6: Deploy TradingAgentBase
        console.log("Step 6: Deploying TradingAgentBase...");
        TradingAgentBase agent = new TradingAgentBase(
            address(oracle),
            address(registry),
            UNISWAP_V3_ROUTER,
            WETH_BASE_MAINNET,
            USDC_BASE_MAINNET,
            POOL_FEE
        );
        console.log("   TradingAgent deployed at:", address(agent));
        console.log("   Features: Autonomous trading, reputation-based gating\n");

        vm.stopBroadcast();

        // Print complete summary
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================\n");

        console.log("Contract Addresses:");
        console.log("  ZkMLVerificationRegistry:", address(registry));
        console.log("  Groth16Verifier:", address(groth16));
        console.log("  NewsVerifier:", address(newsVerifier));
        console.log("  ValidationRegistry:", address(validationRegistry));
        console.log("  NewsClassificationOracle:", address(oracle));
        console.log("  TradingAgentBase:", address(agent));

        console.log("\nNetwork Configuration:");
        console.log("  Uniswap V3 Router:", UNISWAP_V3_ROUTER);
        console.log("  WETH (Base Mainnet):", WETH_BASE_MAINNET);
        console.log("  USDC (Base Mainnet):", USDC_BASE_MAINNET);
        console.log("  Pool Fee:", POOL_FEE);

        console.log("\nNew Features:");
        console.log("  [x] Payment-verified reputation (+5 bonus for paid work)");
        console.log("  [x] Reputation-based dynamic pricing (5 tiers)");
        console.log("  [x] X402 protocol integration");
        console.log("  [x] On-chain payment tracking");
        console.log("  [x] Groth16 proof verification");

        console.log("\nNext Steps:");
        console.log("1. Register oracle as ERC-8004 agent (run registration script)");
        console.log("2. Authorize oracle contract in registry");
        console.log("3. Update .env with deployed addresses");
        console.log("4. Update Render services");
        console.log("5. Test X402 endpoints");

        console.log("\n========================================\n");
    }
}
