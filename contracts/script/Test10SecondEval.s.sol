// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/NewsClassificationOracleVerified.sol";
import "../src/TradingAgentEnhanced.sol";
import "../src/ZkMLVerificationRegistry.sol";

/**
 * @title Test10SecondEval
 * @notice Test the 10-second profitability evaluation
 */
contract Test10SecondEval is Script {
    address constant ORACLE = 0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a;
    address constant AGENT = 0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44;
    address constant REGISTRY = 0xC9a94a1168eB7ad8146f26B8F5dFcdC50d0Eb33E;

    function run() external view {
        console.log("========================================");
        console.log("10-SECOND PROFITABILITY TEST");
        console.log("========================================");
        console.log("");

        NewsClassificationOracleVerified oracle = NewsClassificationOracleVerified(ORACLE);
        TradingAgentEnhanced agent = TradingAgentEnhanced(payable(AGENT));
        ZkMLVerificationRegistry registry = ZkMLVerificationRegistry(REGISTRY);

        console.log("Step 1: Check current setup");
        console.log("----------------------------");

        // Check agent portfolio
        (uint256 wethBalance, uint256 usdcBalance) = agent.getPortfolio();
        console.log("WETH Balance:", wethBalance);
        console.log("USDC Balance:", usdcBalance);
        console.log("");

        // Check strategy settings
        console.log("Min Oracle Reputation:", agent.minOracleReputation());
        console.log("Min Confidence:", agent.minConfidence());
        console.log("Trade Size:", agent.tradeSize());
        console.log("");

        // Check oracle reputation
        uint256 oracleReputation = registry.getReputationScore(1, "news_classification");
        console.log("Oracle Reputation:", oracleReputation);
        console.log("");

        // Get trade stats
        (uint256 total, uint256 profitable, uint256 unprofitable, uint256 winRate) = agent.getTradeStats();
        console.log("Total Trades:", total);
        console.log("Profitable:", profitable);
        console.log("Unprofitable:", unprofitable);
        console.log("Win Rate:", winRate, "%");
        console.log("");

        console.log("========================================");
        console.log("NEXT STEPS");
        console.log("========================================");
        console.log("");
        console.log("To test 10-second evaluation:");
        console.log("");
        console.log("1. Post a new classification (BAD_NEWS recommended):");
        console.log("   The news service will automatically post when it detects new news");
        console.log("");
        console.log("2. Execute trade immediately:");
        console.log("   cast send", AGENT);
        console.log("   'reactToNews(bytes32)' <CLASSIFICATION_ID>");
        console.log("   --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $ORACLE_PRIVATE_KEY --legacy");
        console.log("");
        console.log("3. Wait 10 seconds, then evaluate:");
        console.log("   cast send", AGENT);
        console.log("   'evaluateTradeProfitability(bytes32)' <CLASSIFICATION_ID>");
        console.log("   --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $ORACLE_PRIVATE_KEY --legacy");
        console.log("");
        console.log("4. Report to registry (updates oracle reputation):");
        console.log("   cast send", AGENT);
        console.log("   'reportTradeToRegistry(bytes32)' <CLASSIFICATION_ID>");
        console.log("   --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $ORACLE_PRIVATE_KEY --legacy");
        console.log("");
        console.log("5. Check updated reputation:");
        console.log("   cast call", REGISTRY);
        console.log("   'getReputationScore(uint256,string)(uint256)' 1 'news_classification'");
        console.log("   --rpc-url $BASE_SEPOLIA_RPC_URL");
        console.log("");
    }
}
