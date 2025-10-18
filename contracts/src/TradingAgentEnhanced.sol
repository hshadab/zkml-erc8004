// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INewsOracle.sol";
import "./interfaces/IZkMLVerificationRegistry.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title TradingAgentEnhanced
 * @notice Enhanced trading agent with profitability tracking and reputation feedback
 * @dev Tracks all trades, calculates P&L, and reports back to ERC-8004 registry
 */
contract TradingAgentEnhanced {
    struct Trade {
        bytes32 classificationId;
        uint256 oracleTokenId;
        INewsOracle.Sentiment sentiment;
        string action;                // "BUY_ETH" or "SELL_ETH"
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 timestamp;
        uint256 portfolioValueBefore;  // Snapshot before trade
        uint256 portfolioValueAfter;   // Snapshot after 10s
        bool isProfitable;             // Determined after 10s
        bool hasReported;              // Reported to registry
    }

    // Interfaces
    INewsOracle public immutable newsOracle;
    IZkMLVerificationRegistry public immutable verificationRegistry;
    ISwapRouter public immutable swapRouter;

    // Configuration
    address public owner;
    uint256 public agentTokenId;

    // Strategy parameters
    uint256 public minOracleReputation = 250;
    uint256 public minConfidence = 75;
    uint256 public tradeSize = 0.01 ether;

    // Token addresses (Base Sepolia)
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public immutable USDC;

    // Trading state
    bool public isPaused = false;
    uint256 public totalTradesExecuted = 0;
    uint256 public profitableTrades = 0;
    uint256 public unprofitableTrades = 0;

    mapping(bytes32 => bool) public processedClassifications;
    mapping(bytes32 => Trade) public trades;  // classificationId => Trade
    bytes32[] public tradeHistory;

    // Price tracking (simplified - using ratio)
    uint256 public constant PRECISION = 1e18;

    // Events
    event TradeExecuted(
        bytes32 indexed classificationId,
        string action,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    event TradeProfitabilityDetermined(
        bytes32 indexed classificationId,
        bool profitable,
        uint256 portfolioValueBefore,
        uint256 portfolioValueAfter,
        int256 profitLossPercent
    );

    event ReputationReported(
        bytes32 indexed classificationId,
        uint256 indexed oracleTokenId,
        bool wasCorrect
    );

    event StrategyUpdated(
        uint256 minOracleReputation,
        uint256 minConfidence,
        uint256 tradeSize
    );

    event AgentPaused(bool paused);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenNotPaused() {
        require(!isPaused, "Agent is paused");
        _;
    }

    constructor(
        address _newsOracle,
        address _verificationRegistry,
        address _swapRouter,
        address _usdc
    ) {
        newsOracle = INewsOracle(_newsOracle);
        verificationRegistry = IZkMLVerificationRegistry(_verificationRegistry);
        swapRouter = ISwapRouter(_swapRouter);
        USDC = _usdc;
        owner = msg.sender;
    }

    /**
     * @notice Set the agent's ERC-8004 token ID
     */
    function setAgentTokenId(uint256 tokenId) external onlyOwner {
        require(
            verificationRegistry.isAuthorized(tokenId, "autonomous_trading"),
            "Token not authorized for trading"
        );
        agentTokenId = tokenId;
    }

    /**
     * @notice React to a news classification and execute trade
     */
    function reactToNews(bytes32 classificationId) external whenNotPaused {
        require(!processedClassifications[classificationId], "Already processed");
        processedClassifications[classificationId] = true;

        // Get classification
        INewsOracle.NewsClassification memory news = newsOracle.getClassification(classificationId);

        // Verify oracle reputation
        uint256 oracleReputation = verificationRegistry.getReputationScore(
            news.oracleTokenId,
            "news_classification"
        );
        require(oracleReputation >= minOracleReputation, "Oracle reputation too low");
        require(news.confidence >= minConfidence, "Confidence too low");

        // Snapshot portfolio value BEFORE trade
        uint256 portfolioValueBefore = _calculatePortfolioValue();

        // Initialize trade record
        trades[classificationId] = Trade({
            classificationId: classificationId,
            oracleTokenId: news.oracleTokenId,
            sentiment: news.sentiment,
            action: "",
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

        // Execute trading strategy
        if (news.sentiment == INewsOracle.Sentiment.GOOD_NEWS) {
            _executeBullishTrade(classificationId);
        } else if (news.sentiment == INewsOracle.Sentiment.BAD_NEWS) {
            _executeBearishTrade(classificationId);
        }

        totalTradesExecuted++;
    }

    /**
     * @notice Execute bullish trade
     */
    function _executeBullishTrade(bytes32 classificationId) internal {
        uint256 usdcBalance = _getTokenBalance(USDC);

        if (usdcBalance >= 1e6) {
            uint256 amountIn = usdcBalance / 10;
            if (amountIn < 1e6) amountIn = 1e6;

            uint256 amountOut = _swapExactInputSingle(USDC, WETH, 3000, amountIn, 0);

            // Update trade record
            Trade storage trade = trades[classificationId];
            trade.action = "BUY_ETH";
            trade.tokenIn = USDC;
            trade.tokenOut = WETH;
            trade.amountIn = amountIn;
            trade.amountOut = amountOut;

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
     * @notice Execute bearish trade
     */
    function _executeBearishTrade(bytes32 classificationId) internal {
        uint256 ethBalance = _getTokenBalance(WETH);

        if (ethBalance >= 0.001 ether) {
            uint256 amountIn = ethBalance / 10;
            if (amountIn < 0.001 ether) amountIn = 0.001 ether;

            uint256 amountOut = _swapExactInputSingle(WETH, USDC, 3000, amountIn, 0);

            // Update trade record
            Trade storage trade = trades[classificationId];
            trade.action = "SELL_ETH";
            trade.tokenIn = WETH;
            trade.tokenOut = USDC;
            trade.amountIn = amountIn;
            trade.amountOut = amountOut;

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
     * @notice Evaluate trade profitability after time period (10 seconds)
     * @param classificationId The trade to evaluate
     */
    function evaluateTradeProfitability(bytes32 classificationId) external {
        Trade storage trade = trades[classificationId];
        require(trade.timestamp > 0, "Trade does not exist");
        require(!trade.hasReported, "Already evaluated");
        require(block.timestamp >= trade.timestamp + 10 seconds, "Too early to evaluate");

        // Snapshot portfolio value AFTER 10 seconds
        uint256 portfolioValueAfter = _calculatePortfolioValue();
        trade.portfolioValueAfter = portfolioValueAfter;

        // Calculate profitability
        bool profitable = portfolioValueAfter > trade.portfolioValueBefore;
        trade.isProfitable = profitable;

        if (profitable) {
            profitableTrades++;
        } else {
            unprofitableTrades++;
        }

        // Calculate P&L percentage
        int256 profitLossPercent;
        if (trade.portfolioValueBefore > 0) {
            int256 diff = int256(portfolioValueAfter) - int256(trade.portfolioValueBefore);
            profitLossPercent = (diff * 100) / int256(trade.portfolioValueBefore);
        }

        emit TradeProfitabilityDetermined(
            classificationId,
            profitable,
            trade.portfolioValueBefore,
            portfolioValueAfter,
            profitLossPercent
        );
    }

    /**
     * @notice Report trade result to ERC-8004 registry (updates oracle reputation)
     * @param classificationId The trade to report
     */
    function reportTradeToRegistry(bytes32 classificationId) external {
        Trade storage trade = trades[classificationId];
        require(trade.portfolioValueAfter > 0, "Trade not evaluated yet");
        require(!trade.hasReported, "Already reported");

        trade.hasReported = true;

        // Report to registry
        if (trade.isProfitable) {
            // Trade was profitable → oracle was correct
            verificationRegistry.increaseReputation(trade.oracleTokenId, 5);
        } else {
            // Trade was unprofitable → oracle was incorrect
            verificationRegistry.decreaseReputation(trade.oracleTokenId, 10);
        }

        emit ReputationReported(classificationId, trade.oracleTokenId, trade.isProfitable);
    }

    /**
     * @notice Calculate total portfolio value in USDC equivalent
     * @return totalValue Portfolio value in USDC (6 decimals)
     */
    function _calculatePortfolioValue() internal view returns (uint256 totalValue) {
        uint256 usdcBalance = _getTokenBalance(USDC);
        uint256 wethBalance = _getTokenBalance(WETH);

        // USDC value is direct
        totalValue = usdcBalance;

        // For WETH, we'd need a price oracle in production
        // For demo, approximate: 1 ETH ≈ 2000 USDC
        if (wethBalance > 0) {
            totalValue += (wethBalance * 2000) / 1e18 * 1e6;
        }

        return totalValue;
    }

    /**
     * @notice Get trade statistics
     */
    function getTradeStats()
        external
        view
        returns (
            uint256 total,
            uint256 profitable,
            uint256 unprofitable,
            uint256 winRate
        )
    {
        total = totalTradesExecuted;
        profitable = profitableTrades;
        unprofitable = unprofitableTrades;

        if (total > 0) {
            winRate = (profitableTrades * 100) / total;
        } else {
            winRate = 0;
        }
    }

    /**
     * @notice Get trade details
     */
    function getTradeDetails(bytes32 classificationId)
        external
        view
        returns (Trade memory trade)
    {
        return trades[classificationId];
    }

    /**
     * @notice Get recent trades
     */
    function getRecentTrades(uint256 count)
        external
        view
        returns (Trade[] memory recentTrades)
    {
        uint256 totalTrades = tradeHistory.length;
        uint256 returnCount = count > totalTrades ? totalTrades : count;

        recentTrades = new Trade[](returnCount);

        for (uint256 i = 0; i < returnCount; i++) {
            bytes32 classificationId = tradeHistory[totalTrades - returnCount + i];
            recentTrades[i] = trades[classificationId];
        }

        return recentTrades;
    }

    /**
     * @notice Get portfolio balances
     */
    function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance) {
        return (_getTokenBalance(WETH), _getTokenBalance(USDC));
    }

    /**
     * @notice Get portfolio value
     */
    function getPortfolioValue() external view returns (uint256 totalValue) {
        return _calculatePortfolioValue();
    }

    // [Include all other functions from original TradingAgent.sol]
    function _swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 poolFee,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) internal returns (uint256 amountOut) {
        _approveToken(tokenIn, address(swapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: poolFee,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        amountOut = swapRouter.exactInputSingle(params);
    }

    function updateStrategy(
        uint256 _minOracleReputation,
        uint256 _minConfidence,
        uint256 _tradeSize
    ) external onlyOwner {
        require(_minConfidence <= 100, "Confidence must be <= 100");
        minOracleReputation = _minOracleReputation;
        minConfidence = _minConfidence;
        tradeSize = _tradeSize;
        emit StrategyUpdated(_minOracleReputation, _minConfidence, _tradeSize);
    }

    function setPaused(bool _paused) external onlyOwner {
        isPaused = _paused;
        emit AgentPaused(_paused);
    }

    function wrapETH() external payable onlyOwner {
        require(msg.value > 0, "No ETH sent");
        (bool success, ) = WETH.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
        require(success, "WETH wrap failed");
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner).transfer(amount);
        } else {
            (bool success, ) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", owner, amount)
            );
            require(success, "Transfer failed");
        }
    }

    function _getTokenBalance(address token) internal view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        if (!success || data.length < 32) return 0;
        return abi.decode(data, (uint256));
    }

    function _approveToken(address token, address spender, uint256 amount) internal {
        (bool success, ) = token.call(
            abi.encodeWithSignature("approve(address,uint256)", spender, amount)
        );
        require(success, "Approve failed");
    }

    receive() external payable {}
}
