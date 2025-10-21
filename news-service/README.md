# zkML News Service - Base Mainnet Trading Bot

Automated trading system that monitors news classifications on Base Mainnet and executes trades via Uniswap V3.

## Features

- **Polling-Based Event Detection** - Reliable event monitoring using block polling (every 10s)
- **Works with Free RPC Providers** - No paid API subscriptions required
- **Automated Trading** - React to news classifications with intelligent trades
- **Trade Evaluation** - Track profitability and report back to ERC-8004 registry
- **Production Ready** - Stable, tested, and battle-hardened

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  BASE TRADER (Polling Service)                              │
│  • Polls for new blocks every 10 seconds                    │
│  • Queries NewsClassified events in new blocks              │
│  • Processes events and executes trades                     │
│  • No filter expiration issues                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TRADING FLOW                                               │
│  1. NewsClassified event detected                           │
│  2. Classification ID extracted                              │
│  3. Trade executed via TradingAgent                          │
│  4. 11s wait (contract requirement)                          │
│  5. Trade profitability evaluated                            │
│  6. Results logged and tracked                              │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
cd news-service
npm install
```

## Configuration

Create a `.env` file:

```bash
# RPC Configuration - Use Base's free public RPC or any provider
BASE_MAINNET_RPC_URL=https://mainnet.base.org
POLYGON_RPC_URL=https://mainnet.base.org

# Oracle private key (for signing transactions)
ORACLE_PRIVATE_KEY=0x...

# Contract Addresses (Base Mainnet - Chain ID: 8453)
NEWS_ORACLE_CONTRACT_ADDRESS=0x...
TRADING_AGENT_ADDRESS=0x...
VERIFICATION_REGISTRY_ADDRESS=0x...
VALIDATION_REGISTRY_ADDRESS=0x...

# Uniswap V3 on Base Mainnet
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
WETH_ADDRESS=0x4200000000000000000000000000000000000006
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

## Usage

### Start Base Trader

```bash
# Start the polling-based trading bot
node src/startBaseTrader.js

# Or run in background
nohup node src/startBaseTrader.js > logs/base-trader.log 2>&1 &
```

You should see:

```
🚀 Starting BaseTrader service...
🔷 BaseTrader initialized
   Oracle: 0xe92c7aE...
   Agent: 0x0D43DC1...
   Wallet: 0x4E3eD68...
💰 Wallet balance: 0.011614885787883728 ETH
📊 Agent Portfolio: 0.000559628315115583 ETH, 20.25 USDC
🎧 Starting to poll for Base Mainnet trading signals...
   Starting from block: 37137445
✅ BaseTrader is now polling for events on Base Mainnet (every 10s)
```

### Monitor Logs

```bash
# Watch live logs
tail -f logs/base-trader.log

# Check for new events
grep "New classification detected" logs/base-trader.log
```

## How Polling Works

Unlike traditional event listeners (`.on()`), the BaseTrader uses **polling-based event detection**:

### Traditional Event Listeners (Unreliable)
```javascript
// ❌ This approach has issues with free RPC providers
contract.on('NewsClassified', handler);
// Problem: Event filters expire on free tiers
// Error: "filter not found" after ~5 minutes
```

### Polling Approach (Reliable)
```javascript
// ✅ Our approach - polls every 10 seconds
setInterval(async () => {
  const latestBlock = await provider.getBlockNumber();

  // Only query if there are new blocks
  if (latestBlock > lastCheckedBlock) {
    const events = await oracle.queryFilter(
      'NewsClassified',
      lastCheckedBlock + 1,
      latestBlock
    );

    // Process any new events
    for (const event of events) {
      await executeTrade(event.args.classificationId);
    }

    lastCheckedBlock = latestBlock;
  }
}, 10000); // Check every 10 seconds
```

**Benefits:**
- ✅ Works with ANY RPC provider (free or paid)
- ✅ No filter expiration issues
- ✅ Predictable resource usage
- ✅ Simple and easy to debug
- ✅ Max 10-second delay for event detection

**Performance:**
- RPC calls per hour: ~360 (well within free tier limits)
- Event detection delay: Max 10 seconds
- Perfect for infrequent events (news classifications)

## RPC Provider Recommendations

### Option 1: Base Public RPC (Free, Recommended)
```bash
BASE_MAINNET_RPC_URL=https://mainnet.base.org
```
- Official Base infrastructure
- No API key needed
- Reliable for polling

### Option 2: Alchemy Free Tier
```bash
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```
- Good for development
- 300M compute units/month free
- Polling uses ~10-20 CU per request

### Option 3: Other Providers
- Ankr, QuickNode, Infura all work fine
- Polling is provider-agnostic

## API Reference

### BaseTrader Class

```javascript
class BaseTrader {
  constructor(config)
  async startListening()      // Start polling for events
  async stopListening()        // Stop polling
  async executeTrade(classificationId)
  async getPortfolio()
  async getPortfolioValue()
  async getStats()
  async getRecentTrades(count)
}
```

### Configuration Object

```javascript
{
  rpcUrl: string,              // Base Mainnet RPC URL
  privateKey: string,          // Oracle wallet private key
  oracleAddress: string,       // NewsOracle contract address
  agentAddress: string,        // TradingAgent contract address
  registryAddress: string,     // VerificationRegistry address
  uniswapRouter: string,       // Uniswap V3 Router (optional)
  wethAddress: string,         // WETH address (optional)
  usdcAddress: string          // USDC address (optional)
}
```

## Troubleshooting

### "filter not found" errors
This should NOT happen with polling. If you see this error:
- Check that you're using the latest baseTrader.js (polling version)
- Restart the service to ensure polling is active

### Events not being detected
- Check that the service is running: `ps aux | grep startBaseTrader`
- Check the current block: Compare lastCheckedBlock to latest block on BaseScan
- Verify contract addresses in `.env` are correct
- Test RPC connection: `curl -X POST $RPC_URL -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`

### Out of gas errors
- Ensure oracle wallet has sufficient ETH: `cast balance $WALLET_ADDRESS --rpc-url $RPC_URL`
- Base Mainnet typically requires 0.001-0.01 ETH for gas

### Trade execution fails
- Check TradingAgent has tokens: Call `agent.getPortfolio()`
- Verify agent has trading permissions: Check `agentTokenId` is set
- Ensure 11+ seconds have passed since last trade for profitability evaluation

## File Structure

```
news-service/
├── src/
│   ├── baseTrader.js       # Main trading bot (polling-based)
│   ├── startBaseTrader.js  # Service entry point
│   └── logger.js           # Winston logger configuration
├── logs/                   # Log files
├── .env                    # Configuration
└── README.md              # This file
```

## Production Deployment

### Run as systemd service

Create `/etc/systemd/system/base-trader.service`:

```ini
[Unit]
Description=Base Mainnet Trading Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/zkml-erc8004/news-service
ExecStart=/usr/bin/node src/startBaseTrader.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable base-trader
sudo systemctl start base-trader
sudo systemctl status base-trader
```

### Run with PM2

```bash
pm2 start src/startBaseTrader.js --name base-trader
pm2 save
pm2 startup
```

## Advanced Configuration

### Adjust Polling Interval

Edit `src/baseTrader.js` line 86:

```javascript
}, 10000); // Change to 5000 for 5 seconds, 30000 for 30 seconds, etc.
```

Recommendations:
- **5 seconds**: More responsive, more RPC calls
- **10 seconds**: Balanced (recommended)
- **30 seconds**: Conservative, fewer RPC calls

### Custom Event Handling

Override the event handler in `baseTrader.js`:

```javascript
// Process each event
for (const event of events) {
  const { classificationId, headline, sentiment, confidence } = event.args;

  // Add custom logic here
  if (confidence < 80) {
    logger.info('Skipping low-confidence classification');
    continue;
  }

  await this.executeTrade(classificationId);
}
```

## Security Best Practices

1. **Never commit `.env` files** - Keep private keys secure
2. **Use environment variables** in production
3. **Limit wallet funds** - Only keep necessary ETH for gas
4. **Monitor logs** - Set up alerts for errors
5. **Use separate wallets** - Oracle wallet ≠ Trading agent wallet

## License

MIT

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-repo/zkml-erc8004/issues
- Documentation: https://github.com/your-repo/zkml-erc8004/tree/main/docs
