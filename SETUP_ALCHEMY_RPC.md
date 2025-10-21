# Setup Alchemy RPC for Base Mainnet (OPTIONAL)

## Current Issue
You're seeing "over rate limit" errors because the free Base RPC (`https://mainnet.base.org`) has rate limits.

## Solution: Use Alchemy (Free Tier)

### 1. Get Your Alchemy API Key
Go to: https://dashboard.alchemy.com/

1. Sign in / Sign up (free)
2. Click "Create New App"
3. Select:
   - Network: **Base**
   - Chain: **Mainnet**
4. Copy your API key

### 2. Update `.env` Files

Add your Alchemy key to these files:

**ui/.env:**
```bash
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

**news-service/.env:**
```bash
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

**contracts/.env:**
```bash
BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 3. Restart Services
```bash
# Kill all processes
pkill -9 -f "node server.js"
pkill -9 -f "node src/index.js"

# Start UI
cd ui
node server.js &

# Start News Service
cd ../news-service
node src/index.js
```

---

## Alternative: Wait for Rate Limit Reset

The free Base RPC rate limit resets every ~5 minutes. The server will automatically switch to backup RPCs:
1. `https://base.llamarpc.com`
2. `https://base-mainnet.public.blastapi.io`
3. `https://base.publicnode.com`

**Just wait 5 minutes and refresh** - it should work with the fallback RPCs.

---

## Why Alchemy is Better

- **Higher rate limits** (300 requests/second on free tier)
- **More reliable**
- **Better performance**
- **Free for hobby projects**

Alchemy free tier limits:
- 300 million compute units/month
- 300 requests/second
- Perfect for this project!

---

**TL;DR: Either add Alchemy key OR wait 5 minutes for rate limit to reset.**
