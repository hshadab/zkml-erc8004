// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ZkMLVerificationRegistry.sol";

/**
 * @title UpgradeRegistry
 * @notice Deploy new registry and authorize oracle contract
 */
contract UpgradeRegistry is Script {
    address constant OLD_REGISTRY = 0x156f20Ee4c0d0c2B50c6C4d6Ea61B8149Ed3DFfe;
    address constant ORACLE_CONTRACT = 0x618DAb5EBaEeb427d29E8BCcED486377CC258D74;
    address constant TRADING_AGENT = 0x2C348370074E573f665AEaDffd9af59A0a23bE8e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        console.log("========================================");
        console.log("REGISTRY UPGRADE - Base Sepolia");
        console.log("========================================");
        console.log("Old Registry:", OLD_REGISTRY);
        console.log("Oracle Contract:", ORACLE_CONTRACT);
        console.log("Trading Agent:", TRADING_AGENT);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy new registry
        console.log("Step 1: Deploying new ZkMLVerificationRegistry...");
        ZkMLVerificationRegistry newRegistry = new ZkMLVerificationRegistry();
        console.log("   New Registry deployed at:", address(newRegistry));
        console.log("");

        // Step 2: Re-register oracle with new registry
        console.log("Step 2: Registering Oracle...");
        uint256 oracleTokenId = newRegistry.registerAgent("news_classification");
        console.log("   Oracle Token ID:", oracleTokenId);
        console.log("   Initial Reputation: 250/1000");
        console.log("");

        // Step 3: Re-register trading agent
        console.log("Step 3: Registering Trading Agent...");
        uint256 agentTokenId = newRegistry.registerAgent("autonomous_trading");
        console.log("   Agent Token ID:", agentTokenId);
        console.log("   Initial Reputation: 250/1000");
        console.log("");

        // Step 4: Authorize oracle contract to submit proofs
        console.log("Step 4: Authorizing Oracle Contract...");
        newRegistry.authorizeContract(ORACLE_CONTRACT, true);
        console.log("   Oracle contract authorized to submit proofs");
        console.log("");

        // Step 5: Authorize trading agent contract (for reputation updates)
        console.log("Step 5: Authorizing Trading Agent...");
        newRegistry.authorizeContract(TRADING_AGENT, true);
        console.log("   Trading agent authorized");
        console.log("");

        vm.stopBroadcast();

        console.log("========================================");
        console.log("UPGRADE COMPLETE");
        console.log("========================================");
        console.log("");
        console.log("New Registry Address:", address(newRegistry));
        console.log("Oracle Token ID:", oracleTokenId);
        console.log("Agent Token ID:", agentTokenId);
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update oracle contract registry address:");
        console.log("   cast send", ORACLE_CONTRACT, "\\");
        console.log("     'updateRegistry(address)'", address(newRegistry), "\\");
        console.log("     --private-key $DEPLOYER_PRIVATE_KEY \\");
        console.log("     --rpc-url https://sepolia.base.org");
        console.log("");
        console.log("2. Update trading agent registry address:");
        console.log("   cast send", TRADING_AGENT, "\\");
        console.log("     'updateRegistry(address)'", address(newRegistry), "\\");
        console.log("     --private-key $DEPLOYER_PRIVATE_KEY \\");
        console.log("     --rpc-url https://sepolia.base.org");
        console.log("");
        console.log("3. Set token IDs:");
        console.log("   # Oracle");
        console.log("   cast send", ORACLE_CONTRACT, "\\");
        console.log("     'setOracleTokenId(uint256)'", oracleTokenId, "\\");
        console.log("     --private-key $DEPLOYER_PRIVATE_KEY \\");
        console.log("     --rpc-url https://sepolia.base.org");
        console.log("");
        console.log("   # Agent");
        console.log("   cast send", TRADING_AGENT, "\\");
        console.log("     'setAgentTokenId(uint256)'", agentTokenId, "\\");
        console.log("     --private-key $DEPLOYER_PRIVATE_KEY \\");
        console.log("     --rpc-url https://sepolia.base.org");
        console.log("");
        console.log("4. Update .env files with new registry address:");
        console.log("   ZKML_VERIFICATION_REGISTRY=", address(newRegistry));
        console.log("");
    }
}
