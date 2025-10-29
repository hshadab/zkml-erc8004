// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TradingAgentBase.sol";

contract ResetPortfolioValue is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address tradingAgentAddress = vm.envAddress("TRADING_AGENT_ADDRESS");

        console.log("========================================");
        console.log("RESET INITIAL PORTFOLIO VALUE");
        console.log("========================================");
        console.log("Trading Agent:", tradingAgentAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        TradingAgentBase tradingAgent = TradingAgentBase(payable(tradingAgentAddress));
        tradingAgent.resetInitialPortfolioValue();

        console.log("Portfolio value reset successfully!");
        console.log("Initial value:", tradingAgent.initialPortfolioValue());

        vm.stopBroadcast();
    }
}
