// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INewsOracle.sol";
import "./interfaces/IZkMLVerificationRegistry.sol";

/**
 * @title TradingAgentBase
 * @notice Trading agent for Base Mainnet using Uniswap V3
 * @dev Integrates with Uniswap V3 SwapRouter for ETH/USDC trading
 */
contract TradingAgentBase {
    address public owner;
    INewsOracle public immutable newsOracle;
    IZkMLVerificationRegistry public immutable verificationRegistry;
    address public immutable swapRouter; // Uniswap V3 SwapRouter
    address public immutable WETH;
    address public immutable USDC;
    uint24 public immutable poolFee; // Uniswap V3 pool fee tier

    uint256 public agentTokenId;
    uint256 public minOracleReputation = 50;
    uint256 public minConfidence = 60;
    uint256 public tradeSize = 10;
    bool public isPaused = false;

    struct Trade {
        bytes32 classificationId;
        uint256 oracleTokenId;
        uint8 sentiment;
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

    mapping(bytes32 => Trade) public trades;
    mapping(bytes32 => bool) public processedClassifications;
    bytes32[] public tradeHistory;

    uint256 public totalTradesExecuted;
    uint256 public profitableTrades;
    uint256 public unprofitableTrades;

    event TradeExecuted(bytes32 indexed classificationId, string action, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp);
    event TradeProfitabilityDetermined(bytes32 indexed classificationId, bool profitable, uint256 valueBefore, uint256 valueAfter, int256 profitLossPercent);
    event StrategyUpdated(uint256 minOracleReputation, uint256 minConfidence, uint256 tradeSize);
    event AgentPaused(bool paused);

    modifier onlyOwner() { require(msg.sender == owner, "Only owner"); _; }
    modifier whenNotPaused() { require(!isPaused, "Paused"); _; }

    constructor(
        address _newsOracle,
        address _verificationRegistry,
        address _swapRouter,
        address _weth,
        address _usdc,
        uint24 _poolFee
    ) {
        owner = msg.sender;
        newsOracle = INewsOracle(_newsOracle);
        verificationRegistry = IZkMLVerificationRegistry(_verificationRegistry);
        swapRouter = _swapRouter;
        WETH = _weth;
        USDC = _usdc;
        poolFee = _poolFee;
    }

    function setAgentTokenId(uint256 _tokenId) external onlyOwner {
        agentTokenId = _tokenId;
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
            sentiment: uint8(news.sentiment),
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
        if (usdcBalance >= 1e6) { // At least $1 USDC
            uint256 amountIn = usdcBalance / 10; // Trade 10% of USDC balance
            if (amountIn < 1e6) amountIn = 1e6; // Minimum $1

            uint256 amountOut = _swapV3(USDC, WETH, amountIn, 0);

            Trade storage t = trades[classificationId];
            t.action = "BUY_ETH";
            t.tokenIn = USDC;
            t.tokenOut = WETH;
            t.amountIn = amountIn;
            t.amountOut = amountOut;
            emit TradeExecuted(classificationId, "BUY_ETH", USDC, WETH, amountIn, amountOut, block.timestamp);
        }
    }

    function _executeBearishTrade(bytes32 classificationId) internal {
        uint256 ethBalance = _getTokenBalance(WETH);
        if (ethBalance >= 0.001 ether) { // At least 0.001 ETH
            uint256 amountIn = ethBalance / 10; // Trade 10% of ETH balance
            if (amountIn < 0.001 ether) amountIn = 0.001 ether; // Minimum 0.001 ETH

            uint256 amountOut = _swapV3(WETH, USDC, amountIn, 0);

            Trade storage t = trades[classificationId];
            t.action = "SELL_ETH";
            t.tokenIn = WETH;
            t.tokenOut = USDC;
            t.amountIn = amountIn;
            t.amountOut = amountOut;
            emit TradeExecuted(classificationId, "SELL_ETH", WETH, USDC, amountIn, amountOut, block.timestamp);
        }
    }

    /**
     * @notice Executes swap using Uniswap V3 SwapRouter02
     * @dev Uses exactInputSingle for single-hop swaps (SwapRouter02 does NOT use deadline parameter)
     */
    function _swapV3(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) internal returns (uint256) {
        _approveToken(tokenIn, swapRouter, amountIn);

        // Manual ABI encoding for exactInputSingle with struct parameter
        // Function selector: bytes4(keccak256("exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))"))
        bytes4 selector = 0x04e45aaf; // exactInputSingle selector

        bytes memory callData = abi.encodePacked(
            selector,
            abi.encode(tokenIn, tokenOut, poolFee, address(this), amountIn, amountOutMin, uint160(0))
        );

        (bool success, bytes memory data) = swapRouter.call(callData);
        require(success, "Swap failed");
        uint256 amountOut = abi.decode(data, (uint256));
        return amountOut;
    }

    function evaluateTradeProfitability(bytes32 classificationId) external {
        Trade storage t = trades[classificationId];
        require(t.timestamp > 0, "Trade does not exist");
        require(!t.hasReported, "Already evaluated");
        require(block.timestamp >= t.timestamp + 10 seconds, "Too early to evaluate");

        uint256 afterVal = _calculatePortfolioValue();
        t.portfolioValueAfter = afterVal;
        bool profitable = afterVal > t.portfolioValueBefore;
        t.isProfitable = profitable;

        if (profitable) { profitableTrades++; } else { unprofitableTrades++; }

        int256 pl = 0;
        if (t.portfolioValueBefore > 0) {
            int256 diff = int256(afterVal) - int256(t.portfolioValueBefore);
            pl = (diff * 100) / int256(t.portfolioValueBefore);
        }

        emit TradeProfitabilityDetermined(classificationId, profitable, t.portfolioValueBefore, afterVal, pl);
    }

    function updateStrategy(uint256 _minOracleReputation, uint256 _minConfidence, uint256 _tradeSize) external onlyOwner {
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

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            payable(owner).transfer(amount);
        } else {
            (bool success, ) = token.call(abi.encodeWithSignature("transfer(address,uint256)", owner, amount));
            require(success, "Transfer failed");
        }
    }

    function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance) {
        return (_getTokenBalance(WETH), _getTokenBalance(USDC));
    }

    function getPortfolioValue() external view returns (uint256) {
        return _calculatePortfolioValue();
    }

    function _calculatePortfolioValue() internal view returns (uint256) {
        uint256 usdcBalance = _getTokenBalance(USDC);
        uint256 ethBalance = _getTokenBalance(WETH);

        // Estimate ETH value in USDC (assume 1 ETH = $1800 for rough estimate)
        // In production, would query Uniswap V3 pool or oracle
        uint256 ethValueInUsdc = (ethBalance * 1800) / 1e18;
        return usdcBalance + ethValueInUsdc;
    }

    function getTradeDetails(bytes32 classificationId) external view returns (Trade memory) {
        return trades[classificationId];
    }

    function getRecentTrades(uint256 count) external view returns (Trade[] memory) {
        uint256 len = tradeHistory.length;
        uint256 actualCount = count > len ? len : count;
        Trade[] memory recentTrades = new Trade[](actualCount);

        for (uint256 i = 0; i < actualCount; i++) {
            bytes32 classId = tradeHistory[len - 1 - i];
            recentTrades[i] = trades[classId];
        }

        return recentTrades;
    }

    function getTradeStats() external view returns (uint256 total, uint256 profitable, uint256 unprofitable, uint256 winRate) {
        total = totalTradesExecuted;
        profitable = profitableTrades;
        unprofitable = unprofitableTrades;
        winRate = total > 0 ? (profitable * 100) / total : 0;
        return (total, profitable, unprofitable, winRate);
    }

    function _getTokenBalance(address token) internal view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(abi.encodeWithSignature("balanceOf(address)", address(this)));
        if (!success || data.length < 32) return 0;
        return abi.decode(data, (uint256));
    }

    function _approveToken(address token, address spender, uint256 amount) internal {
        // First try to approve the amount
        (bool success, bytes memory returndata) = token.call(
            abi.encodeWithSelector(0x095ea7b3, spender, amount) // approve(address,uint256)
        );

        // Check if the call was successful and returned true (or no data)
        bool approved = success && (returndata.length == 0 || (returndata.length >= 32 && abi.decode(returndata, (bool))));

        // If approval failed and we're trying to approve a non-zero amount,
        // some tokens (like USDT) require setting to 0 first
        if (!approved && amount > 0) {
            (success, returndata) = token.call(
                abi.encodeWithSelector(0x095ea7b3, spender, 0)
            );
            require(success && (returndata.length == 0 || (returndata.length >= 32 && abi.decode(returndata, (bool)))), "Approve to 0 failed");

            (success, returndata) = token.call(
                abi.encodeWithSelector(0x095ea7b3, spender, amount)
            );
        }

        require(success && (returndata.length == 0 || (returndata.length >= 32 && abi.decode(returndata, (bool)))), "Approve failed");
    }

    receive() external payable {}
}
