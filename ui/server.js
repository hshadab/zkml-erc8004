require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Contract addresses (from env or default to deployed addresses)
const REGISTRY_ADDRESS = process.env.ZKML_VERIFICATION_REGISTRY || '0xC9a94a1168eB7ad8146f26B8F5dFcdC50d0Eb33E';
const ORACLE_ADDRESS = process.env.NEWS_ORACLE_ADDRESS || '0x07F3210C3C602c0a04B0B8672419E6D177ABbe4a';
const AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS || '0x16A8db57Adcf8Fa25DB3b41E03B6b2bc332a0E44';

// Multiple RPC endpoints for fallback (in priority order)
const RPC_URLS = [
    process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    'https://polygon.llamarpc.com',
    'https://rpc-mainnet.maticvigil.com',
    'https://polygon-mainnet.public.blastapi.io'
];

// Initialize provider with timeout configuration
let provider = null;
let currentRpcIndex = 0;

function createProvider(rpcUrl) {
    return new ethers.JsonRpcProvider(rpcUrl, undefined, {
        staticNetwork: true,
        polling: false,
        timeout: 30000 // 30 second timeout
    });
}

// Create provider with fallback logic
async function initializeProvider() {
    for (let i = 0; i < RPC_URLS.length; i++) {
        try {
            const testProvider = createProvider(RPC_URLS[i]);
            // Test connection
            await testProvider.getBlockNumber();
            console.log(`✅ Connected to RPC: ${RPC_URLS[i]}`);
            provider = testProvider;
            currentRpcIndex = i;
            return;
        } catch (error) {
            console.warn(`⚠️  Failed to connect to ${RPC_URLS[i]}: ${error.message}`);
            if (i === RPC_URLS.length - 1) {
                throw new Error('All RPC endpoints failed');
            }
        }
    }
}

// Retry logic with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            const isLastRetry = i === maxRetries - 1;

            // Check if it's a retryable error (timeout, network, or server error)
            const isRetryable = error.code === 'TIMEOUT' ||
                                error.code === 'NETWORK_ERROR' ||
                                error.code === 'SERVER_ERROR';

            if (isRetryable && !isLastRetry) {
                const delay = initialDelay * Math.pow(2, i);
                console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms (${error.code})...`);
                await new Promise(resolve => setTimeout(resolve, delay));

                // Try next RPC endpoint on retry
                currentRpcIndex = (currentRpcIndex + 1) % RPC_URLS.length;
                provider = createProvider(RPC_URLS[currentRpcIndex]);
                console.log(`Switching to RPC: ${RPC_URLS[currentRpcIndex]}`);
            } else {
                throw error;
            }
        }
    }
}

// Contract ABIs (minimal for reading)
const REGISTRY_ABI = [
    "function getAgentInfo(uint256 tokenId) external view returns (address owner, string[] memory capabilityTypes)",
    "function getReputationScore(uint256 tokenId, string calldata capabilityType) external view returns (uint256)",
    "function totalValidations(uint256 tokenId) external view returns (uint256)",
    "function correctPredictions(uint256 tokenId) external view returns (uint256)"
];

const ORACLE_ABI = [
    "function getClassificationCount() external view returns (uint256)",
    "function getClassification(bytes32 classificationId) external view returns (tuple(bytes32 id, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 oracleTokenId))",
    "function getClassificationIdByIndex(uint256 index) external view returns (bytes32)",
    "event NewsClassified(bytes32 indexed classificationId, string headline, uint8 sentiment, uint8 confidence, bytes32 proofHash, uint256 timestamp, uint256 indexed oracleTokenId)"
];

const AGENT_ABI = [
    "function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance)",
    "function getPortfolioValue() external view returns (uint256 totalValue)",
    "function getTradeStats() external view returns (uint256 total, uint256 profitable, uint256 unprofitable, uint256 winRate)",
    "function getTradeDetails(bytes32 classificationId) external view returns (tuple(bytes32 classificationId, uint256 oracleTokenId, uint8 sentiment, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, uint256 portfolioValueBefore, uint256 portfolioValueAfter, bool isProfitable, bool hasReported))",
    "function totalTradesExecuted() external view returns (uint256)",
    "event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)"
];

const ERC20_ABI = [
    "function balanceOf(address account) external view returns (uint256)"
];

// Contract instances (will be initialized after provider is ready)
let registryContract;
let oracleContract;
let agentContract;

// Cache for recent data
let cache = {
    classifications: [],
    trades: [],
    lastUpdate: 0
};

// Helper functions
function formatEther(wei) {
    return parseFloat(ethers.formatEther(wei)).toFixed(4);
}

function formatUsdc(rawUsdc) {
    return parseFloat(ethers.formatUnits(rawUsdc, 6)).toFixed(2);
}

function sentimentToString(sentiment) {
    const map = { 0: 'GOOD', 1: 'BAD', 2: 'NEUTRAL' };
    return map[sentiment] || 'UNKNOWN';
}

// API Endpoints

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: Date.now(),
        contracts: {
            registry: REGISTRY_ADDRESS,
            oracle: ORACLE_ADDRESS,
            agent: AGENT_ADDRESS
        }
    });
});

// Get overall statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await retryWithBackoff(async () => {
            // Get classification count
            const classificationCount = await oracleContract.getClassificationCount();

            // Get oracle reputation (token ID 1)
            const oracleReputation = await registryContract.getReputationScore(1, 'news_classification');

            // Get trade stats
            const tradeStats = await agentContract.getTradeStats();

            return {
                totalClassifications: classificationCount.toString(),
                oracleReputation: oracleReputation.toString(),
                totalTrades: tradeStats[0].toString(),
                profitableTrades: tradeStats[1].toString(),
                unprofitableTrades: tradeStats[2].toString(),
                winRate: tradeStats[3].toString()
            };
        });

        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recent classifications with transaction links
app.get('/api/classifications', async (req, res) => {
    try {
        const result = await retryWithBackoff(async () => {
            // Get recent NewsClassified events
            const latestBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, latestBlock - 49000); // Last ~49k blocks (RPC limit is 50k)

            const filter = oracleContract.filters.NewsClassified();
            const events = await oracleContract.queryFilter(filter, fromBlock, latestBlock);

            // Get details for each classification with transaction data
            const classifications = await Promise.all(
                events.slice(-10).reverse().map(async (event) => {
                    try {
                        const classificationId = event.args[0];
                        const classification = await oracleContract.getClassification(classificationId);
                        const txHash = event.transactionHash;

                        // Check zkML verification status
                        let isZkmlVerified = false;
                        try {
                            const verifierAbi = ['function isClassificationVerified(bytes32) view returns (bool)'];
                            const verifierContract = new ethers.Contract(
                                process.env.NEWS_VERIFIER_ADDRESS || '0x76a96c27BE6c96415f93514573Ee753582ebA5E6',
                                verifierAbi,
                                provider
                            );
                            isZkmlVerified = await verifierContract.isClassificationVerified(classificationId);
                        } catch (err) {
                            // Verifier might not be deployed yet
                        }

                        return {
                            id: classification.id,
                            headline: classification.headline,
                            sentiment: sentimentToString(classification.sentiment),
                            confidence: classification.confidence.toString(),
                            proofHash: classification.proofHash,
                            timestamp: classification.timestamp.toString(),
                            oracleTokenId: classification.oracleTokenId.toString(),
                            txHash: txHash,
                            explorerUrl: `https://polygonscan.com/tx/${txHash}`,
                            isZkmlVerified: isZkmlVerified
                        };
                    } catch (err) {
                        console.error('Error fetching classification:', err);
                        return null;
                    }
                })
            );

            return {
                classifications: classifications.filter(c => c !== null)
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching classifications:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recent trades with transaction hashes from TradeExecuted events
app.get('/api/trades', async (req, res) => {
    try {
        const result = await retryWithBackoff(async () => {
            // Get TradeExecuted events
            const latestBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, latestBlock - 49000); // Last ~49k blocks (RPC limit is 50k)

            const tradeFilter = agentContract.filters.TradeExecuted();
            const tradeEvents = await agentContract.queryFilter(tradeFilter, fromBlock, latestBlock);

            // Fetch details for each trade
            const trades = await Promise.all(
                tradeEvents.slice(-10).reverse().map(async (event) => {
                    try {
                        const classificationId = event.args[0];
                        const trade = await agentContract.getTradeDetails(classificationId);
                        const txHash = event.transactionHash;

                        // Calculate profit percentage
                        let profitPercent = 0;
                        if (trade.portfolioValueAfter > 0n && trade.portfolioValueBefore > 0n) {
                            const diff = trade.portfolioValueAfter - trade.portfolioValueBefore;
                            profitPercent = Number((diff * 10000n) / trade.portfolioValueBefore) / 100;
                        }

                        return {
                            classificationId: trade.classificationId,
                            oracleTokenId: trade.oracleTokenId.toString(),
                            sentiment: sentimentToString(trade.sentiment),
                            action: trade.action,
                            amountIn: trade.tokenIn.toLowerCase().includes('usdc') ? formatUsdc(trade.amountIn) : formatEther(trade.amountIn),
                            amountOut: trade.tokenOut.toLowerCase().includes('usdc') ? formatUsdc(trade.amountOut) : formatEther(trade.amountOut),
                            timestamp: trade.timestamp.toString(),
                            portfolioValueBefore: formatUsdc(trade.portfolioValueBefore),
                            portfolioValueAfter: trade.portfolioValueAfter > 0n ? formatUsdc(trade.portfolioValueAfter) : '0',
                            isProfitable: trade.isProfitable,
                            profitPercent: profitPercent.toFixed(2),
                            txHash: txHash,
                            explorerUrl: `https://polygonscan.com/tx/${txHash}`
                        };
                    } catch (err) {
                        console.error('Error fetching trade details:', err);
                        return null;
                    }
                })
            );

            return {
                trades: trades.filter(t => t !== null)
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching trades:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get portfolio data
app.get('/api/portfolio', async (req, res) => {
    try {
        const result = await retryWithBackoff(async () => {
            const portfolio = await agentContract.getPortfolio();
            const totalValue = await agentContract.getPortfolioValue();

            return {
                wethBalance: formatEther(portfolio[0]),
                usdcBalance: formatUsdc(portfolio[1]),
                totalValue: formatUsdc(totalValue),
                pnl24h: '0.00' // TODO: Calculate from historical data
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get ERC-8004 registry data
app.get('/api/registry', async (req, res) => {
    try {
        const result = await retryWithBackoff(async () => {
            const agents = [];

            // Oracle agent (token ID 1)
            try {
                const oracleInfo = await registryContract.getAgentInfo(1);
                const oracleReputation = await registryContract.getReputationScore(1, 'news_classification');

                agents.push({
                    tokenId: 1,
                    owner: oracleInfo[0],
                    capability: 'news_classification',
                    reputation: oracleReputation.toString()
                });
            } catch (err) {
                console.error('Error fetching oracle info:', err);
            }

            // Trading agent (token ID 2)
            try {
                const agentInfo = await registryContract.getAgentInfo(2);
                const agentReputation = await registryContract.getReputationScore(2, 'autonomous_trading');

                agents.push({
                    tokenId: 2,
                    owner: agentInfo[0],
                    capability: 'autonomous_trading',
                    reputation: agentReputation.toString()
                });
            } catch (err) {
                console.error('Error fetching agent info:', err);
            }

            return { agents };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching registry:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get contract addresses
app.get('/api/addresses', (req, res) => {
    res.json({
        registry: REGISTRY_ADDRESS,
        oracle: ORACLE_ADDRESS,
        agent: AGENT_ADDRESS,
        rpcUrl: RPC_URL
    });
});

// Get most recent classification (uses hardcoded ID from latest TX)
// TODO: Replace with proper event storage system
app.get('/api/latest-classification', async (req, res) => {
    try {
        const result = await retryWithBackoff(async () => {
            // Hardcoded classification ID from most recent transaction
            // Classification TX: 0x0296f0a3a2b14984a2f787bf53078a9368df61822be6314a02a926b7b5725008
            const latestClassificationId = '0x4028a21862cf3962a2d4b618f00eb3530352d1c1cae0f4042d642a50cf2c071a';

            // Query contract directly for this classification
            const classification = await oracleContract.getClassification(latestClassificationId);

            // Check zkML verification
            let isZkmlVerified = false;
            try {
                const verifierAbi = ['function isClassificationVerified(bytes32) view returns (bool)'];
                const verifierContract = new ethers.Contract(
                    process.env.NEWS_VERIFIER_ADDRESS || '0x76a96c27BE6c96415f93514573Ee753582ebA5E6',
                    verifierAbi,
                    provider
                );
                isZkmlVerified = await verifierContract.isClassificationVerified(latestClassificationId);
            } catch (err) {
                console.error('Error checking verification:', err);
            }

            return {
                classification: {
                    id: classification.id,
                    headline: classification.headline,
                    sentiment: sentimentToString(classification.sentiment),
                    confidence: classification.confidence.toString(),
                    proofHash: classification.proofHash,
                    timestamp: classification.timestamp.toString(),
                    oracleTokenId: classification.oracleTokenId.toString(),
                    txHash: '0x0296f0a3a2b14984a2f787bf53078a9368df61822be6314a02a926b7b5725008',
                    explorerUrl: 'https://polygonscan.com/tx/0x0296f0a3a2b14984a2f787bf53078a9368df61822be6314a02a926b7b5725008',
                    verificationTxHash: '0xba35a2aca1dd6046582b761ee37565bff98da3938dd1a8f8044f5cf96fe3e6ce',
                    verificationExplorerUrl: 'https://polygonscan.com/tx/0xba35a2aca1dd6046582b761ee37565bff98da3938dd1a8f8044f5cf96fe3e6ce',
                    isZkmlVerified: isZkmlVerified
                }
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching latest classification:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server after initializing provider
async function startServer() {
    try {
        // Initialize provider with fallback logic
        await initializeProvider();

        // Initialize contract instances with the connected provider
        registryContract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
        oracleContract = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
        agentContract = new ethers.Contract(AGENT_ADDRESS, AGENT_ABI, provider);

        // Start HTTP server
        app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║  zkML News Oracle - ERC-8004 Dashboard UI             ║');
            console.log('╚════════════════════════════════════════════════════════╝');
            console.log('');
            console.log(`🌐 Server running at: http://localhost:${PORT}`);
            console.log('');
            console.log('📋 Contract Addresses:');
            console.log(`   Registry: ${REGISTRY_ADDRESS}`);
            console.log(`   Oracle:   ${ORACLE_ADDRESS}`);
            console.log(`   Agent:    ${AGENT_ADDRESS}`);
            console.log('');
            console.log('🔗 RPC URL:', RPC_URLS[currentRpcIndex]);
            console.log('');
            console.log('🚀 API Endpoints:');
            console.log('   GET /api/health          - Health check');
            console.log('   GET /api/stats           - Overall statistics');
            console.log('   GET /api/classifications - Recent classifications');
            console.log('   GET /api/trades          - Recent trades');
            console.log('   GET /api/portfolio       - Portfolio data');
            console.log('   GET /api/registry        - ERC-8004 registry');
            console.log('   GET /api/addresses       - Contract addresses');
            console.log('');
            console.log('✨ Auto-refresh: Every 10 seconds');
            console.log('');
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});

// Start the server
startServer();
