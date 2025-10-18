// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INewsOracle.sol";
import "./interfaces/IERC8004.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title TradingAgent
 * @notice Autonomous trading agent that reacts to zkML-verified news classifications
 * @dev Executes actual trades on Uniswap V3 based on news sentiment
 */
contract TradingAgent {
    // Interfaces
    INewsOracle public immutable newsOracle;
    IERC8004 public immutable verificationRegistry;
    ISwapRouter public immutable swapRouter;

    // Configuration
    address public owner;
    uint256 public agentTokenId;  // ERC-8004 token for this agent

    // Strategy parameters
    uint256 public minOracleReputation = 250;
    uint256 public minConfidence = 75;
    uint256 public tradeSize = 0.01 ether;  // Trade 0.01 ETH worth per signal

    // Token addresses (Base Sepolia)
    address public constant WETH = 0x4200000000000000000000000000000000000006;  // Canonical WETH on Base
    address public immutable USDC;  // Set in constructor

    // Trading state
    bool public isPaused = false;
    uint256 public totalTradesExecuted = 0;
    mapping(bytes32 => bool) public processedClassifications;

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
        verificationRegistry = IERC8004(_verificationRegistry);
        swapRouter = ISwapRouter(_swapRouter);
        USDC = _usdc;
        owner = msg.sender;
    }

    /**
     * @notice Set the agent's ERC-8004 token ID
     * @param tokenId The token ID from the registry
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
     * @param classificationId The classification ID from NewsOracle
     */
    function reactToNews(bytes32 classificationId) external whenNotPaused {
        // Prevent duplicate processing
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

        // Verify confidence
        require(news.confidence >= minConfidence, "Confidence too low");

        // Execute trading strategy based on sentiment
        if (news.sentiment == INewsOracle.Sentiment.GOOD_NEWS) {
            _executeBullishTrade(classificationId);
        } else if (news.sentiment == INewsOracle.Sentiment.BAD_NEWS) {
            _executeBearishTrade(classificationId);
        }
        // NEUTRAL_NEWS: No action

        totalTradesExecuted++;
    }

    /**
     * @notice Execute bullish trade (buy ETH/hold ETH)
     * @dev Good news → Stay in ETH or buy more ETH with USDC
     */
    function _executeBullishTrade(bytes32 classificationId) internal {
        // Strategy: If we have USDC, convert some to ETH
        uint256 usdcBalance = _getTokenBalance(USDC);

        if (usdcBalance >= 1e6) {  // At least 1 USDC
            uint256 amountIn = usdcBalance / 10;  // Use 10% of USDC balance
            if (amountIn < 1e6) amountIn = 1e6;  // Minimum 1 USDC

            uint256 amountOut = _swapExactInputSingle(
                USDC,
                WETH,
                3000,  // 0.3% fee tier
                amountIn,
                0  // Accept any amount of WETH (for demo - in production, set slippage)
            );

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
        // If no USDC, just hold ETH (no trade needed)
    }

    /**
     * @notice Execute bearish trade (sell ETH for stablecoin)
     * @dev Bad news → Convert ETH to USDC to protect value
     */
    function _executeBearishTrade(bytes32 classificationId) internal {
        // Strategy: Convert some ETH to USDC
        uint256 ethBalance = _getTokenBalance(WETH);

        if (ethBalance >= 0.001 ether) {  // At least 0.001 ETH
            uint256 amountIn = ethBalance / 10;  // Use 10% of ETH balance
            if (amountIn < 0.001 ether) amountIn = 0.001 ether;  // Minimum 0.001 ETH

            uint256 amountOut = _swapExactInputSingle(
                WETH,
                USDC,
                3000,  // 0.3% fee tier
                amountIn,
                0  // Accept any amount of USDC (for demo)
            );

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
     * @notice Execute a swap on Uniswap V3
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param poolFee Pool fee tier (3000 = 0.3%)
     * @param amountIn Amount of input token
     * @param amountOutMinimum Minimum output amount (slippage protection)
     * @return amountOut Actual amount received
     */
    function _swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 poolFee,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) internal returns (uint256 amountOut) {
        // Approve router to spend tokens
        _approveToken(tokenIn, address(swapRouter), amountIn);

        // Set up swap parameters
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: poolFee,
            recipient: address(this),
            deadline: block.timestamp + 300,  // 5 minute deadline
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0  // No price limit
        });

        // Execute swap
        amountOut = swapRouter.exactInputSingle(params);
    }

    /**
     * @notice Update strategy parameters
     * @param _minOracleReputation Minimum oracle reputation to trust
     * @param _minConfidence Minimum confidence score to act on
     * @param _tradeSize Trade size in wei
     */
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

    /**
     * @notice Pause/unpause the agent
     * @param _paused True to pause, false to unpause
     */
    function setPaused(bool _paused) external onlyOwner {
        isPaused = _paused;
        emit AgentPaused(_paused);
    }

    /**
     * @notice Get portfolio balances
     * @return ethBalance WETH balance
     * @return usdcBalance USDC balance
     */
    function getPortfolio() external view returns (uint256 ethBalance, uint256 usdcBalance) {
        return (_getTokenBalance(WETH), _getTokenBalance(USDC));
    }

    /**
     * @notice Wrap ETH to WETH
     */
    function wrapETH() external payable onlyOwner {
        require(msg.value > 0, "No ETH sent");
        (bool success, ) = WETH.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
        require(success, "WETH wrap failed");
    }

    /**
     * @notice Emergency withdraw tokens
     * @param token Token address (or address(0) for ETH)
     * @param amount Amount to withdraw
     */
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

    /**
     * @notice Get token balance
     */
    function _getTokenBalance(address token) internal view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        if (!success || data.length < 32) return 0;
        return abi.decode(data, (uint256));
    }

    /**
     * @notice Approve token spending
     */
    function _approveToken(address token, address spender, uint256 amount) internal {
        (bool success, ) = token.call(
            abi.encodeWithSignature("approve(address,uint256)", spender, amount)
        );
        require(success, "Approve failed");
    }

    // Accept ETH
    receive() external payable {}
}
