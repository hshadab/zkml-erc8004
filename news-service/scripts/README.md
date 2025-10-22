# Utility Scripts

## evaluate-pending-trade.js

Manually evaluate trade profitability for trades that haven't been evaluated yet.

### Usage

```bash
# Evaluate the most recent trade
node scripts/evaluate-pending-trade.js

# Evaluate a specific trade by classification ID
node scripts/evaluate-pending-trade.js 0x038114a244fae54537dbdea7443e5209978ef1681d72173f45044f6d9d0cf5f8
```

### Requirements

- Ensure `.env` file is properly configured with:
  - `BASE_MAINNET_RPC_URL` - Alchemy API endpoint
  - `ORACLE_PRIVATE_KEY` - Wallet private key
  - `TRADING_AGENT_ADDRESS` - Deployed trading agent contract

### What it does

1. Connects to Base Mainnet using configured RPC URL
2. Fetches the most recent trade (or specified trade)
3. Checks if evaluation is needed (trade must have `portfolioValueAfter = 0`)
4. Waits if necessary (minimum 10 seconds since trade execution)
5. Calls `evaluateTradeProfitability` on the TradingAgent contract
6. Reports final results and overall trading statistics
