// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TradingAgentPolygonEnhanced.sol";
import "../src/interfaces/IZkMLVerificationRegistry.sol";
import "../src/interfaces/INewsOracle.sol";

contract DeployAgentPolygon is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracleAddr = vm.envAddress("POLYGON_ORACLE");
        address registryAddr = vm.envAddress("POLYGON_REGISTRY");
        address router = vm.envAddress("QUICKSWAP_ROUTER");
        address usdc = vm.envAddress("USDC_POLYGON");

        vm.startBroadcast(deployerPk);

        TradingAgentPolygonEnhanced agent = new TradingAgentPolygonEnhanced(
            oracleAddr,
            registryAddr,
            router,
            usdc
        );

        IZkMLVerificationRegistry registry = IZkMLVerificationRegistry(registryAddr);
        uint256 agentTokenId = registry.registerAgent("autonomous_trading");
        agent.setAgentTokenId(agentTokenId);

        vm.stopBroadcast();

        console.log("TradingAgentPolygonEnhanced:", address(agent));
        console.log("AgentTokenId:", agentTokenId);
    }
}

