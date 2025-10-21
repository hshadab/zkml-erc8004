# Deploy to Base Mainnet - Manual Steps

## ✅ Status
- Wallet funded: 0.066897 ETH ✅
- Contracts ready: TradingAgentBase.sol created ✅
- Deployment script ready: DeployBase.s.sol fixed ✅
- Foundry installed but PATH issue ⚠️

## 🚀 Deploy Now - Run These Commands

Open a new terminal and run:

```bash
# Navigate to contracts directory
cd /home/hshadab/zkml-erc8004/contracts

# Source bashrc to get forge in PATH
source ~/.bashrc

# Compile contracts
forge build

# Deploy to Base Mainnet
forge script script/DeployBase.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --legacy

# The deployment will output contract addresses like:
# Groth16Verifier: 0x...
# NewsVerifier: 0x...
# VerificationRegistry: 0x...
# NewsOracle: 0x...
# TradingAgentBase: 0x...
```

## 📝 After Deployment

Once you have the contract addresses, update these files:

### 1. `news-service/.env`
```bash
BASE_MAINNET_RPC_URL=https://mainnet.base.org
ORACLE_PRIVATE_KEY=0x24f49321aff04c4cfb5840a330bc15e4f7a8ee86cbee2aa0d274228a199b41a7

NEWS_ORACLE_CONTRACT_ADDRESS=<YOUR_ORACLE_ADDRESS>
VERIFICATION_REGISTRY_ADDRESS=<YOUR_REGISTRY_ADDRESS>
TRADING_AGENT_ADDRESS=<YOUR_AGENT_ADDRESS>
NEWS_VERIFIER_ADDRESS=<YOUR_VERIFIER_ADDRESS>
GROTH16_VERIFIER=<YOUR_GROTH16_ADDRESS>
```

### 2. `ui/.env`
```bash
BASE_MAINNET_RPC_URL=https://mainnet.base.org
ZKML_VERIFICATION_REGISTRY=<YOUR_REGISTRY_ADDRESS>
NEWS_ORACLE_ADDRESS=<YOUR_ORACLE_ADDRESS>
NEWS_VERIFIER_ADDRESS=<YOUR_VERIFIER_ADDRESS>
TRADING_AGENT_ADDRESS=<YOUR_AGENT_ADDRESS>
GROTH16_VERIFIER_ADDRESS=<YOUR_GROTH16_ADDRESS>
```

### 3. `contracts/.env`
Same addresses as above.

## ⚠️ If Forge Still Not Found

Run this first:
```bash
export PATH="$HOME/.foundry/bin:$PATH"
forge --version
```

If that works, proceed with deployment. If not:
```bash
# Reinstall Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
source ~/.bashrc
```

---

**Next**: After deployment succeeds, the codebase will be updated to remove all Polygon references and work with Base only.
