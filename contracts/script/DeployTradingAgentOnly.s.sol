// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TradingAgentBase.sol";

contract DeployTradingAgentOnly is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("DEPLOY TRADING AGENT ONLY");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("");

        // Get existing contract addresses from env
        address newsOracle = vm.envAddress("NEWS_ORACLE_ADDRESS");
        address verificationRegistry = vm.envAddress("ZKML_VERIFICATION_REGISTRY");
        address uniswapRouter = vm.envAddress("UNISWAP_V3_ROUTER");
        address weth = vm.envAddress("WETH_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");

        console.log("Using existing contracts:");
        console.log("  NewsOracle:", newsOracle);
        console.log("  Registry:", verificationRegistry);
        console.log("  Uniswap Router:", uniswapRouter);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy TradingAgentBase
        console.log("Deploying TradingAgentBase...");
        TradingAgentBase tradingAgent = new TradingAgentBase(
            newsOracle,
            verificationRegistry,
            uniswapRouter,
            weth,
            usdc,
            3000 // 0.3% pool fee
        );
        console.log("   TradingAgent:", address(tradingAgent));
        console.log("");

        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("TradingAgent:", address(tradingAgent));
        console.log("");
        console.log("Owner:", deployer);
        console.log("");

        vm.stopBroadcast();
    }
}
