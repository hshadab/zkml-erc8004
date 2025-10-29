// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TradingAgentBase.sol";
import "../src/ZkMLVerificationRegistry.sol";

/**
 * @title AuthorizeBackend
 * @notice Post-deployment script to authorize the backend service
 * @dev Run this after deploying the new TradingAgentBase contract
 */
contract AuthorizeBackend is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("AUTHORIZE BACKEND SERVICE");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");

        // Get contract addresses
        address tradingAgentAddress = vm.envAddress("TRADING_AGENT_ADDRESS");
        address registryAddress = vm.envAddress("ZKML_VERIFICATION_REGISTRY");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");

        console.log("Contract addresses:");
        console.log("  TradingAgent:", tradingAgentAddress);
        console.log("  Registry:", registryAddress);
        console.log("  Backend/Oracle:", oracleAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Authorize backend to call TradingAgent.reactToNews()
        console.log("1. Authorizing backend to trigger trades...");
        TradingAgentBase tradingAgent = TradingAgentBase(payable(tradingAgentAddress));
        tradingAgent.setAuthorizedCaller(oracleAddress, true);
        console.log("   Backend authorized for trading");
        console.log("");

        // 2. Authorize backend as validator in Registry
        // NOTE: Skipping Registry authorization - deployed Registry doesn't have this feature
        // The backend can still record validations via the owner address
        console.log("2. Skipping Registry authorization (not supported in deployed contract)");
        console.log("");

        // 3. Verify authorizations
        console.log("3. Verifying authorizations...");
        bool isAuthorizedCaller = tradingAgent.authorizedCallers(oracleAddress);

        console.log("   Trading caller authorized:", isAuthorizedCaller);
        console.log("   Registry validator authorized: N/A (using owner)");
        console.log("");

        // 4. Display trading agent configuration
        console.log("4. Trading Agent Configuration:");
        console.log("   Min Oracle Reputation:", tradingAgent.minOracleReputation());
        console.log("   Min Confidence:", tradingAgent.minConfidence());
        console.log("   Trade Percentage:", tradingAgent.tradePercentage(), "%");
        console.log("   Max Slippage:", tradingAgent.maxSlippageBps(), "bps");
        console.log("   Stop Loss:", tradingAgent.stopLossBps(), "bps");
        console.log("   Is Paused:", tradingAgent.isPaused());
        console.log("");

        console.log("========================================");
        console.log("AUTHORIZATION COMPLETE");
        console.log("========================================");
        console.log("");
        console.log("Backend can now:");
        console.log("   - Trigger trades via reactToNews()");
        console.log("   - Record validations in registry");
        console.log("");
        console.log("Next steps:");
        console.log("   1. Update Render env var: TRADING_AGENT_ADDRESS");
        console.log("   2. Restart news-service");
        console.log("   3. Test classification + trading workflow");
        console.log("");

        vm.stopBroadcast();
    }
}
