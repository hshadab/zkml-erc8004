// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

contract FundTradingAgent is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address tradingAgent = vm.envAddress("TRADING_AGENT_ADDRESS");

        console.log("========================================");
        console.log("FUND TRADING AGENT");
        console.log("========================================");
        console.log("Trading Agent:", tradingAgent);
        console.log("Amount: 0.005 ETH");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Send ETH to trading agent
        (bool success, ) = payable(tradingAgent).call{value: 0.005 ether}("");
        require(success, "ETH transfer failed");

        console.log("Funding successful!");
        console.log("New balance:", tradingAgent.balance);

        vm.stopBroadcast();
    }
}
