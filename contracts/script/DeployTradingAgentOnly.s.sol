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

        // Chainlink price feeds on Base Mainnet
        // ETH/USD: 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70
        // USDC/USD: 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B
        // Or set to address(0) to disable oracle and use fallback price
        address ethUsdPriceFeed = vm.envOr("ETH_USD_PRICE_FEED", address(0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70));
        address usdcUsdPriceFeed = vm.envOr("USDC_USD_PRICE_FEED", address(0x7e860098F58bBFC8648a4311b374B1D669a2bc6B));

        console.log("Using existing contracts:");
        console.log("  NewsOracle:", newsOracle);
        console.log("  Registry:", verificationRegistry);
        console.log("  Uniswap Router:", uniswapRouter);
        console.log("  ETH/USD Feed:", ethUsdPriceFeed);
        console.log("  USDC/USD Feed:", usdcUsdPriceFeed);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy TradingAgentBase with security features
        console.log("Deploying TradingAgentBase with security features...");
        console.log("  - Access control (onlyAuthorized)");
        console.log("  - Slippage protection (1% default)");
        console.log("  - Chainlink price oracles");
        console.log("  - Stop-loss mechanism (10% default)");
        console.log("");

        TradingAgentBase tradingAgent = new TradingAgentBase(
            newsOracle,
            verificationRegistry,
            uniswapRouter,
            weth,
            usdc,
            3000, // 0.3% pool fee
            ethUsdPriceFeed,   // Chainlink ETH/USD
            usdcUsdPriceFeed   // Chainlink USDC/USD
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
