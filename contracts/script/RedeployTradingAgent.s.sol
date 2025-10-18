// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TradingAgentEnhanced.sol";

/**
 * @title RedeployTradingAgent
 * @notice Redeploy trading agent with 10-second evaluation period
 */
contract RedeployTradingAgent is Script {
    // Existing contracts
    address constant REGISTRY = 0xC9a94a1168eB7ad8146f26B8F5dFcdC50d0Eb33E;
    address constant ORACLE = 0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a;

    // Base Sepolia addresses
    address constant UNISWAP_V3_ROUTER = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    // Old agent to transfer funds from
    address constant OLD_AGENT = 0x00BD58929Bd5b184e48fb1aB72aB376D43B8b71D;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        console.log("========================================");
        console.log("REDEPLOY TRADING AGENT - 10 SECOND EVAL");
        console.log("========================================");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new Trading Agent with 10-second evaluation
        console.log("Step 1: Deploying new TradingAgentEnhanced...");
        TradingAgentEnhanced newAgent = new TradingAgentEnhanced(
            ORACLE,
            REGISTRY,
            UNISWAP_V3_ROUTER,
            USDC_BASE_SEPOLIA
        );
        console.log("   New Agent deployed at:", address(newAgent));
        console.log("");

        // Set agent token ID (it's already registered as ID 2)
        console.log("Step 2: Setting Agent Token ID...");
        newAgent.setAgentTokenId(2);
        console.log("   Agent token ID set to: 2");
        console.log("");

        vm.stopBroadcast();

        console.log("========================================");
        console.log("REDEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("");
        console.log("New TradingAgent:", address(newAgent));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Transfer funds from old agent:");
        console.log("   Old Agent:", OLD_AGENT);
        console.log("   New Agent:", address(newAgent));
        console.log("");
        console.log("2. Update .env files:");
        console.log("   TRADING_AGENT_ADDRESS=", address(newAgent));
        console.log("");
        console.log("3. Test 10-second profitability evaluation!");
        console.log("");
    }
}
