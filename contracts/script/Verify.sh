#!/bin/bash

# Verify contracts on BaseScan after deployment
# Usage: ./Verify.sh

source .env

echo "Verifying contracts on Base Sepolia..."

# Verify ZkMLVerificationRegistry
echo "Verifying ZkMLVerificationRegistry..."
forge verify-contract \
    --chain-id 84532 \
    --etherscan-api-key $BASESCAN_API_KEY \
    --watch \
    $ZKML_VERIFICATION_REGISTRY \
    src/ZkMLVerificationRegistry.sol:ZkMLVerificationRegistry

# Verify NewsClassificationOracle
echo "Verifying NewsClassificationOracle..."
forge verify-contract \
    --chain-id 84532 \
    --etherscan-api-key $BASESCAN_API_KEY \
    --watch \
    --constructor-args $(cast abi-encode "constructor(address)" $ZKML_VERIFICATION_REGISTRY) \
    $NEWS_CLASSIFICATION_ORACLE \
    src/NewsClassificationOracle.sol:NewsClassificationOracle

# Verify TradingAgent
echo "Verifying TradingAgent..."
UNISWAP_ROUTER="0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"
USDC="0x036CbD53842c5426634e7929541eC2318f3dCF7e"

forge verify-contract \
    --chain-id 84532 \
    --etherscan-api-key $BASESCAN_API_KEY \
    --watch \
    --constructor-args $(cast abi-encode "constructor(address,address,address,address)" $NEWS_CLASSIFICATION_ORACLE $ZKML_VERIFICATION_REGISTRY $UNISWAP_ROUTER $USDC) \
    $TRADING_AGENT_ADDRESS \
    src/TradingAgent.sol:TradingAgent

echo "Verification complete!"
