#!/bin/bash
# ONE-CLICK POLYGON DEPLOYMENT (~$30 for 500+ trades!)
# This script deploys your zkML trading agent to Polygon PoS

set -e  # Exit on error

# Add Foundry to PATH
export PATH="$HOME/.foundry/bin:$PATH"

echo "════════════════════════════════════════════════════════════════"
echo "  🚀 POLYGON DEPLOYMENT - zkML Trading Agent"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if private key is set
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo -e "${RED}❌ ERROR: DEPLOYER_PRIVATE_KEY not set${NC}"
    echo ""
    echo "Please export your private key:"
    echo "  export DEPLOYER_PRIVATE_KEY=0x..."
    echo ""
    exit 1
fi

# Polygon configuration
POLYGON_RPC="https://polygon-rpc.com"
QUICKSWAP_ROUTER="0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
USDC_POLYGON="0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

echo -e "${YELLOW}📍 Network: Polygon PoS Mainnet (Chain ID: 137)${NC}"
echo -e "${YELLOW}💰 Estimated Cost: ~\$2 for deployment${NC}"
echo ""

# Get deployer address
DEPLOYER_ADDRESS=$(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY)
echo "Deployer: $DEPLOYER_ADDRESS"

# Check balance
BALANCE=$(cast balance $DEPLOYER_ADDRESS --rpc-url $POLYGON_RPC)
BALANCE_MATIC=$(echo "scale=4; $BALANCE / 1000000000000000000" | bc)
echo "Balance: $BALANCE_MATIC MATIC"
echo ""

if (( $(echo "$BALANCE_MATIC < 5" | bc -l) )); then
    echo -e "${RED}❌ Insufficient MATIC! You have $BALANCE_MATIC MATIC${NC}"
    echo "You need at least 5 MATIC (~\$4) for deployment"
    echo ""
    echo "Get MATIC from:"
    echo "  - Binance/Coinbase (withdraw to Polygon network)"
    echo "  - Bridge from Ethereum: https://wallet.polygon.technology/"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Sufficient balance for deployment${NC}"
echo ""

# Confirm deployment
read -p "Deploy to Polygon Mainnet? This will cost ~\$2. (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Step 1: Deploying Contracts"
echo "════════════════════════════════════════════════════════════════"
echo ""

cd /home/hshadab/zkml-erc8004/contracts

# Deploy contracts
forge script script/DeployComplete.s.sol \
  --rpc-url $POLYGON_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --legacy \
  -vvv | tee /tmp/polygon-deployment.log

# Extract addresses from deployment
REGISTRY_ADDR=$(grep "ZkMLVerificationRegistry:" /tmp/polygon-deployment.log | tail -1 | awk '{print $2}')
ORACLE_ADDR=$(grep "NewsClassificationOracle:" /tmp/polygon-deployment.log | tail -1 | awk '{print $2}')
AGENT_ADDR=$(grep "TradingAgent:" /tmp/polygon-deployment.log | tail -1 | awk '{print $2}')
VERIFIER_ADDR=$(grep "NewsVerifier:" /tmp/polygon-deployment.log | tail -1 | awk '{print $2}')
GROTH16_ADDR=$(grep "Groth16Verifier:" /tmp/polygon-deployment.log | tail -1 | awk '{print $2}')

echo ""
echo -e "${GREEN}✅ Contracts Deployed!${NC}"
echo ""
echo "Contract Addresses:"
echo "  Registry:  $REGISTRY_ADDR"
echo "  Oracle:    $ORACLE_ADDR"
echo "  Agent:     $AGENT_ADDR"
echo "  Verifier:  $VERIFIER_ADDR"
echo "  Groth16:   $GROTH16_ADDR"
echo ""

# Save addresses
cat > /home/hshadab/zkml-erc8004/.polygon-addresses <<EOF
POLYGON_REGISTRY=$REGISTRY_ADDR
POLYGON_ORACLE=$ORACLE_ADDR
POLYGON_AGENT=$AGENT_ADDR
POLYGON_VERIFIER=$VERIFIER_ADDR
POLYGON_GROTH16=$GROTH16_ADDR
EOF

echo "════════════════════════════════════════════════════════════════"
echo "  Step 2: Funding Trading Agent"
echo "════════════════════════════════════════════════════════════════"
echo ""

read -p "Fund TradingAgent with 10 MATIC (~\$10)? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cast send $AGENT_ADDR \
      --value 10ether \
      --rpc-url $POLYGON_RPC \
      --private-key $DEPLOYER_PRIVATE_KEY \
      --legacy

    echo ""
    echo -e "${GREEN}✅ Agent funded with 10 MATIC${NC}"
else
    echo "Skipping funding. You can fund later with:"
    echo "  cast send $AGENT_ADDR --value 10ether --rpc-url $POLYGON_RPC"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Step 3: Updating Configuration"
echo "════════════════════════════════════════════════════════════════"
echo ""

cd /home/hshadab/zkml-erc8004/news-service

# Update .env file
cat >> .env <<EOF

# Polygon Deployment
POLYGON_RPC_URL=$POLYGON_RPC
POLYGON_ORACLE=$ORACLE_ADDR
POLYGON_AGENT=$AGENT_ADDR
POLYGON_REGISTRY=$REGISTRY_ADDR
POLYGON_VERIFIER=$VERIFIER_ADDR
POLYGON_GROTH16=$GROTH16_ADDR
EOF

echo -e "${GREEN}✅ Configuration updated${NC}"
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "  ✅ DEPLOYMENT COMPLETE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📊 View on PolygonScan:"
echo "  https://polygonscan.com/address/$AGENT_ADDR"
echo ""
echo "🔍 View on QuickSwap:"
echo "  https://info.quickswap.exchange/"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Test one trade:"
echo "   cd /home/hshadab/zkml-erc8004/news-service"
echo "   ./test-polygon-trade.sh"
echo ""
echo "2. Run 500 trades:"
echo "   npm start"
echo ""
echo "3. Monitor trades:"
echo "   ./monitor-polygon.sh"
echo ""
echo "💰 Cost Estimate:"
echo "  - Deployment: ~\$2"
echo "  - Per trade: ~\$0.03"
echo "  - 500 trades: ~\$15"
echo "  - Total: ~\$27 for full demo!"
echo ""
echo "🏆 You now have the ONLY ERC-8004 demo with real trading!"
echo "════════════════════════════════════════════════════════════════"
