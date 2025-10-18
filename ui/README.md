# zkML News Oracle - ERC-8004 Dashboard UI

A slick, real-time dashboard showcasing the zkML-powered news classification oracle with ERC-8004 verifiable agent capabilities.

## Features

### 🎯 Live Statistics
- **Total Classifications** - All-time count of news classifications
- **Oracle Reputation** - ERC-8004 trust score (0-1000)
- **Total Trades** - Autonomous trading executions
- **Win Rate** - 10-second profitability success rate

### 📰 Oracle Dashboard
- Real-time news classifications from CoinDesk
- Sentiment analysis (GOOD/BAD/NEUTRAL)
- Confidence scores and proof hashes
- zkML verification status

### 💼 Trading Agent Dashboard
- Autonomous trade execution history
- P&L tracking with 10-second evaluation
- Portfolio performance metrics
- Trade-by-trade profitability

### 💰 Live Portfolio
- WETH and USDC balances
- Real-time portfolio value
- 24-hour P&L tracking

### 🏛️ ERC-8004 Registry
- Registered agent capabilities
- Dynamic reputation scores
- Capability verification status
- Agent ownership information

## Design System

Based on the Circle-OOAK reference design:

- **Color Palette**: Dark navy background with blue, teal, and green accents
- **Typography**: System font stack for optimal readability
- **Animations**: Smooth transitions and state changes
- **Responsive**: Mobile-first grid layout
- **Auto-refresh**: Updates every 10 seconds

## Architecture

### Frontend (Single-Page Application)
- **File**: `public/index.html`
- **Framework**: Vanilla JavaScript (no build step required)
- **Styling**: Embedded CSS with CSS variables
- **Updates**: Fetch API with auto-refresh

### Backend (Express.js API)
- **File**: `server.js`
- **Framework**: Express.js
- **Blockchain**: ethers.js v6
- **Endpoints**: RESTful API for contract data

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check and contract addresses |
| `/api/stats` | GET | Overall statistics (classifications, reputation, trades) |
| `/api/classifications` | GET | Recent news classifications (last 10) |
| `/api/trades` | GET | Recent agent trades (last 10) |
| `/api/portfolio` | GET | Current portfolio balances and value |
| `/api/registry` | GET | ERC-8004 registered agents |
| `/api/addresses` | GET | Deployed contract addresses |

## Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your contract addresses
```

## Usage

```bash
# Start the dashboard
npm start

# Server will run at http://localhost:3001
# Open in browser to view the dashboard
```

## Configuration

Edit `.env` to configure:

```env
# Base Sepolia RPC
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Contract Addresses
ZKML_VERIFICATION_REGISTRY=0xC9a94a1168eB7ad8146f26B8F5dFcdC50d0Eb33E
NEWS_ORACLE_ADDRESS=0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a
TRADING_AGENT_ADDRESS=0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44

# Server Port
PORT=3001
```

## Contract Integration

The UI interacts with three main contracts:

### 1. ZkMLVerificationRegistry (ERC-8004)
- `getAgentInfo()` - Agent ownership and capabilities
- `getReputationScore()` - Dynamic trust scores
- Displays registered agents with reputation bars

### 2. NewsClassificationOracleVerified
- `getClassificationCount()` - Total classifications
- `getClassification()` - Individual classification details
- `ClassificationPosted` events - Real-time updates

### 3. TradingAgentEnhanced
- `getPortfolio()` - WETH and USDC balances
- `getTradeStats()` - Win rate and performance
- `getTradeDetails()` - Individual trade P&L
- `TradeExecuted` events - Trade notifications

## Technical Details

### Event Polling
- Queries last 10,000 blocks for events (~5 hours on Base)
- Auto-refresh every 10 seconds
- Efficient caching to minimize RPC calls

### Data Formatting
- ETH amounts: 4 decimal places
- USDC amounts: 2 decimal places
- Percentages: 2 decimal places
- Timestamps: Local timezone conversion

### Error Handling
- Graceful fallbacks for missing data
- Empty states for zero results
- Console logging for debugging

## Development

### Adding New Features

1. **New Dashboard Card**: Add to `dashboard-grid` in HTML
2. **New API Endpoint**: Add route in `server.js`
3. **New Data Source**: Add contract ABI and instance

### Styling

CSS variables in `:root`:
```css
--bg-primary: #0a0e1a
--bg-secondary: #131821
--accent-blue: #5b8cff
--accent-teal: #4de2cf
--accent-green: #10b981
```

### Workflow Animation

The hero workflow animates through 5 steps every 2 seconds:
1. Fetch News → 2. ML Classify → 3. Generate Proof → 4. Post On-Chain → 5. Agent Trades

## Deployment

### Local Development
```bash
npm start
```

### Production Deployment
1. Configure environment variables
2. Use process manager (PM2, systemd)
3. Set up reverse proxy (nginx)
4. Enable HTTPS with Let's Encrypt

### Example PM2 Setup
```bash
pm2 start server.js --name zkml-ui
pm2 save
pm2 startup
```

## Ecosystem Integration

### How This Fits Into ERC-8004

1. **Agent Registration**: Oracle and agent register capabilities on-chain
2. **Proof Submission**: Oracle submits zkML proofs for each classification
3. **Reputation Updates**: Trading results feed back to update oracle reputation
4. **Trust Decisions**: Other agents can query reputation to decide trust
5. **Dashboard Visibility**: This UI shows the complete lifecycle

### Broader Ecosystem

- **zkML Proofs**: JOLT-Atlas generates verifiable computation proofs
- **On-Chain Verification**: Groth16 verifier validates proofs
- **Autonomous Trading**: Agents act based on verified data
- **Reputation System**: Dynamic trust scores enable decentralized coordination

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### RPC Connection Issues
- Check `BASE_SEPOLIA_RPC_URL` in `.env`
- Verify network connectivity
- Try alternative RPC endpoint

### Contract Call Failures
- Verify contract addresses are correct
- Check if contracts are deployed
- Ensure RPC endpoint supports the chain

## License

MIT

## Links

- **Contracts**: `/home/hshadab/zkml-erc8004/contracts/`
- **News Service**: `/home/hshadab/zkml-erc8004/news-service/`
- **Documentation**: `/home/hshadab/zkml-erc8004/contracts/README_CIRCLE_OOAK_REFERENCE.md`
