#!/bin/bash

# ERC-8004 + X402 Integration Deployment Script
# Automates the complete deployment process

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  ERC-8004 + X402 Integration Deployment                       ║"
echo "║  Deploy contracts and update services                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if [ ! -f ".env" ]; then
  echo -e "${RED}Error: .env file not found${NC}"
  echo "Please create .env with required variables:"
  echo "  - DEPLOYER_PRIVATE_KEY"
  echo "  - BASE_MAINNET_RPC_URL"
  echo "  - BASESCAN_API_KEY (optional, for verification)"
  exit 1
fi

# Load environment variables
source .env

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
  echo -e "${RED}Error: DEPLOYER_PRIVATE_KEY not set in .env${NC}"
  exit 1
fi

if [ -z "$BASE_MAINNET_RPC_URL" ]; then
  echo -e "${RED}Error: BASE_MAINNET_RPC_URL not set in .env${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"
echo ""

# Step 1: Deploy contracts
echo "══════════════════════════════════════════════════════════════"
echo "Step 1: Deploying Updated Contracts to Base Mainnet"
echo "══════════════════════════════════════════════════════════════"
echo ""

cd contracts

echo -e "${YELLOW}Building contracts...${NC}"
forge build

echo ""
echo -e "${YELLOW}Deploying contracts...${NC}"
echo "This will deploy:"
echo "  - ZkMLVerificationRegistry (with payment tracking)"
echo "  - NewsClassificationOracle (with postPaidClassification)"
echo "  - NewsVerifier"
echo "  - TradingAgentBase"
echo ""

read -p "Proceed with deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Deployment cancelled${NC}"
  exit 1
fi

# Deploy using DeployAll script
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url "$BASE_MAINNET_RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast \
  ${BASESCAN_API_KEY:+--verify --etherscan-api-key "$BASESCAN_API_KEY"}

# Extract deployed addresses from broadcast JSON
DEPLOYMENT_FILE="broadcast/DeployAll.s.sol/8453/run-latest.json"

if [ ! -f "$DEPLOYMENT_FILE" ]; then
  echo -e "${RED}Error: Deployment file not found at $DEPLOYMENT_FILE${NC}"
  echo "Please check deployment logs for errors"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Contracts deployed successfully${NC}"
echo ""

# Parse addresses from deployment
echo -e "${BLUE}Extracting contract addresses...${NC}"

REGISTRY_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "ZkMLVerificationRegistry") | .contractAddress' "$DEPLOYMENT_FILE" | head -1)
ORACLE_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "NewsClassificationOracle") | .contractAddress' "$DEPLOYMENT_FILE" | head -1)
VERIFIER_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "NewsVerifier") | .contractAddress' "$DEPLOYMENT_FILE" | head -1)
TRADING_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "TradingAgentBase") | .contractAddress' "$DEPLOYMENT_FILE" | head -1)
GROTH16_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "Groth16Verifier") | .contractAddress' "$DEPLOYMENT_FILE" | head -1)

echo ""
echo "Deployed Addresses:"
echo "  Registry:  $REGISTRY_ADDRESS"
echo "  Oracle:    $ORACLE_ADDRESS"
echo "  Verifier:  $VERIFIER_ADDRESS"
echo "  Trading:   $TRADING_ADDRESS"
echo "  Groth16:   $GROTH16_ADDRESS"
echo ""

# Save addresses to file
cat > ../deployed-addresses.json << EOF
{
  "network": "Base Mainnet",
  "chainId": 8453,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contracts": {
    "ZkMLVerificationRegistry": "$REGISTRY_ADDRESS",
    "NewsClassificationOracle": "$ORACLE_ADDRESS",
    "NewsVerifier": "$VERIFIER_ADDRESS",
    "TradingAgentBase": "$TRADING_ADDRESS",
    "Groth16Verifier": "$GROTH16_ADDRESS"
  }
}
EOF

echo -e "${GREEN}✓ Addresses saved to deployed-addresses.json${NC}"
echo ""

cd ..

# Step 2: Register oracle agent
echo "══════════════════════════════════════════════════════════════"
echo "Step 2: Registering Oracle Agent (ERC-8004)"
echo "══════════════════════════════════════════════════════════════"
echo ""

echo -e "${YELLOW}Registering oracle as ERC-8004 agent...${NC}"

# Create registration script
cat > register-oracle.js << 'EOFJS'
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const REGISTRY_ABI = [
  'function registerAgent(string calldata capabilityType) external returns (uint256 tokenId)',
  'function authorizeContract(address contractAddress, bool authorized) external',
  'function getReputationScore(uint256 tokenId, string calldata capabilityType) external view returns (uint256)'
];

async function register() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  const registryAddress = process.argv[2];
  const oracleAddress = process.argv[3];

  const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, wallet);

  console.log('Registering oracle agent...');
  const tx1 = await registry.registerAgent('news_classification');
  const receipt1 = await tx1.wait();

  // Parse tokenId from logs
  const tokenId = receipt1.logs[0].topics[1];
  console.log(`✓ Oracle registered with token ID: ${parseInt(tokenId, 16)}`);

  console.log('Authorizing oracle contract...');
  const tx2 = await registry.authorizeContract(oracleAddress, true);
  await tx2.wait();
  console.log('✓ Oracle contract authorized');

  const reputation = await registry.getReputationScore(parseInt(tokenId, 16), 'news_classification');
  console.log(`Initial reputation: ${reputation}/1000`);

  return parseInt(tokenId, 16);
}

register()
  .then(tokenId => {
    console.log(`\nORACLE_TOKEN_ID=${tokenId}`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
EOFJS

ORACLE_TOKEN_ID=$(node register-oracle.js "$REGISTRY_ADDRESS" "$ORACLE_ADDRESS" | grep "ORACLE_TOKEN_ID=" | cut -d'=' -f2)

if [ -z "$ORACLE_TOKEN_ID" ]; then
  echo -e "${RED}Error: Failed to register oracle${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Oracle registered with token ID: $ORACLE_TOKEN_ID${NC}"
echo ""

rm register-oracle.js

# Step 3: Update environment variables
echo "══════════════════════════════════════════════════════════════"
echo "Step 3: Updating Environment Variables"
echo "══════════════════════════════════════════════════════════════"
echo ""

# Update local .env
echo -e "${YELLOW}Updating local .env file...${NC}"

cat >> .env << EOF

# ERC-8004 + X402 Integration (deployed $(date +%Y-%m-%d))
ORACLE_TOKEN_ID=$ORACLE_TOKEN_ID
ZKML_VERIFICATION_REGISTRY=$REGISTRY_ADDRESS
NEWS_ORACLE_ADDRESS=$ORACLE_ADDRESS
NEWS_VERIFIER_ADDRESS=$VERIFIER_ADDRESS
TRADING_AGENT_ADDRESS=$TRADING_ADDRESS
GROTH16_VERIFIER=$GROTH16_ADDRESS
EOF

echo -e "${GREEN}✓ Local .env updated${NC}"
echo ""

# Step 4: Update Render services (if Render API key provided)
if [ ! -z "$RENDER_API_KEY" ] && [ ! -z "$RENDER_SERVICE_ID" ]; then
  echo "══════════════════════════════════════════════════════════════"
  echo "Step 4: Updating Render Service"
  echo "══════════════════════════════════════════════════════════════"
  echo ""

  echo -e "${YELLOW}Updating Render environment variables...${NC}"

  # Prepare JSON payload
  cat > render-update.json << EOF
[
  {
    "key": "ORACLE_TOKEN_ID",
    "value": "$ORACLE_TOKEN_ID"
  },
  {
    "key": "ZKML_VERIFICATION_REGISTRY",
    "value": "$REGISTRY_ADDRESS"
  },
  {
    "key": "NEWS_ORACLE_ADDRESS",
    "value": "$ORACLE_ADDRESS"
  },
  {
    "key": "NEWS_VERIFIER_ADDRESS",
    "value": "$VERIFIER_ADDRESS"
  },
  {
    "key": "TRADING_AGENT_ADDRESS",
    "value": "$TRADING_ADDRESS"
  },
  {
    "key": "GROTH16_VERIFIER",
    "value": "$GROTH16_ADDRESS"
  }
]
EOF

  # Update via Render API
  curl -X PUT "https://api.render.com/v1/services/$RENDER_SERVICE_ID/env-vars" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d @render-update.json

  echo ""
  echo -e "${GREEN}✓ Render environment variables updated${NC}"

  # Trigger deployment
  echo -e "${YELLOW}Triggering Render deployment...${NC}"
  curl -X POST "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"clearCache": "do_not_clear"}'

  echo ""
  echo -e "${GREEN}✓ Render deployment triggered${NC}"

  rm render-update.json
else
  echo "══════════════════════════════════════════════════════════════"
  echo "Step 4: Manual Render Update Required"
  echo "══════════════════════════════════════════════════════════════"
  echo ""
  echo -e "${YELLOW}RENDER_API_KEY or RENDER_SERVICE_ID not set${NC}"
  echo "Please manually update Render environment variables:"
  echo ""
  echo "  ORACLE_TOKEN_ID=$ORACLE_TOKEN_ID"
  echo "  ZKML_VERIFICATION_REGISTRY=$REGISTRY_ADDRESS"
  echo "  NEWS_ORACLE_ADDRESS=$ORACLE_ADDRESS"
  echo "  NEWS_VERIFIER_ADDRESS=$VERIFIER_ADDRESS"
  echo "  TRADING_AGENT_ADDRESS=$TRADING_ADDRESS"
  echo "  GROTH16_VERIFIER=$GROTH16_ADDRESS"
  echo ""
fi

# Step 5: Verification tests
echo "══════════════════════════════════════════════════════════════"
echo "Step 5: Running Verification Tests"
echo "══════════════════════════════════════════════════════════════"
echo ""

echo -e "${YELLOW}Testing contract integration...${NC}"

# Create test script
cat > test-integration.js << 'EOFJS'
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_MAINNET_RPC_URL);
  const registryAddress = process.argv[2];
  const oracleTokenId = process.argv[3];

  const REGISTRY_ABI = [
    'function getReputationScore(uint256 tokenId, string calldata capabilityType) external view returns (uint256)',
    'function getPaymentStats(uint256 tokenId, string calldata capabilityType) external view returns (uint256 paidCount, uint256 totalReceived)',
    'function isAuthorized(uint256 tokenId, string calldata capabilityType) external view returns (bool)'
  ];

  const registry = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);

  console.log('Testing registry functions...');

  const reputation = await registry.getReputationScore(oracleTokenId, 'news_classification');
  console.log(`✓ Reputation: ${reputation}/1000`);

  const [paidCount, totalReceived] = await registry.getPaymentStats(oracleTokenId, 'news_classification');
  console.log(`✓ Payment stats: ${paidCount} paid, ${ethers.formatUnits(totalReceived, 6)} USDC total`);

  const authorized = await registry.isAuthorized(oracleTokenId, 'news_classification');
  console.log(`✓ Oracle authorized: ${authorized}`);

  if (reputation < 100) {
    console.log('\n⚠️  Reputation very low. New oracle detected.');
  }

  if (!authorized) {
    console.error('\n❌ Oracle not authorized!');
    process.exit(1);
  }

  console.log('\n✅ All integration tests passed');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
EOFJS

node test-integration.js "$REGISTRY_ADDRESS" "$ORACLE_TOKEN_ID"
TEST_RESULT=$?

rm test-integration.js

if [ $TEST_RESULT -ne 0 ]; then
  echo -e "${RED}✗ Integration tests failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Integration tests passed${NC}"
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   🎉 DEPLOYMENT COMPLETE! 🎉                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Deployment Summary:"
echo "─────────────────────────────────────────────────────────────────"
echo -e "${GREEN}✓${NC} Contracts deployed to Base Mainnet"
echo -e "${GREEN}✓${NC} Oracle registered with ERC-8004 token ID: $ORACLE_TOKEN_ID"
echo -e "${GREEN}✓${NC} Environment variables updated"
echo -e "${GREEN}✓${NC} Integration tests passed"
echo ""
echo "Contract Addresses:"
echo "  Registry:  $REGISTRY_ADDRESS"
echo "  Oracle:    $ORACLE_ADDRESS"
echo "  Verifier:  $VERIFIER_ADDRESS"
echo "  Trading:   $TRADING_ADDRESS"
echo ""
echo "Next Steps:"
echo "  1. Verify contracts on BaseScan (if not auto-verified)"
echo "  2. Fund oracle wallet with ETH for gas"
echo "  3. Fund trading agent with USDC"
echo "  4. Test X402 endpoints:"
echo "     curl https://trustlessdefi.onrender.com/.well-known/payment | jq ."
echo "  5. Monitor reputation growth:"
echo "     Watch BaseScan for PaymentRecorded events"
echo ""
echo "Documentation:"
echo "  - Deployment guide: ERC8004_X402_INTEGRATION_GUIDE.md"
echo "  - Architecture:     ERC8004_X402_INTEGRATION_ANALYSIS.md"
echo "  - Addresses saved:  deployed-addresses.json"
echo ""
echo -e "${GREEN}Happy building! 🚀${NC}"
echo ""
