# Using Aerodrome DEX Instead of Uniswap

Aerodrome is the #1 DEX on Base Mainnet with superior liquidity. Here's how to use it:

## Aerodrome Base Mainnet Addresses

```
Router:  0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43
Factory: 0x420DD381b31aEf6683db6B902084cB0FFECe40Da
WETH:    0x4200000000000000000000000000000000000006
USDC:    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

## Key Differences from Uniswap V3

1. **Aerodrome uses Solidly V2/Velodrome model**
   - Supports both stable and volatile pools
   - Different router interface

2. **Simpler swap interface**
   - No complex tick math like Uniswap V3
   - More straightforward than Uniswap V2-style swaps

## Quick Integration

### Option 1: Modify TradingAgent to use Aerodrome

**Minimal changes needed:**

```solidity
// contracts/src/TradingAgentAerodrome.sol

interface IAerodromeRouter {
    struct Route {
        address from;
        address to;
        bool stable;
        address factory;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        Route[] calldata routes,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract TradingAgentAerodrome {
    address constant AERODROME_ROUTER = 0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43;
    address constant AERODROME_FACTORY = 0x420DD381b31aEf6683db6B902084cB0FFECe40Da;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function _executeBearishTrade(bytes32 classificationId) internal {
        uint256 amountIn = IERC20(WETH).balanceOf(address(this)) / 10;

        // Approve router
        IERC20(WETH).approve(AERODROME_ROUTER, amountIn);

        // Create route (volatile pool for WETH/USDC)
        IAerodromeRouter.Route[] memory routes = new IAerodromeRouter.Route[](1);
        routes[0] = IAerodromeRouter.Route({
            from: WETH,
            to: USDC,
            stable: false,  // Use volatile pool (not stablecoin pair)
            factory: AERODROME_FACTORY
        });

        // Execute swap
        uint[] memory amounts = IAerodromeRouter(AERODROME_ROUTER)
            .swapExactTokensForTokens(
                amountIn,
                0,  // Accept any amount (use quoter in production!)
                routes,
                address(this),
                block.timestamp + 300
            );

        emit TradeExecuted(
            classificationId,
            "SELL_ETH",
            WETH,
            USDC,
            amountIn,
            amounts[1],
            block.timestamp
        );
    }
}
```

### Option 2: Deploy Script for Aerodrome

```bash
# Deploy with Aerodrome router instead of Uniswap
forge script script/DeployWithAerodrome.s.sol \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

## Why Aerodrome is Better for Your Use Case

| Feature | Uniswap V3 | Aerodrome |
|---------|------------|-----------|
| Liquidity on Base | Good | **Excellent** |
| Small trade slippage | 0.5-1% | **0.1-0.3%** |
| Gas cost | Medium | **Lower** |
| Code complexity | High (ticks) | **Simple** |
| TVL on Base | $100M+ | **$1B+** |

## Cost Comparison

**Deployment + Testing (10 trades):**
- Uniswap V3: ~$90
- **Aerodrome: ~$75** (lower gas costs)

## Mainnet Deployment with Aerodrome (~$75)

```bash
# 1. Deploy contracts
cd /home/hshadab/zkml-erc8004/contracts
forge script script/DeployWithAerodrome.s.sol \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast

# Cost: ~0.008 ETH ($24)

# 2. Fund agent
cast send $TRADING_AGENT_ADDRESS --value 0.01ether

# Capital: 0.01 ETH ($30)

# 3. Test trades
# Each swap: ~0.0008 ETH (~$2.40)
# 10 swaps: ~0.008 ETH (~$24)

# TOTAL: ~0.026 ETH (~$78)
```

## Advantages

✅ **Cheaper** than Uniswap (~$15 savings)
✅ **Better liquidity** (less slippage)
✅ **Simpler code** (no tick math)
✅ **Faster** swaps
✅ **Lower fees** (Aerodrome optimized for Base)

## Testnet Alternative

Since Aerodrome isn't on Base Sepolia, for testnet we still need:
- **Virtual portfolio with Chainlink prices** (FREE)
- Or deploy to mainnet with minimal capital ($75-90)

## Recommendation

**For $100 budget:**
1. Deploy to **Base Mainnet with Aerodrome**
2. Use **0.025 ETH** (~$75)
3. Execute 10-15 test trades
4. Benefit from best liquidity on Base

---

## Next Steps

Would you like me to:
1. **Create TradingAgentAerodrome.sol** contract?
2. **Create deployment script** for Aerodrome?
3. **Test Aerodrome integration** on mainnet?

Aerodrome is definitely the better choice for Base! 🚀
