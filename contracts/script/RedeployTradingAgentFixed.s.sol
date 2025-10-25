// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TradingAgentBase.sol";

contract RedeployTradingAgentFixed is Script {
    // Base Mainnet addresses
    address constant NEWS_ORACLE = 0xfe47ba256043617f4acaF0c74Af25ba95be61b95;
    address constant VERIFICATION_REGISTRY = 0x0D5F44E626E56b928c273460C73bfe724aef977A;
    address constant UNISWAP_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481; // SwapRouter02
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    uint24 constant POOL_FEE = 500; // 0.05%

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ORACLE_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying TradingAgentBase with SwapRouter02 fix...");

        TradingAgentBase tradingAgent = new TradingAgentBase(
            NEWS_ORACLE,
            VERIFICATION_REGISTRY,
            UNISWAP_ROUTER,
            WETH,
            USDC,
            POOL_FEE
        );

        console.log("TradingAgentBase deployed to:", address(tradingAgent));
        console.log("Owner:", tradingAgent.owner());
        console.log("SwapRouter:", tradingAgent.swapRouter());
        console.log("Pool Fee:", tradingAgent.poolFee());

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Update your .env with:");
        console.log("TRADING_AGENT_ADDRESS=", address(tradingAgent));
    }
}
