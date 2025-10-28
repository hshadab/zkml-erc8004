# Security Best Practices for zkML-ERC8004

## Table of Contents
1. [Private Key Management](#private-key-management)
2. [Smart Contract Security](#smart-contract-security)
3. [API Security](#api-security)
4. [Infrastructure Security](#infrastructure-security)
5. [Monitoring & Incident Response](#monitoring--incident-response)

---

## Private Key Management

### 🚨 CRITICAL: Never Commit Private Keys

**Current Issue:** Private keys stored in `.env` files can be accidentally committed to git.

**Solutions (Ranked by Security):**

### 1. Hardware Wallets (RECOMMENDED for Production)

**Best for:** Production deployments with significant funds

```bash
# Use Ledger or Trezor hardware wallet
# Requires physical confirmation for each transaction
```

**Pros:**
- Private keys never leave the device
- Physical confirmation required
- Immune to software exploits

**Cons:**
- Requires hardware purchase
- Slower transaction signing
- Not suitable for autonomous agents

**Implementation:**
```javascript
import { LedgerSigner } from '@ethersproject/hardware-wallets';

const signer = new LedgerSigner(provider, "m/44'/60'/0'/0/0");
```

### 2. AWS Secrets Manager / KMS (RECOMMENDED for Production)

**Best for:** Production autonomous agents on AWS

```bash
# Store private key in AWS Secrets Manager
aws secretsmanager create-secret \
  --name zkml/oracle-private-key \
  --secret-string "0x..."

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id zkml/oracle-private-key
```

**Implementation:**
```javascript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getPrivateKey() {
  const client = new SecretsManagerClient({ region: "us-east-1" });
  const command = new GetSecretValueCommand({
    SecretId: "zkml/oracle-private-key"
  });

  const response = await client.send(command);
  return response.SecretString;
}
```

**Pricing:** ~$0.40/month per secret + $0.05 per 10,000 API calls

### 3. HashiCorp Vault (RECOMMENDED for Enterprise)

**Best for:** Multi-cloud or on-premise deployments

```bash
# Store secret in Vault
vault kv put secret/zkml private_key="0x..."

# Retrieve in application
vault kv get -field=private_key secret/zkml
```

**Pros:**
- Advanced access control
- Audit logging
- Dynamic secrets
- Secret rotation

**Implementation:**
```javascript
import vault from "node-vault";

const client = vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

const { data } = await client.read('secret/data/zkml');
const privateKey = data.data.private_key;
```

### 4. Azure Key Vault (For Azure deployments)

```javascript
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";

const credential = new DefaultAzureCredential();
const client = new SecretClient(
  "https://your-vault.vault.azure.net",
  credential
);

const secret = await client.getSecret("oracle-private-key");
const privateKey = secret.value;
```

### 5. Environment Variables (MINIMUM for Development)

**⚠️ Only acceptable for development/testing**

```bash
# .env file (NEVER commit this)
ORACLE_PRIVATE_KEY=0x...

# .gitignore (MUST include)
.env
.env.*
*.key
secrets/
```

**Additional Protection:**
```bash
# Use git-secrets to prevent accidental commits
brew install git-secrets
git secrets --install
git secrets --register-aws
git secrets --add '0x[a-fA-F0-9]{64}'
```

---

## Recommended Setup by Environment

### Development (Local)
```
✅ Environment variables (.env)
✅ Never commit .env files
✅ Use test/dev wallets with small amounts
✅ git-secrets to scan commits
```

### Staging
```
✅ AWS Secrets Manager OR Azure Key Vault
✅ Separate wallet from production
✅ Restricted IAM permissions
✅ CloudWatch/Azure Monitor logging
```

### Production
```
✅ AWS Secrets Manager / KMS OR Hardware Wallet
✅ Multi-sig wallet for large funds
✅ Automated secret rotation
✅ Comprehensive audit logging
✅ Real-time monitoring & alerts
✅ Disaster recovery plan
```

---

## Smart Contract Security

### Access Control Best Practices

#### 1. Use Role-Based Access Control (RBAC)

```solidity
// GOOD: Role-based access control
mapping(address => bool) public authorizedCallers;

function reactToNews(bytes32 classificationId)
    external
    onlyAuthorized
    whenNotPaused
{
    // Only authorized addresses can call
}
```

#### 2. Multi-Signature for Critical Operations

```solidity
// For production, consider using Gnosis Safe
// https://github.com/safe-global/safe-contracts

// Example: Require 2-of-3 signatures for strategy updates
function updateStrategy(...) external {
    require(multiSig.isConfirmed(msg.sender, txId), "Not confirmed");
    // Update strategy
}
```

#### 3. Emergency Pause Mechanism

```solidity
// IMPLEMENTED: Emergency pause
bool public isPaused = false;

modifier whenNotPaused() {
    require(!isPaused, "Contract is paused");
    _;
}

function setPaused(bool _paused) external onlyOwner {
    isPaused = _paused;
    emit AgentPaused(_paused);
}
```

### Slippage Protection

```solidity
// FIXED: Now includes slippage protection
function _swapV3(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin)
    internal
    returns (uint256)
{
    // Calculate minimum output based on current price and max slippage
    require(amountOut >= amountOutMin, "Slippage too high");
}
```

### Price Oracle Integration

```solidity
// FIXED: Now uses Chainlink price feeds
function _getEthPriceInUsdc() internal view returns (uint256) {
    if (ethUsdPriceFeed != address(0)) {
        try this.getChainlinkPrice(ethUsdPriceFeed) returns (uint256 price) {
            return price / 100; // Convert to 6 decimals
        } catch {
            return FALLBACK_ETH_PRICE_USDC;
        }
    }
    return FALLBACK_ETH_PRICE_USDC;
}
```

---

## API Security

### 1. Rate Limiting (IMPLEMENTED)

```javascript
import { RateLimiter, createRateLimitMiddleware } from './rateLimiter.js';

const rateLimiter = new RateLimiter();

// Apply to classify endpoint
app.post('/api/classify',
  createRateLimitMiddleware(rateLimiter, {
    windowMs: 60000,
    maxRequests: 10,
    message: 'Too many classification requests'
  }),
  async (req, res) => { /* ... */ }
);
```

### 2. Input Validation (IMPLEMENTED)

```javascript
import { validateHeadline, validateTxHash } from './validators.js';

app.post('/api/classify', async (req, res) => {
  const { headline, paymentTx } = req.body;

  // Validate headline
  const headlineValidation = validateHeadline(headline);
  if (!headlineValidation.valid) {
    return res.status(400).json({ error: headlineValidation.error });
  }

  // Validate transaction hash
  if (paymentTx) {
    const txValidation = validateTxHash(paymentTx);
    if (!txValidation.valid) {
      return res.status(400).json({ error: txValidation.error });
    }
  }
});
```

### 3. CORS Configuration

```javascript
// Restrict CORS to specific origins in production
import cors from 'cors';

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : '*',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 4. Request Size Limits

```javascript
import express from 'express';

app.use(express.json({
  limit: '10kb' // Prevent large payload attacks
}));
```

---

## Infrastructure Security

### 1. RPC Provider Security

```bash
# Use Alchemy with API key rotation
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Rotate API keys every 90 days
# Monitor for unusual activity
```

### 2. Network Security

```bash
# Firewall rules (example for AWS Security Group)
# Only allow necessary ports
Inbound:
  - Port 443 (HTTPS) from 0.0.0.0/0
  - Port 22 (SSH) from YOUR_IP only

Outbound:
  - Port 443 (HTTPS) to 0.0.0.0/0 (for RPC calls)
  - Port 80 (HTTP) to 0.0.0.0/0 (for news feeds)
```

### 3. Logging & Monitoring

```javascript
// IMPLEMENTED: Structured logging with Winston
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log all transactions
logger.info('Trade executed', {
  classificationId,
  action,
  amountIn,
  amountOut,
  txHash
});
```

### 4. Automated Backups

```bash
# Backup strategy
1. Private keys: Encrypted backup in multiple locations
2. Database: Daily automated backups
3. Configuration: Version controlled in private repo
4. Audit logs: Retained for 1 year minimum
```

---

## Monitoring & Incident Response

### 1. Set Up Alerts

```javascript
// Alert on suspicious activity
const ALERT_THRESHOLDS = {
  MAX_GAS_PRICE: 100, // gwei
  MAX_TRADE_SIZE: 0.1, // ETH
  MIN_CONFIDENCE: 60, // %
  MAX_LOSS_PERCENTAGE: 10 // %
};

async function checkThresholds(trade) {
  if (trade.gasPrice > ALERT_THRESHOLDS.MAX_GAS_PRICE) {
    await sendAlert('High gas price detected', trade);
  }

  if (trade.lossPercentage > ALERT_THRESHOLDS.MAX_LOSS_PERCENTAGE) {
    await sendAlert('Large loss detected', trade);
    await pauseTrading(); // Auto-pause on significant loss
  }
}
```

### 2. Incident Response Plan

```
1. DETECTION
   - Monitor logs for errors
   - Track reputation scores
   - Watch for unusual gas usage

2. CONTAINMENT
   - Pause trading immediately: setPaused(true)
   - Stop news service
   - Revoke compromised API keys

3. INVESTIGATION
   - Review transaction history on Basescan
   - Check logs for suspicious activity
   - Verify private key not compromised

4. RECOVERY
   - Deploy fixed contracts if needed
   - Update configuration
   - Resume service gradually

5. POST-MORTEM
   - Document what happened
   - Implement additional safeguards
   - Update security procedures
```

### 3. Regular Security Audits

```bash
# Automated security scanning
npm audit                  # Check for vulnerable dependencies
slither .                  # Smart contract static analysis
mythril -x contracts/      # Symbolic execution for Solidity

# Manual review checklist (quarterly)
- [ ] Review access control lists
- [ ] Rotate API keys and secrets
- [ ] Update dependencies
- [ ] Review transaction logs for anomalies
- [ ] Test incident response procedures
```

---

## Checklist Before Production Deployment

### Pre-Deployment
- [ ] All private keys stored in secrets manager (not .env)
- [ ] Multi-signature wallet configured for large funds
- [ ] Rate limiting enabled on all API endpoints
- [ ] Input validation on all user inputs
- [ ] CORS restricted to specific origins
- [ ] Logging and monitoring configured
- [ ] Alert system tested and working
- [ ] Incident response plan documented
- [ ] Emergency pause mechanism tested
- [ ] Smart contracts audited by professionals

### Post-Deployment
- [ ] Monitor gas costs and optimize if needed
- [ ] Track reputation scores and adjust thresholds
- [ ] Review logs daily for first week
- [ ] Test emergency pause procedure
- [ ] Verify slippage protection working
- [ ] Confirm stop-loss triggers correctly
- [ ] Document all API endpoints and access controls

---

## Additional Resources

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/) - Secure smart contract libraries
- [Ethereum Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [AWS Well-Architected Framework - Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/)

---

**Last Updated:** 2025-10-28
