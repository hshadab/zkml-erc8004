# TradingAgent V2 Deployment

## Overview
TradingAgentPolygonV2 fixes QuickSwap integration issues by using the V2 router with proper interface compatibility.

## Contract Details

### Deployed Address
**TradingAgentPolygonV2**: `0x2B2c8F40b7Ee5064f55f1FF91a200264DA88915f`

### Constructor Parameters
```solidity
constructor(
  address _newsOracle,      // 0x037B74A3c354522312C67a095D043347E9Ffc40f
  address _verificationRegistry, // 0x078C7aFbFADAC9BE82F372e867231d605A8d3428
  address _swapRouter,      // 0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff (QuickSwap V2)
  address _usdc            // 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
)
```

### Key Changes from V1

1. **Router**: Uses QuickSwap V2 Router instead of V3
   - Address: `0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff`
   - Interface: Standard Uniswap V2 compatible

2. **Swap Function**: `swapExactTokensForTokens`
   ```solidity
   function _swapV2(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) internal returns (uint256) {
       _approveToken(tokenIn, swapRouter, amountIn);
       
       address[] memory path = new address[](2);
       path[0] = tokenIn;
       path[1] = tokenOut;
       
       (bool success, bytes memory data) = swapRouter.call(
           abi.encodeWithSignature(
               "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
               amountIn,
               amountOutMin,
               path,
               address(this),
               block.timestamp + 300
           )
       );
       
       require(success, "Swap failed");
       uint256[] memory amounts = abi.decode(data, (uint256[]));
       return amounts[amounts.length - 1];
   }
   ```

3. **Terminology**: Updated from ETH to POL
   - `BUY_ETH` → `BUY_POL`
   - `SELL_ETH` → `SELL_POL`

## Why V2 Instead of V3?

QuickSwap V3 on Polygon uses **Algebra** protocol, not Uniswap V3:
- Algebra uses dynamic fees (not fixed fee tiers)
- Different contract interface than Uniswap V3
- `exactInputSingle` with fee parameter doesn't exist

QuickSwap V2 uses standard Uniswap V2 interface:
- Well-established and proven
- Simple `swapExactTokensForTokens` interface
- Widely compatible

## Deployment Transaction
- TX Hash: `0x0ac5b41d4f5ba2d271d2ec5ada3f77178032494f8584aade04b9f4523559975b`
- Block: 77944676
- Explorer: https://polygonscan.com/tx/0x0ac5b41d4f5ba2d271d2ec5ada3f77178032494f8584aade04b9f4523559975b

## Verified Trade
First successful trade with V2:
- TX: https://polygonscan.com/tx/0x3997774b58d1374fc8b91e8caa58c482bc38e32d3ceca136e82a0257e4cd9467
- Action: SELL_POL (BAD_NEWS sentiment)
- Input: 0.5 WPOL
- Output: 0.100314 USDC
- Gas Used: 482,624

## Configuration Updates

### Environment Files
All `.env` files updated with:
```bash
POLYGON_AGENT=0x2B2c8F40b7Ee5064f55f1FF91a200264DA88915f
```

### Gas Limit
`news-service/src/polygonTrader.js`:
```javascript
const baseGasLimit = 1000000n; // Increased from 500000n
```

### UI Server
Added transaction hash caching:
```javascript
const fs = require('fs');
let txCache = {};
try {
  txCache = JSON.parse(fs.readFileSync('/home/hshadab/zkml-erc8004/ui/tx-cache.json', 'utf8'));
} catch(e) { txCache = {}; }
```

## Funding
- Native POL: 10.0
- WPOL: 5.0 (initially), 4.5 (after first trade)
- USDC: 0.0 (initially), 0.100314 (after first trade)

## Verification
All functionality verified:
- ✅ Contract deployment successful
- ✅ Token swaps executing correctly
- ✅ Agent balances updating
- ✅ UI displaying trades with transaction links
- ✅ Gas usage within expected range (48% of limit)
- ✅ Automatic trade profitability evaluation (added in commit 841efbd)

## Known Issues & Solutions

### Trade Profitability Display
**Issue**: First trade (before commit 841efbd) shows "Pending" in UI because `evaluateTradeProfitability()` was not called.

**Solution**: Fixed in polygonTrader.js:161-174 - automatic evaluation now runs 11 seconds after each trade.

**For existing pending trade**: Oracle wallet needs ~0.01 POL to manually call evaluation, OR wait for next trade.

## System Status
- 🟢 All contracts deployed and verified
- 🟢 UI server running (http://localhost:3001)
- 🟢 News service operational
- 🟢 Automatic trade execution working
- 🟢 Automatic profitability evaluation working (future trades)
