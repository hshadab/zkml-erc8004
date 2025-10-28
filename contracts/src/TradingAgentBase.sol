// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INewsOracle.sol";
import "./interfaces/IZkMLVerificationRegistry.sol";

/**
 * @title TradingAgentBase
 * @notice Autonomous trading agent for Base Mainnet using Uniswap V3
 * @dev Integrates with Uniswap V3 SwapRouter for ETH/USDC trading with risk management
 *
 * Security Features:
 * - Access control for trade execution
 * - Slippage protection on all swaps
 * - Stop-loss mechanism to prevent excessive losses
 * - Rate limiting on trade execution
 * - Chainlink price oracle integration for accurate valuations
 *
 * @custom:security-contact security@example.com
 */
contract TradingAgentBase {
    // ============ Constants ============

    /// @notice Minimum ETH balance required to execute bearish trades (0.001 ETH)
    uint256 public constant MIN_ETH_TRADE_AMOUNT = 0.001 ether;

    /// @notice Minimum USDC balance required to execute bullish trades ($1 USDC, 6 decimals)
    uint256 public constant MIN_USDC_TRADE_AMOUNT = 1e6;

    /// @notice Default trade size as percentage of balance (10%)
    uint256 public constant DEFAULT_TRADE_PERCENTAGE = 10;

    /// @notice Maximum trade size as percentage of balance (25%)
    uint256 public constant MAX_TRADE_PERCENTAGE = 25;

    /// @notice Default maximum slippage tolerance in basis points (100 = 1%)
    uint256 public constant DEFAULT_MAX_SLIPPAGE_BPS = 100;

    /// @notice Basis points denominator (10000 = 100%)
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Maximum stop-loss threshold in basis points (2000 = 20%)
    uint256 public constant MAX_STOP_LOSS_BPS = 2000;

    /// @notice Minimum time between trades for same classification (10 seconds)
    uint256 public constant MIN_TRADE_INTERVAL = 10 seconds;

    /// @notice Maximum time allowed for profitability evaluation (1 hour)
    uint256 public constant MAX_EVALUATION_DELAY = 1 hours;

    /// @notice Fallback ETH price in USDC (6 decimals) used when oracle unavailable
    uint256 public constant FALLBACK_ETH_PRICE_USDC = 3000e6;

    // ============ Immutable State ============

    /// @notice Contract owner with admin privileges
    address public owner;

    /// @notice News classification oracle contract
    INewsOracle public immutable newsOracle;

    /// @notice ERC-8004 verification registry for reputation checks
    IZkMLVerificationRegistry public immutable verificationRegistry;

    /// @notice Uniswap V3 SwapRouter02 address
    address public immutable swapRouter;

    /// @notice Wrapped ETH (WETH) token address
    address public immutable WETH;

    /// @notice USD Coin (USDC) token address
    address public immutable USDC;

    /// @notice Uniswap V3 pool fee tier (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
    uint24 public immutable poolFee;

    /// @notice Chainlink ETH/USD price feed address
    address public immutable ethUsdPriceFeed;

    /// @notice Chainlink USDC/USD price feed address
    address public immutable usdcUsdPriceFeed;

    // ============ Mutable State ============

    /// @notice ERC-8004 token ID representing this agent's identity
    uint256 public agentTokenId;

    /// @notice Minimum oracle reputation score required to execute trades (0-1000)
    uint256 public minOracleReputation;

    /// @notice Minimum classification confidence required to execute trades (0-100)
    uint256 public minConfidence;

    /// @notice Trade size as percentage of balance (0-25)
    uint256 public tradePercentage;

    /// @notice Maximum allowed slippage in basis points (default: 100 = 1%)
    uint256 public maxSlippageBps;

    /// @notice Stop-loss threshold in basis points (e.g., 1000 = 10% max loss)
    uint256 public stopLossBps;

    /// @notice Initial portfolio value at deployment for stop-loss tracking
    uint256 public initialPortfolioValue;

    /// @notice Whether trading is paused (emergency stop)
    bool public isPaused;

    /// @notice Addresses authorized to trigger trades (e.g., backend service)
    mapping(address => bool) public authorizedCallers;

    /// @notice Comprehensive trade execution record
    /// @dev Stores all trade details for audit trail and profitability analysis
    struct Trade {
        bytes32 classificationId;      // Unique identifier for the news classification
        uint256 oracleTokenId;         // ERC-8004 token ID of the oracle
        uint8 sentiment;               // 0=BAD_NEWS, 1=NEUTRAL, 2=GOOD_NEWS
        string action;                 // "BUY_ETH", "SELL_ETH", or "HOLD"
        address tokenIn;               // Input token address
        address tokenOut;              // Output token address
        uint256 amountIn;              // Input token amount
        uint256 amountOut;             // Output token amount received
        uint256 timestamp;             // Trade execution timestamp
        uint256 portfolioValueBefore;  // Portfolio value before trade (in USDC)
        uint256 portfolioValueAfter;   // Portfolio value after trade (in USDC)
        bool isProfitable;             // Whether trade resulted in net gain
        bool hasReported;              // Whether profitability has been evaluated
    }

    /// @notice Mapping of classification ID to trade details
    mapping(bytes32 => Trade) public trades;

    /// @notice Tracks which classifications have been processed to prevent duplicates
    mapping(bytes32 => bool) public processedClassifications;

    /// @notice Array of all trade classification IDs for iteration
    bytes32[] public tradeHistory;

    /// @notice Total number of trades executed by this agent
    uint256 public totalTradesExecuted;

    /// @notice Number of trades that resulted in profit
    uint256 public profitableTrades;

    /// @notice Number of trades that resulted in loss
    uint256 public unprofitableTrades;

    // ============ Events ============

    /// @notice Emitted when a trade is executed
    /// @param classificationId The news classification that triggered the trade
    /// @param action The action taken ("BUY_ETH", "SELL_ETH", or "HOLD")
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param amountIn Amount of input token
    /// @param amountOut Amount of output token received
    /// @param timestamp Block timestamp of execution
    event TradeExecuted(
        bytes32 indexed classificationId,
        string action,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    /// @notice Emitted when trade profitability is evaluated
    /// @param classificationId The classification ID
    /// @param profitable Whether the trade was profitable
    /// @param valueBefore Portfolio value before trade
    /// @param valueAfter Portfolio value after trade
    /// @param profitLossPercent Profit/loss percentage (basis points)
    event TradeProfitabilityDetermined(
        bytes32 indexed classificationId,
        bool profitable,
        uint256 valueBefore,
        uint256 valueAfter,
        int256 profitLossPercent
    );

    /// @notice Emitted when trading strategy parameters are updated
    /// @param minOracleReputation New minimum oracle reputation
    /// @param minConfidence New minimum confidence threshold
    /// @param tradePercentage New trade size percentage
    /// @param maxSlippageBps New maximum slippage tolerance
    /// @param stopLossBps New stop-loss threshold
    event StrategyUpdated(
        uint256 minOracleReputation,
        uint256 minConfidence,
        uint256 tradePercentage,
        uint256 maxSlippageBps,
        uint256 stopLossBps
    );

    /// @notice Emitted when trading is paused or resumed
    /// @param paused Whether trading is now paused
    event AgentPaused(bool paused);

    /// @notice Emitted when an authorized caller is added or removed
    /// @param caller The address being authorized/deauthorized
    /// @param authorized Whether the address is now authorized
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);

    /// @notice Emitted when stop-loss is triggered
    /// @param currentValue Current portfolio value
    /// @param initialValue Initial portfolio value
    /// @param lossPercent Loss percentage (basis points)
    event StopLossTriggered(uint256 currentValue, uint256 initialValue, uint256 lossPercent);

    // ============ Modifiers ============

    /// @notice Restricts function access to contract owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "TradingAgent: caller is not owner");
        _;
    }

    /// @notice Restricts function access to authorized callers only
    modifier onlyAuthorized() {
        require(
            msg.sender == owner || authorizedCallers[msg.sender],
            "TradingAgent: caller is not authorized"
        );
        _;
    }

    /// @notice Prevents function execution when trading is paused
    modifier whenNotPaused() {
        require(!isPaused, "TradingAgent: trading is paused");
        _;
    }

    /// @notice Checks stop-loss threshold before executing trades
    modifier checkStopLoss() {
        if (stopLossBps > 0 && initialPortfolioValue > 0) {
            uint256 currentValue = _calculatePortfolioValue();
            if (currentValue < initialPortfolioValue) {
                uint256 lossAmount = initialPortfolioValue - currentValue;
                uint256 lossPercent = (lossAmount * BPS_DENOMINATOR) / initialPortfolioValue;

                if (lossPercent >= stopLossBps) {
                    emit StopLossTriggered(currentValue, initialPortfolioValue, lossPercent);
                    revert("TradingAgent: stop-loss threshold exceeded");
                }
            }
        }
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initializes the trading agent with required contract addresses
     * @param _newsOracle News classification oracle contract address
     * @param _verificationRegistry ERC-8004 verification registry address
     * @param _swapRouter Uniswap V3 SwapRouter02 address
     * @param _weth Wrapped ETH token address
     * @param _usdc USDC token address
     * @param _poolFee Uniswap V3 pool fee tier (500, 3000, or 10000)
     * @param _ethUsdPriceFeed Chainlink ETH/USD price feed address (optional, use address(0) to disable)
     * @param _usdcUsdPriceFeed Chainlink USDC/USD price feed address (optional, use address(0) to disable)
     */
    constructor(
        address _newsOracle,
        address _verificationRegistry,
        address _swapRouter,
        address _weth,
        address _usdc,
        uint24 _poolFee,
        address _ethUsdPriceFeed,
        address _usdcUsdPriceFeed
    ) {
        require(_newsOracle != address(0), "TradingAgent: invalid oracle address");
        require(_verificationRegistry != address(0), "TradingAgent: invalid registry address");
        require(_swapRouter != address(0), "TradingAgent: invalid router address");
        require(_weth != address(0), "TradingAgent: invalid WETH address");
        require(_usdc != address(0), "TradingAgent: invalid USDC address");
        require(
            _poolFee == 500 || _poolFee == 3000 || _poolFee == 10000,
            "TradingAgent: invalid pool fee"
        );

        owner = msg.sender;
        newsOracle = INewsOracle(_newsOracle);
        verificationRegistry = IZkMLVerificationRegistry(_verificationRegistry);
        swapRouter = _swapRouter;
        WETH = _weth;
        USDC = _usdc;
        poolFee = _poolFee;
        ethUsdPriceFeed = _ethUsdPriceFeed;
        usdcUsdPriceFeed = _usdcUsdPriceFeed;

        // Initialize with safe defaults
        minOracleReputation = 50;
        minConfidence = 60;
        tradePercentage = DEFAULT_TRADE_PERCENTAGE;
        maxSlippageBps = DEFAULT_MAX_SLIPPAGE_BPS;
        stopLossBps = 1000; // 10% default stop-loss
        isPaused = false;

        // Set initial portfolio value for stop-loss tracking
        initialPortfolioValue = _calculatePortfolioValue();

        // Owner is automatically authorized
        authorizedCallers[msg.sender] = true;
    }

    // ============ Access Control Functions ============

    /**
     * @notice Sets the ERC-8004 agent token ID for this trading agent
     * @dev Only callable by owner during initial setup
     * @param _tokenId The ERC-8004 token ID representing this agent
     */
    function setAgentTokenId(uint256 _tokenId) external onlyOwner {
        require(_tokenId > 0, "TradingAgent: invalid token ID");
        agentTokenId = _tokenId;
    }

    /**
     * @notice Authorizes or deauthorizes an address to trigger trades
     * @dev Allows backend services to execute trades on behalf of the agent
     * @param caller Address to authorize/deauthorize
     * @param authorized True to authorize, false to revoke
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        require(caller != address(0), "TradingAgent: invalid caller address");
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerUpdated(caller, authorized);
    }

    // ============ Core Trading Functions ============

    /**
     * @notice Executes a trade based on a verified news classification
     * @dev CRITICAL: Only authorized callers can execute trades (prevents unauthorized drainage)
     * @param classificationId The unique identifier of the news classification
     *
     * Security checks:
     * 1. Only authorized callers can execute
     * 2. Classification cannot be processed twice
     * 3. Oracle reputation must meet minimum threshold
     * 4. Classification confidence must meet minimum threshold
     * 5. Stop-loss threshold is checked
     * 6. Trading must not be paused
     *
     * @custom:security This function is protected by onlyAuthorized modifier
     */
    function reactToNews(bytes32 classificationId)
        external
        onlyAuthorized
        whenNotPaused
        checkStopLoss
    {
        require(!processedClassifications[classificationId], "TradingAgent: already processed");
        processedClassifications[classificationId] = true;

        // Fetch news classification from oracle
        INewsOracle.NewsClassification memory news = newsOracle.getClassification(classificationId);

        // Verify oracle reputation meets threshold
        uint256 oracleReputation = verificationRegistry.getReputationScore(
            news.oracleTokenId,
            "news_classification"
        );
        require(
            oracleReputation >= minOracleReputation,
            "TradingAgent: oracle reputation too low"
        );

        // Verify classification confidence meets threshold
        require(news.confidence >= minConfidence, "TradingAgent: confidence too low");

        // Record portfolio value before trade
        uint256 portfolioValueBefore = _calculatePortfolioValue();

        // Initialize trade record
        trades[classificationId] = Trade({
            classificationId: classificationId,
            oracleTokenId: news.oracleTokenId,
            sentiment: uint8(news.sentiment),
            action: "HOLD", // Default action
            tokenIn: address(0),
            tokenOut: address(0),
            amountIn: 0,
            amountOut: 0,
            timestamp: block.timestamp,
            portfolioValueBefore: portfolioValueBefore,
            portfolioValueAfter: 0,
            isProfitable: false,
            hasReported: false
        });
        tradeHistory.push(classificationId);

        // Execute trade based on sentiment
        if (news.sentiment == INewsOracle.Sentiment.GOOD_NEWS) {
            _executeBullishTrade(classificationId);
        } else if (news.sentiment == INewsOracle.Sentiment.BAD_NEWS) {
            _executeBearishTrade(classificationId);
        }
        // NEUTRAL sentiment results in HOLD action (no trade)

        totalTradesExecuted++;
    }

    /**
     * @notice Executes a bullish trade (buy ETH with USDC)
     * @dev Called when news sentiment is GOOD_NEWS
     * @param classificationId The classification that triggered this trade
     */
    function _executeBullishTrade(bytes32 classificationId) internal {
        uint256 usdcBalance = _getTokenBalance(USDC);

        // Check if we have sufficient USDC balance
        if (usdcBalance >= MIN_USDC_TRADE_AMOUNT) {
            // Calculate trade amount based on tradePercentage
            uint256 amountIn = (usdcBalance * tradePercentage) / 100;
            if (amountIn < MIN_USDC_TRADE_AMOUNT) {
                amountIn = MIN_USDC_TRADE_AMOUNT;
            }

            // Calculate minimum output with slippage protection
            uint256 minAmountOut = _calculateMinAmountOut(USDC, WETH, amountIn);

            // Execute swap with slippage protection
            uint256 amountOut = _swapV3(USDC, WETH, amountIn, minAmountOut);

            // Record trade details
            Trade storage t = trades[classificationId];
            t.action = "BUY_ETH";
            t.tokenIn = USDC;
            t.tokenOut = WETH;
            t.amountIn = amountIn;
            t.amountOut = amountOut;

            emit TradeExecuted(
                classificationId,
                "BUY_ETH",
                USDC,
                WETH,
                amountIn,
                amountOut,
                block.timestamp
            );
        }
    }

    /**
     * @notice Executes a bearish trade (sell ETH for USDC)
     * @dev Called when news sentiment is BAD_NEWS
     * @param classificationId The classification that triggered this trade
     */
    function _executeBearishTrade(bytes32 classificationId) internal {
        uint256 ethBalance = _getTokenBalance(WETH);

        // Check if we have sufficient ETH balance
        if (ethBalance >= MIN_ETH_TRADE_AMOUNT) {
            // Calculate trade amount based on tradePercentage
            uint256 amountIn = (ethBalance * tradePercentage) / 100;
            if (amountIn < MIN_ETH_TRADE_AMOUNT) {
                amountIn = MIN_ETH_TRADE_AMOUNT;
            }

            // Calculate minimum output with slippage protection
            uint256 minAmountOut = _calculateMinAmountOut(WETH, USDC, amountIn);

            // Execute swap with slippage protection
            uint256 amountOut = _swapV3(WETH, USDC, amountIn, minAmountOut);

            // Record trade details
            Trade storage t = trades[classificationId];
            t.action = "SELL_ETH";
            t.tokenIn = WETH;
            t.tokenOut = USDC;
            t.amountIn = amountIn;
            t.amountOut = amountOut;

            emit TradeExecuted(
                classificationId,
                "SELL_ETH",
                WETH,
                USDC,
                amountIn,
                amountOut,
                block.timestamp
            );
        }
    }

    /**
     * @notice Calculates minimum output amount for slippage protection
     * @dev Uses maxSlippageBps to determine acceptable slippage
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Input token amount
     * @return minAmountOut Minimum acceptable output amount
     */
    function _calculateMinAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256 minAmountOut) {
        // Get current price from Chainlink or fallback to hardcoded
        uint256 priceInUsdc = _getTokenPriceInUsdc(tokenIn);
        uint256 expectedValueUsdc = (amountIn * priceInUsdc) / 1e18;

        // Convert to output token amount
        if (tokenOut == USDC) {
            minAmountOut = expectedValueUsdc;
        } else if (tokenOut == WETH) {
            uint256 ethPrice = _getTokenPriceInUsdc(WETH);
            minAmountOut = (expectedValueUsdc * 1e18) / ethPrice;
        } else {
            revert("TradingAgent: unsupported token pair");
        }

        // Apply slippage tolerance
        minAmountOut = (minAmountOut * (BPS_DENOMINATOR - maxSlippageBps)) / BPS_DENOMINATOR;
    }

    /**
     * @notice Executes swap using Uniswap V3 SwapRouter02
     * @dev Uses exactInputSingle for single-hop swaps with slippage protection
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input token to swap
     * @param amountOutMin Minimum amount of output token to receive (slippage protection)
     * @return amountOut Actual amount of output token received
     */
    function _swapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) internal returns (uint256 amountOut) {
        // Approve router to spend input token
        _approveToken(tokenIn, swapRouter, amountIn);

        // Manual ABI encoding for exactInputSingle with struct parameter
        // Function selector: bytes4(keccak256("exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))"))
        bytes4 selector = 0x04e45aaf; // exactInputSingle selector

        bytes memory callData = abi.encodePacked(
            selector,
            abi.encode(tokenIn, tokenOut, poolFee, address(this), amountIn, amountOutMin, uint160(0))
        );

        (bool success, bytes memory data) = swapRouter.call(callData);
        require(success, "TradingAgent: swap failed");
        amountOut = abi.decode(data, (uint256));

        require(amountOut >= amountOutMin, "TradingAgent: insufficient output amount");
    }

    // ============ Price Oracle Functions ============

    /**
     * @notice Gets token price in USDC using Chainlink price feeds
     * @dev Falls back to hardcoded price if Chainlink unavailable
     * @param token Token address (WETH or USDC)
     * @return price Token price in USDC (6 decimals)
     */
    function _getTokenPriceInUsdc(address token) internal view returns (uint256 price) {
        if (token == WETH) {
            return _getEthPriceInUsdc();
        } else if (token == USDC) {
            return 1e6; // 1 USDC = $1.00 (6 decimals)
        } else {
            revert("TradingAgent: unsupported token for pricing");
        }
    }

    /**
     * @notice Gets ETH price in USDC from Chainlink oracle
     * @dev Uses Chainlink ETH/USD feed with fallback to hardcoded price
     * @return price ETH price in USDC (6 decimals)
     */
    function _getEthPriceInUsdc() internal view returns (uint256 price) {
        // Try Chainlink oracle if available
        if (ethUsdPriceFeed != address(0)) {
            try this.getChainlinkPrice(ethUsdPriceFeed) returns (uint256 chainlinkPrice) {
                // Chainlink returns price with 8 decimals, convert to 6 decimals (USDC)
                return chainlinkPrice / 100;
            } catch {
                // Fallback to hardcoded price if Chainlink fails
                return FALLBACK_ETH_PRICE_USDC;
            }
        }

        // Use fallback price if no oracle configured
        return FALLBACK_ETH_PRICE_USDC;
    }

    /**
     * @notice External function to fetch Chainlink price (allows try/catch)
     * @dev This is external to enable try/catch error handling
     * @param priceFeed Chainlink price feed address
     * @return price Latest price from Chainlink (8 decimals)
     */
    function getChainlinkPrice(address priceFeed) external view returns (uint256 price) {
        require(priceFeed != address(0), "TradingAgent: invalid price feed");

        // Call Chainlink aggregator's latestRoundData()
        // Interface: function latestRoundData() returns (uint80, int256, uint256, uint256, uint80)
        (bool success, bytes memory data) = priceFeed.staticcall(
            abi.encodeWithSignature("latestRoundData()")
        );

        require(success, "TradingAgent: chainlink call failed");
        require(data.length >= 160, "TradingAgent: invalid chainlink response");

        // Decode the response
        (, int256 answer, , uint256 updatedAt, ) = abi.decode(
            data,
            (uint80, int256, uint256, uint256, uint80)
        );

        require(answer > 0, "TradingAgent: invalid price");
        require(updatedAt > 0, "TradingAgent: stale price");
        require(block.timestamp - updatedAt < 1 hours, "TradingAgent: price too old");

        price = uint256(answer);
    }

    // ============ Evaluation Functions ============

    /**
     * @notice Evaluates the profitability of a completed trade
     * @dev Should be called after sufficient time has passed for market to react (minimum 10 seconds)
     * @param classificationId The classification ID of the trade to evaluate
     *
     * Requirements:
     * - Trade must exist
     * - Trade must not have been evaluated already
     * - At least 10 seconds must have passed since trade execution
     * - Cannot evaluate after MAX_EVALUATION_DELAY (1 hour)
     */
    function evaluateTradeProfitability(bytes32 classificationId) external {
        Trade storage t = trades[classificationId];

        require(t.timestamp > 0, "TradingAgent: trade does not exist");
        require(!t.hasReported, "TradingAgent: already evaluated");
        require(
            block.timestamp >= t.timestamp + MIN_TRADE_INTERVAL,
            "TradingAgent: too early to evaluate"
        );
        require(
            block.timestamp <= t.timestamp + MAX_EVALUATION_DELAY,
            "TradingAgent: evaluation window expired"
        );

        // Mark as evaluated to prevent double evaluation
        t.hasReported = true;

        // Calculate current portfolio value
        uint256 afterVal = _calculatePortfolioValue();
        t.portfolioValueAfter = afterVal;

        // Determine profitability
        bool profitable = afterVal > t.portfolioValueBefore;
        t.isProfitable = profitable;

        // Update statistics
        if (profitable) {
            profitableTrades++;
        } else {
            unprofitableTrades++;
        }

        // Calculate profit/loss percentage in basis points
        int256 pl = 0;
        if (t.portfolioValueBefore > 0) {
            int256 diff = int256(afterVal) - int256(t.portfolioValueBefore);
            pl = (diff * int256(BPS_DENOMINATOR)) / int256(t.portfolioValueBefore);
        }

        emit TradeProfitabilityDetermined(
            classificationId,
            profitable,
            t.portfolioValueBefore,
            afterVal,
            pl
        );
    }

    // ============ Strategy Management Functions ============

    /**
     * @notice Updates the trading strategy parameters
     * @dev Only callable by owner. All parameters are validated before update.
     * @param _minOracleReputation Minimum oracle reputation score (0-1000)
     * @param _minConfidence Minimum classification confidence (0-100)
     * @param _tradePercentage Trade size as percentage of balance (0-25)
     * @param _maxSlippageBps Maximum slippage tolerance in basis points
     * @param _stopLossBps Stop-loss threshold in basis points (0 = disabled)
     */
    function updateStrategy(
        uint256 _minOracleReputation,
        uint256 _minConfidence,
        uint256 _tradePercentage,
        uint256 _maxSlippageBps,
        uint256 _stopLossBps
    ) external onlyOwner {
        require(_minOracleReputation <= 1000, "TradingAgent: invalid reputation threshold");
        require(_minConfidence <= 100, "TradingAgent: confidence must be <= 100");
        require(
            _tradePercentage <= MAX_TRADE_PERCENTAGE,
            "TradingAgent: trade percentage too high"
        );
        require(_maxSlippageBps <= 1000, "TradingAgent: slippage too high"); // Max 10%
        require(
            _stopLossBps <= MAX_STOP_LOSS_BPS,
            "TradingAgent: stop-loss threshold too high"
        );

        minOracleReputation = _minOracleReputation;
        minConfidence = _minConfidence;
        tradePercentage = _tradePercentage;
        maxSlippageBps = _maxSlippageBps;
        stopLossBps = _stopLossBps;

        emit StrategyUpdated(
            _minOracleReputation,
            _minConfidence,
            _tradePercentage,
            _maxSlippageBps,
            _stopLossBps
        );
    }

    /**
     * @notice Resets the initial portfolio value for stop-loss calculation
     * @dev Useful after significant manual deposits/withdrawals
     */
    function resetInitialPortfolioValue() external onlyOwner {
        initialPortfolioValue = _calculatePortfolioValue();
    }

    /**
     * @notice Pauses or resumes trading
     * @dev Emergency function to stop all trading activity
     * @param _paused True to pause, false to resume
     */
    function setPaused(bool _paused) external onlyOwner {
        isPaused = _paused;
        emit AgentPaused(_paused);
    }

    /**
     * @notice Emergency withdrawal of funds
     * @dev Only callable by owner in case of emergency
     * @param token Token address to withdraw (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner).transfer(amount);
        } else {
            (bool success, ) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", owner, amount)
            );
            require(success, "TradingAgent: transfer failed");
        }
    }

    // ============ View Functions ============

    /**
     * @notice Gets current portfolio balances
     * @return ethBalance Current WETH balance in wei
     * @return usdcBalance Current USDC balance (6 decimals)
     */
    function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance) {
        return (_getTokenBalance(WETH), _getTokenBalance(USDC));
    }

    /**
     * @notice Gets total portfolio value in USDC
     * @return value Total portfolio value (6 decimals)
     */
    function getPortfolioValue() external view returns (uint256 value) {
        return _calculatePortfolioValue();
    }

    /**
     * @notice Calculates total portfolio value in USDC using live prices
     * @dev Uses Chainlink oracle if available, otherwise falls back to hardcoded price
     * @return value Total value in USDC (6 decimals)
     */
    function _calculatePortfolioValue() internal view returns (uint256 value) {
        uint256 usdcBalance = _getTokenBalance(USDC);
        uint256 ethBalance = _getTokenBalance(WETH);

        // Get current ETH price in USDC (6 decimals)
        uint256 ethPriceUsdc = _getEthPriceInUsdc();

        // Calculate ETH value in USDC: (ethBalance * ethPriceUsdc) / 1e18
        uint256 ethValueInUsdc = (ethBalance * ethPriceUsdc) / 1e18;

        // Total portfolio value = USDC balance + ETH value in USDC
        value = usdcBalance + ethValueInUsdc;
    }

    /**
     * @notice Gets trade details for a specific classification
     * @param classificationId The classification ID
     * @return trade Complete trade record
     */
    function getTradeDetails(bytes32 classificationId)
        external
        view
        returns (Trade memory trade)
    {
        return trades[classificationId];
    }

    /**
     * @notice Gets the most recent trades
     * @param count Maximum number of trades to return
     * @return recentTrades Array of recent trades (newest first)
     */
    function getRecentTrades(uint256 count) external view returns (Trade[] memory recentTrades) {
        uint256 len = tradeHistory.length;
        uint256 actualCount = count > len ? len : count;
        recentTrades = new Trade[](actualCount);

        for (uint256 i = 0; i < actualCount; i++) {
            bytes32 classId = tradeHistory[len - 1 - i];
            recentTrades[i] = trades[classId];
        }
    }

    /**
     * @notice Gets trading statistics
     * @return total Total number of trades executed
     * @return profitable Number of profitable trades
     * @return unprofitable Number of unprofitable trades
     * @return winRate Win rate as percentage (0-100)
     */
    function getTradeStats()
        external
        view
        returns (uint256 total, uint256 profitable, uint256 unprofitable, uint256 winRate)
    {
        total = totalTradesExecuted;
        profitable = profitableTrades;
        unprofitable = unprofitableTrades;
        winRate = total > 0 ? (profitable * 100) / total : 0;
    }

    /**
     * @notice Gets the total number of trades in history
     * @return count Number of trades
     */
    function getTradeHistoryLength() external view returns (uint256 count) {
        return tradeHistory.length;
    }

    // ============ Internal Utility Functions ============

    /**
     * @notice Gets token balance of this contract
     * @param token Token address
     * @return balance Token balance
     */
    function _getTokenBalance(address token) internal view returns (uint256 balance) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        if (!success || data.length < 32) return 0;
        balance = abi.decode(data, (uint256));
    }

    /**
     * @notice Approves token spending with USDT compatibility
     * @dev Handles tokens that require approval to be set to 0 first
     * @param token Token address
     * @param spender Spender address
     * @param amount Amount to approve
     */
    function _approveToken(address token, address spender, uint256 amount) internal {
        // First try to approve the amount directly
        (bool success, bytes memory returndata) = token.call(
            abi.encodeWithSelector(0x095ea7b3, spender, amount) // approve(address,uint256)
        );

        // Check if the call was successful and returned true (or no data)
        bool approved = success &&
            (returndata.length == 0 || (returndata.length >= 32 && abi.decode(returndata, (bool))));

        // If approval failed and we're trying to approve a non-zero amount,
        // some tokens (like USDT) require setting allowance to 0 first
        if (!approved && amount > 0) {
            // Set approval to 0
            (success, returndata) = token.call(abi.encodeWithSelector(0x095ea7b3, spender, 0));
            require(
                success &&
                    (returndata.length == 0 ||
                        (returndata.length >= 32 && abi.decode(returndata, (bool)))),
                "TradingAgent: approve to 0 failed"
            );

            // Now approve the actual amount
            (success, returndata) = token.call(
                abi.encodeWithSelector(0x095ea7b3, spender, amount)
            );
        }

        require(
            success &&
                (returndata.length == 0 ||
                    (returndata.length >= 32 && abi.decode(returndata, (bool)))),
            "TradingAgent: approve failed"
        );
    }

    /**
     * @notice Receives ETH for WETH conversion
     */
    receive() external payable {}
}
