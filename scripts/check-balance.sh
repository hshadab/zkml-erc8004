#!/bin/bash

# Check wallet balance on Base Mainnet
# Usage: ./scripts/check-balance.sh

WALLET_ADDRESS="0x4ef498973F8927c89c43830Ca5bB428b20000d2D"
BASE_RPC="https://mainnet.base.org"

echo "=========================================="
echo "Checking Wallet Balance on Base Mainnet"
echo "=========================================="
echo "Wallet: $WALLET_ADDRESS"
echo ""

# Check if cast is available
if ! command -v cast &> /dev/null; then
    echo "❌ 'cast' command not found. Please install Foundry:"
    echo "   curl -L https://foundry.paradigm.xyz | bash"
    echo "   foundryup"
    exit 1
fi

# Get balance in wei
BALANCE_WEI=$(cast balance $WALLET_ADDRESS --rpc-url $BASE_RPC 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch balance. Check RPC connection."
    exit 1
fi

# Convert to ETH
BALANCE_ETH=$(cast --to-unit $BALANCE_WEI ether 2>/dev/null || echo "0")

# Calculate USD value (assuming $1800/ETH)
BALANCE_USD=$(echo "$BALANCE_ETH * 1800" | bc -l 2>/dev/null || echo "0")

echo "💰 Balance: $BALANCE_ETH ETH"
echo "💵 USD Value: \$$BALANCE_USD (at \$1800/ETH)"
echo ""

# Check if sufficient for deployment
REQUIRED_ETH="0.06"
if (( $(echo "$BALANCE_ETH >= $REQUIRED_ETH" | bc -l) )); then
    echo "✅ Sufficient balance for deployment (need $REQUIRED_ETH ETH)"
else
    NEEDED=$(echo "$REQUIRED_ETH - $BALANCE_ETH" | bc -l)
    echo "❌ Insufficient balance"
    echo "   Need: $REQUIRED_ETH ETH"
    echo "   Have: $BALANCE_ETH ETH"
    echo "   Missing: $NEEDED ETH (~\$$(echo "$NEEDED * 1800" | bc -l))"
    echo ""
    echo "📋 To fund wallet, send ETH to:"
    echo "   $WALLET_ADDRESS"
    echo ""
    echo "Options to get ETH on Base:"
    echo "1. Buy on Coinbase and send to Base network"
    echo "2. Bridge from Ethereum: https://bridge.base.org"
    echo "3. Buy on exchange and withdraw to Base"
fi

echo "=========================================="
echo "🔗 View on BaseScan:"
echo "   https://basescan.org/address/$WALLET_ADDRESS"
echo "=========================================="
