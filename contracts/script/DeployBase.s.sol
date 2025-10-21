// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/Groth16Verifier.sol";
import "../src/NewsVerifier.sol";
import "../src/ZkMLVerificationRegistry.sol";
import "../src/NewsClassificationOracle.sol";
import "../src/TradingAgentBase.sol";

/**
 * @title DeployBase
 * @notice Deployment script for Base Mainnet deployment
 * @dev Deploys all contracts in correct order with proper initialization
 */
contract DeployBase is Script {
    // Base Mainnet Uniswap V3 addresses
    address constant UNISWAP_V3_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    uint24 constant POOL_FEE = 500; // 0.05%

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        console.log("========================================");
        console.log("BASE MAINNET DEPLOYMENT");
        console.log("========================================");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Oracle:", oracleAddress);
        console.log("Chain ID:", block.chainid);
        console.log("");

        // Step 1: Deploy Groth16 Verifier
        console.log("1/5 Deploying Groth16Verifier...");
        Groth16Verifier groth16Verifier = new Groth16Verifier();
        console.log("   Groth16Verifier:", address(groth16Verifier));

        // Step 2: Deploy News Verifier (wraps Groth16)
        console.log("2/5 Deploying NewsVerifier...");
        NewsVerifier newsVerifier = new NewsVerifier();
        console.log("   NewsVerifier:", address(newsVerifier));

        // Step 3: Deploy Verification Registry
        console.log("3/5 Deploying ZkMLVerificationRegistry...");
        ZkMLVerificationRegistry registry = new ZkMLVerificationRegistry();
        console.log("   Registry:", address(registry));

        // Step 4: Deploy News Oracle
        console.log("4/5 Deploying NewsClassificationOracle...");
        NewsClassificationOracle oracle = new NewsClassificationOracle(address(registry));
        console.log("   Oracle:", address(oracle));

        // Step 5: Deploy Trading Agent (Base version with Uniswap V3)
        console.log("5/5 Deploying TradingAgentBase...");
        TradingAgentBase agent = new TradingAgentBase(
            address(oracle),
            address(registry),
            UNISWAP_V3_ROUTER,
            WETH,
            USDC,
            POOL_FEE
        );
        console.log("   TradingAgent:", address(agent));

        // Note: Oracle owner is already set to deployer in constructor
        // setOracleTokenId should be called after registering the oracle in the registry
        console.log("");
        console.log("Oracle owner set to:", oracleAddress);

        // Note: Oracle needs to register itself as an agent in the registry
        // This should be done via oracle.setOracleTokenId() after calling
        // registry.registerAgent("news_classification") from the oracle address
        console.log("Oracle deployed. Register it by calling:");
        console.log("  1. registry.registerAgent('news_classification') from oracle owner");
        console.log("  2. oracle.setOracleTokenId(tokenId) with returned token ID");

        // Fund trading agent with initial WETH (0.01 ETH for testing)
        console.log("");
        console.log("Funding trading agent with 0.01 ETH...");
        (bool success,) = payable(address(agent)).call{value: 0.01 ether}("");
        require(success, "Failed to fund agent");
        console.log("   Agent funded with 0.01 ETH");

        vm.stopBroadcast();

        // Print summary
        console.log("");
        console.log("========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("Groth16Verifier:        ", address(groth16Verifier));
        console.log("NewsVerifier:           ", address(newsVerifier));
        console.log("VerificationRegistry:   ", address(registry));
        console.log("NewsOracle:             ", address(oracle));
        console.log("TradingAgentBase:       ", address(agent));
        console.log("");
        console.log("Uniswap V3 Router:      ", UNISWAP_V3_ROUTER);
        console.log("WETH:                   ", WETH);
        console.log("USDC:                   ", USDC);
        console.log("Pool Fee:               ", POOL_FEE);
        console.log("========================================");
        console.log("");
        console.log("Next steps:");
        console.log("1. Update .env files with deployed addresses");
        console.log("2. Verify contracts on BaseScan (optional)");
        console.log("3. Fund oracle wallet:", oracleAddress);
        console.log("4. Start news service and UI");
        console.log("========================================");
    }
}
