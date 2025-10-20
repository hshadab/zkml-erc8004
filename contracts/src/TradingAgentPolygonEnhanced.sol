// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INewsOracle.sol";
import "./interfaces/IZkMLVerificationRegistry.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title TradingAgentPolygonEnhanced
 * @notice Enhanced trading agent configured for Polygon PoS (WMATIC/USDC on QuickSwap)
 */
contract TradingAgentPolygonEnhanced {
    struct Trade {
        bytes32 classificationId;
        uint256 oracleTokenId;
        INewsOracle.Sentiment sentiment;
        string action;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 timestamp;
        uint256 portfolioValueBefore;
        uint256 portfolioValueAfter;
        bool isProfitable;
        bool hasReported;
    }

    INewsOracle public immutable newsOracle;
    IZkMLVerificationRegistry public immutable verificationRegistry;
    ISwapRouter public immutable swapRouter;

    address public owner;
    uint256 public agentTokenId;

    uint256 public minOracleReputation = 250;
    uint256 public minConfidence = 60; // lower for easier demo
    uint256 public tradeSize = 0.01 ether;

    // Polygon tokens
    address public constant WETH = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270; // WMATIC
    address public immutable USDC; // 0x2791...

    bool public isPaused = false;
    uint256 public totalTradesExecuted = 0;
    uint256 public profitableTrades = 0;
    uint256 public unprofitableTrades = 0;

    mapping(bytes32 => bool) public processedClassifications;
    mapping(bytes32 => Trade) public trades;  // classificationId => Trade
    bytes32[] public tradeHistory;

    uint256 public constant PRECISION = 1e18;

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

    event StrategyUpdated(uint256 minOracleReputation, uint256 minConfidence, uint256 tradeSize);
    event AgentPaused(bool paused);

    modifier onlyOwner() { require(msg.sender == owner, "Only owner"); _; }
    modifier whenNotPaused() { require(!isPaused, "Agent is paused"); _; }

    constructor(address _newsOracle, address _verificationRegistry, address _swapRouter, address _usdc) {
        newsOracle = INewsOracle(_newsOracle);
        verificationRegistry = IZkMLVerificationRegistry(_verificationRegistry);
        swapRouter = ISwapRouter(_swapRouter);
        USDC = _usdc;
        owner = msg.sender;
    }

    function setAgentTokenId(uint256 tokenId) external onlyOwner {
        require(verificationRegistry.isAuthorized(tokenId, "autonomous_trading"), "Token not authorized for trading");
        agentTokenId = tokenId;
    }

    function reactToNews(bytes32 classificationId) external whenNotPaused {
        require(!processedClassifications[classificationId], "Already processed");
        processedClassifications[classificationId] = true;

        INewsOracle.NewsClassification memory news = newsOracle.getClassification(classificationId);

        uint256 oracleReputation = verificationRegistry.getReputationScore(news.oracleTokenId, "news_classification");
        require(oracleReputation >= minOracleReputation, "Oracle reputation too low");
        require(news.confidence >= minConfidence, "Confidence too low");

        uint256 portfolioValueBefore = _calculatePortfolioValue();

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

        if (news.sentiment == INewsOracle.Sentiment.GOOD_NEWS) {
            _executeBullishTrade(classificationId);
        } else if (news.sentiment == INewsOracle.Sentiment.BAD_NEWS) {
            _executeBearishTrade(classificationId);
        }

        totalTradesExecuted++;
    }

    function _executeBullishTrade(bytes32 classificationId) internal {
        uint256 usdcBalance = _getTokenBalance(USDC);
        if (usdcBalance >= 1e6) {
            uint256 amountIn = usdcBalance / 10; if (amountIn < 1e6) amountIn = 1e6;
            uint256 amountOut = _swapExactInputSingle(USDC, WETH, 3000, amountIn, 0);
            Trade storage t = trades[classificationId];
            t.action = "BUY_ETH"; t.tokenIn = USDC; t.tokenOut = WETH; t.amountIn = amountIn; t.amountOut = amountOut;
            emit TradeExecuted(classificationId, "BUY_ETH", USDC, WETH, amountIn, amountOut, block.timestamp);
        }
    }

    function _executeBearishTrade(bytes32 classificationId) internal {
        uint256 ethBalance = _getTokenBalance(WETH);
        if (ethBalance >= 0.001 ether) {
            uint256 amountIn = ethBalance / 10; if (amountIn < 0.001 ether) amountIn = 0.001 ether;
            uint256 amountOut = _swapExactInputSingle(WETH, USDC, 3000, amountIn, 0);
            Trade storage t = trades[classificationId];
            t.action = "SELL_ETH"; t.tokenIn = WETH; t.tokenOut = USDC; t.amountIn = amountIn; t.amountOut = amountOut;
            emit TradeExecuted(classificationId, "SELL_ETH", WETH, USDC, amountIn, amountOut, block.timestamp);
        }
    }

    function evaluateTradeProfitability(bytes32 classificationId) external {
        Trade storage t = trades[classificationId];
        require(t.timestamp > 0, "Trade does not exist");
        require(!t.hasReported, "Already evaluated");
        require(block.timestamp >= t.timestamp + 10 seconds, "Too early to evaluate");
        uint256 afterVal = _calculatePortfolioValue();
        t.portfolioValueAfter = afterVal;
        bool profitable = afterVal > t.portfolioValueBefore; t.isProfitable = profitable;
        if (profitable) { profitableTrades++; } else { unprofitableTrades++; }
        int256 pl=0; if (t.portfolioValueBefore>0){ int256 diff=int256(afterVal)-int256(t.portfolioValueBefore); pl=(diff*100)/int256(t.portfolioValueBefore);} 
        emit TradeProfitabilityDetermined(classificationId, profitable, t.portfolioValueBefore, afterVal, pl);
    }

    function updateStrategy(uint256 _minOracleReputation, uint256 _minConfidence, uint256 _tradeSize) external onlyOwner {
        require(_minConfidence <= 100, "Confidence must be <= 100");
        minOracleReputation = _minOracleReputation; minConfidence = _minConfidence; tradeSize = _tradeSize;
        emit StrategyUpdated(_minOracleReputation, _minConfidence, _tradeSize);
    }

    function setPaused(bool _paused) external onlyOwner { isPaused = _paused; emit AgentPaused(_paused); }

    function getTradeDetails(bytes32 classificationId) external view returns (Trade memory trade) { return trades[classificationId]; }
    function getRecentTrades(uint256 count) external view returns (Trade[] memory recentTrades) {
        uint256 total = tradeHistory.length; uint256 n = count>total? total: count; recentTrades = new Trade[](n);
        for (uint256 i=0;i<n;i++){ bytes32 id = tradeHistory[total-n+i]; recentTrades[i]=trades[id]; }
    }
    function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance) { return (_getTokenBalance(WETH), _getTokenBalance(USDC)); }
    function getPortfolioValue() external view returns (uint256 totalValue) { return _calculatePortfolioValue(); }

    function _calculatePortfolioValue() internal view returns (uint256 totalValue) {
        uint256 usdcBalance = _getTokenBalance(USDC);
        uint256 wmaticBalance = _getTokenBalance(WETH);
        totalValue = usdcBalance; // 6 decimals
        if (wmaticBalance > 0) { totalValue += (wmaticBalance * 700) / 1e18 * 1e6; } // rough demo price
    }

    function _swapExactInputSingle(address tokenIn, address tokenOut, uint24 poolFee, uint256 amountIn, uint256 amountOutMinimum) internal returns (uint256 amountOut) {
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

    function _getTokenBalance(address token) internal view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("balanceOf(address)", address(this)));
        if (!success || data.length < 32) return 0; return abi.decode(data, (uint256));
    }

    function _approveToken(address token, address spender, uint256 amount) internal {
        (bool success, ) = token.call(abi.encodeWithSignature("approve(address,uint256)", spender, amount));
        require(success, "Approve failed");
    }

    receive() external payable {}
}

