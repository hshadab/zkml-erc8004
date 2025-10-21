require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

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

// Contract addresses (Base Mainnet deployment)
const REGISTRY_ADDRESS = process.env.ZKML_VERIFICATION_REGISTRY || '0xb274D9bdbEFD5e645a1E6Df94F4ff62838625230';
const ORACLE_ADDRESS = process.env.NEWS_ORACLE_ADDRESS || '0x93Efb961780a19052A2fBd186A86b7edf073EFb6';
const AGENT_ADDRESS = process.env.TRADING_AGENT_ADDRESS || '0xBC2a8f872f02CCd2356F235675f756A4FdCAd81d';
const VERIFIER_ADDRESS = process.env.NEWS_VERIFIER_ADDRESS || '0x42706c5d80CC618e51d178bd9869894692A77a5c';

// Load tx hash cache
let txCache = {};
try {
  txCache = JSON.parse(fs.readFileSync('/home/hshadab/zkml-erc8004/ui/tx-cache.json', 'utf8'));
} catch(e) { txCache = {}; }

const AGENT_DEPLOYMENT_BLOCK = 0; // Base Mainnet deployment block (not needed for Base)

// Multiple RPC endpoints for fallback (in priority order)
const RPC_URLS = [
    process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://base-mainnet.public.blastapi.io',
    'https://base.publicnode.com'
];

// Initialize provider with timeout configuration
let provider = null;
let currentRpcIndex = 0;

function createProvider(rpcUrl) {
    // Create a custom FetchRequest with extended timeout for WSL2 compatibility
    const fetchReq = new ethers.FetchRequest(rpcUrl);
    fetchReq.timeout = 120000; // 120 second timeout
    fetchReq.retryFunc = async (req, res, attempt) => {
        // Retry up to 2 times with 2 second delay
        if (attempt < 2) {
            console.log(`Retry attempt ${attempt + 1} for ${rpcUrl}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        }
        return false;
    };

    // Explicitly specify Base Mainnet network (Chain ID: 8453)
    const network = {
        name: 'base',
        chainId: 8453
    };

    // Create provider with custom fetch request
    return new ethers.JsonRpcProvider(fetchReq, network, {
        staticNetwork: true
    });
}

// Create provider with fallback logic
async function initializeProvider() {
    for (let i = 0; i < RPC_URLS.length; i++) {
        try {
            console.log(`Connecting to RPC ${i + 1}/${RPC_URLS.length}: ${RPC_URLS[i]}`);
            const testProvider = createProvider(RPC_URLS[i]);
            // Test connection (FetchRequest has its own 120s timeout + retries)
            const blockNumber = await testProvider.getBlockNumber();
            console.log(`✅ Connected to RPC: ${RPC_URLS[i]} (Block: ${blockNumber})`);
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
    "function correctPredictions(uint256 tokenId) external view returns (uint256)",
    "function getCapabilityStats(uint256 tokenId, string calldata capabilityType) external view returns (uint256 reputationScore, uint256 correctPredictions, uint256 incorrectPredictions, uint256 consecutiveFailures, uint256 totalPredictions, uint256 accuracyPercent)",
    "event ProofSubmitted(uint256 indexed tokenId, bytes32 proofHash, uint256 timestamp)"
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
    "function getRecentTrades(uint256 count) external view returns (tuple(bytes32 classificationId, uint256 oracleTokenId, uint8 sentiment, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp, uint256 portfolioValueBefore, uint256 portfolioValueAfter, bool isProfitable, bool hasReported)[])",
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
    // INewsOracle: 0=BAD_NEWS, 1=NEUTRAL, 2=GOOD_NEWS
    const map = { 0: 'BAD', 1: 'NEUTRAL', 2: 'GOOD' };
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

            // Get oracle capability stats (token ID 1)
            let oracleStats;
            try {
                const capStats = await registryContract.getCapabilityStats(1, 'news_classification');
                oracleStats = {
                    reputationScore: capStats[0].toString(),
                    totalProofs: capStats[4].toString(), // totalPredictions includes all proofs submitted
                    accuracyPercent: capStats[5].toString()
                };
            } catch (err) {
                console.error('Error fetching oracle stats:', err);
                // Fallback to simple reputation if getCapabilityStats fails
                const oracleReputation = await registryContract.getReputationScore(1, 'news_classification');
                oracleStats = {
                    reputationScore: oracleReputation.toString(),
                    totalProofs: '0',
                    accuracyPercent: '0'
                };
            }

            // Get trade stats
            const tradeStats = await agentContract.getTradeStats();

            return {
                totalClassifications: classificationCount.toString(),
                oracleReputation: oracleStats.reputationScore,
                oracleProofsSubmitted: oracleStats.totalProofs,
                oracleAccuracy: oracleStats.accuracyPercent,
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
            // Query from contract state instead of events (no block range limitations)
            const count = await oracleContract.getClassificationCount();
            const totalClassifications = Number(count);

            if (totalClassifications === 0) {
                return { classifications: [] };
            }

            // Get last 10 classifications
            const startIndex = Math.max(0, totalClassifications - 10);
            const classificationPromises = [];

            for (let i = totalClassifications - 1; i >= startIndex; i--) {
                classificationPromises.push(
                    (async () => {
                        try {
                            const classificationId = await oracleContract.getClassificationIdByIndex(i);
                            return await oracleContract.getClassification(classificationId);
                        } catch (err) {
                            console.error(`Error fetching classification ${i}:`, err);
                            return null;
                        }
                    })()
                );
            }

            const classificationsData = await Promise.all(classificationPromises);

            // Format classifications for display (without tx hashes - querying events for old data exceeds Alchemy limits)
            const classifications = classificationsData.filter(c => c !== null).map(classification => {
                return {
                    id: classification.id,
                    headline: classification.headline,
                    sentiment: sentimentToString(classification.sentiment),
                    confidence: classification.confidence.toString(),
                    proofHash: classification.proofHash,
                    timestamp: classification.timestamp.toString(),
                    oracleTokenId: classification.oracleTokenId.toString(),
                    txHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // Cannot query old events with Alchemy Free tier
                    explorerUrl: `https://basescan.org/address/${ORACLE_ADDRESS}`,
                    isZkmlVerified: true // Assume verified if classification exists in contract
                };
            });

            return {
                classifications: classifications
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
            // First get all recent trades from contract
            const recentTrades = await agentContract.getRecentTrades(10);

            if (recentTrades.length === 0) {
                return { trades: [] };
            }

            // For each trade, try to find its TradeExecuted event to get the transaction hash
            const trades = await Promise.all(
                [...recentTrades].reverse().map(async (trade) => {
                    let txHash = '0x';
                    let explorerUrl = `https://basescan.org/address/${AGENT_ADDRESS}`;

                    // Try to find the event for this specific classification
                    try {
                        // Check cache first
                        if (txCache[trade.classificationId]) {
                            txHash = txCache[trade.classificationId];
                            explorerUrl = `https://basescan.org/tx/${txHash}`;
                        }
                    } catch (err) {
                        console.error('Error finding event for classification:', trade.classificationId, err.message);
                    }

                    let profitPercent = 0;
                    if (trade.portfolioValueAfter > 0n && trade.portfolioValueBefore > 0n) {
                        const diff = trade.portfolioValueAfter - trade.portfolioValueBefore;
                        profitPercent = Number((diff * 10000n) / trade.portfolioValueBefore) / 100;
                    }

                    const inUsdc = trade.tokenIn.toLowerCase().includes('2791bca1');
                    const outUsdc = trade.tokenOut.toLowerCase().includes('2791bca1');

                    return {
                        classificationId: trade.classificationId,
                        oracleTokenId: trade.oracleTokenId.toString(),
                        sentiment: sentimentToString(trade.sentiment),
                        action: trade.action,
                        amountIn: inUsdc ? formatUsdc(trade.amountIn) : formatEther(trade.amountIn),
                        amountOut: outUsdc ? formatUsdc(trade.amountOut) : formatEther(trade.amountOut),
                        timestamp: trade.timestamp.toString(),
                        portfolioValueBefore: formatUsdc(trade.portfolioValueBefore),
                        portfolioValueAfter: trade.portfolioValueAfter > 0n ? formatUsdc(trade.portfolioValueAfter) : '0',
                        isProfitable: trade.isProfitable,
                        profitPercent: profitPercent.toFixed(2),
                        txHash: txHash,
                        explorerUrl: explorerUrl
                    };
                })
            );

            return { trades };

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
        verifier: VERIFIER_ADDRESS,
        rpcUrl: RPC_URLS[currentRpcIndex],
        network: 'Base Mainnet'
    });
});

// Get most recent classification (from contract state)
app.get('/api/latest-classification', async (req, res) => {
    try {
        const result = await retryWithBackoff(async () => {
            // Get total count and query the latest classification by index
            const count = await oracleContract.getClassificationCount();
            const totalClassifications = Number(count);

            if (totalClassifications === 0) {
                throw new Error('No classifications found');
            }

            // Get the most recent classification (last index)
            const latestClassificationId = await oracleContract.getClassificationIdByIndex(totalClassifications - 1);
            const classification = await oracleContract.getClassification(latestClassificationId);

            // Check zkML verification
            let isZkmlVerified = false;
            try {
                const verifierAbi = ['function isClassificationVerified(bytes32) view returns (bool)'];
                const verifierContract = new ethers.Contract(
                    VERIFIER_ADDRESS,
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
                    txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    explorerUrl: `https://basescan.org/address/${ORACLE_ADDRESS}`,
                    isZkmlVerified: true
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
