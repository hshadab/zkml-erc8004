// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INewsOracle.sol";
import "./interfaces/IERC8004.sol";
import "./interfaces/IValidationRegistry.sol";

/**
 * @title NewsClassificationOracle
 * @notice Oracle that posts zkML-verified news classifications on-chain
 * @dev Uses ERC-8004 for capability verification and reputation tracking
 */
contract NewsClassificationOracle is INewsOracle {
    // State variables
    IERC8004 public immutable verificationRegistry;
    IValidationRegistry public validationRegistry;
    uint256 public oracleTokenId;
    address public owner;

    mapping(bytes32 => NewsClassification) private _classifications;
    bytes32[] private _classificationIds;

    uint256 public constant MIN_CONFIDENCE = 60;

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorizedOracle() {
        require(
            verificationRegistry.isAuthorized(oracleTokenId, "news_classification"),
            "Oracle not authorized"
        );
        _;
    }

    constructor(address _verificationRegistry) {
        verificationRegistry = IERC8004(_verificationRegistry);
        owner = msg.sender;
    }

    /**
     * @notice Set the oracle token ID (must be registered in ERC-8004 registry)
     * @param tokenId The ERC-8004 token ID for this oracle
     */
    function setOracleTokenId(uint256 tokenId) external onlyOwner {
        require(
            verificationRegistry.isAuthorized(tokenId, "news_classification"),
            "Token not authorized for news_classification"
        );
        oracleTokenId = tokenId;
    }

    /**
     * @notice Set the validation registry address (ERC-8004 validation tracking)
     * @param _validationRegistry Address of the ValidationRegistry contract
     */
    function setValidationRegistry(address _validationRegistry) external onlyOwner {
        require(_validationRegistry != address(0), "Invalid validation registry");
        validationRegistry = IValidationRegistry(_validationRegistry);
    }

    /**
     * @notice Post a new news classification
     * @param headline The news headline
     * @param sentiment Classification result
     * @param confidence Confidence score (0-100)
     * @param proofHash Hash of JOLT-Atlas proof
     * @return classificationId Unique ID for this classification
     */
    function postClassification(
        string calldata headline,
        Sentiment sentiment,
        uint8 confidence,
        bytes32 proofHash
    )
        external
        onlyOwner
        onlyAuthorizedOracle
        returns (bytes32 classificationId)
    {
        return _postClassificationInternal(headline, sentiment, confidence, proofHash, address(0), 0, bytes32(0));
    }

    /**
     * @notice Post a paid news classification (X402 integration)
     * @param headline The news headline
     * @param sentiment Classification result
     * @param confidence Confidence score (0-100)
     * @param proofHash Hash of JOLT-Atlas proof
     * @param payer Address that paid for the classification
     * @param paymentAmount Amount paid in USDC (6 decimals)
     * @param paymentTxHash Payment transaction hash
     * @return classificationId Unique ID for this classification
     */
    function postPaidClassification(
        string calldata headline,
        Sentiment sentiment,
        uint8 confidence,
        bytes32 proofHash,
        address payer,
        uint256 paymentAmount,
        bytes32 paymentTxHash
    )
        external
        onlyOwner
        onlyAuthorizedOracle
        returns (bytes32 classificationId)
    {
        require(payer != address(0), "Invalid payer address");
        require(paymentAmount > 0, "Payment amount must be positive");
        require(paymentTxHash != bytes32(0), "Payment tx hash required");

        return _postClassificationInternal(headline, sentiment, confidence, proofHash, payer, paymentAmount, paymentTxHash);
    }

    /**
     * @notice Internal function to post classification
     */
    function _postClassificationInternal(
        string calldata headline,
        Sentiment sentiment,
        uint8 confidence,
        bytes32 proofHash,
        address payer,
        uint256 paymentAmount,
        bytes32 paymentTxHash
    ) internal returns (bytes32 classificationId) {
        require(confidence >= MIN_CONFIDENCE, "Confidence too low");
        require(bytes(headline).length > 0, "Headline cannot be empty");
        require(proofHash != bytes32(0), "Proof hash required");

        // Generate unique ID
        classificationId = keccak256(
            abi.encodePacked(
                headline,
                block.timestamp,
                block.number,
                _classificationIds.length
            )
        );

        // Store classification
        _classifications[classificationId] = NewsClassification({
            id: classificationId,
            headline: headline,
            sentiment: sentiment,
            confidence: confidence,
            proofHash: proofHash,
            timestamp: block.timestamp,
            oracleTokenId: oracleTokenId
        });

        _classificationIds.push(classificationId);

        // Submit proof to registry
        verificationRegistry.submitProof(oracleTokenId, proofHash);

        // Record payment if this was a paid classification (X402 integration)
        if (payer != address(0)) {
            try verificationRegistry.recordPayment(
                classificationId,
                oracleTokenId,
                payer,
                paymentAmount,
                paymentTxHash
            ) {
                // Payment recorded successfully
            } catch {
                // Payment recording failed, continue without it
                // This ensures backward compatibility if registry doesn't support payments yet
            }
        }

        // Request validation from ValidationRegistry (ERC-8004)
        if (address(validationRegistry) != address(0)) {
            bytes32 workHash = keccak256(abi.encodePacked(classificationId, proofHash));
            try validationRegistry.requestValidation(classificationId, workHash, oracleTokenId) {
                // Validation request succeeded
            } catch {
                // Validation registry call failed, continue without it
            }
        }

        emit NewsClassified(
            classificationId,
            headline,
            sentiment,
            confidence,
            proofHash,
            block.timestamp,
            oracleTokenId
        );

        return classificationId;
    }

    /**
     * @notice Get classification by ID
     * @param classificationId The classification ID
     * @return classification The full classification data
     */
    function getClassification(bytes32 classificationId)
        external
        view
        override
        returns (NewsClassification memory classification)
    {
        require(_classifications[classificationId].timestamp != 0, "Classification not found");
        return _classifications[classificationId];
    }

    /**
     * @notice Get latest classification
     * @return classification The most recent classification
     */
    function getLatestClassification()
        external
        view
        override
        returns (NewsClassification memory classification)
    {
        require(_classificationIds.length > 0, "No classifications yet");
        bytes32 latestId = _classificationIds[_classificationIds.length - 1];
        return _classifications[latestId];
    }

    /**
     * @notice Get total number of classifications
     * @return count Total classifications posted
     */
    function getClassificationCount() external view override returns (uint256 count) {
        return _classificationIds.length;
    }

    /**
     * @notice Get classification ID by index
     * @param index The index in the classifications array
     * @return classificationId The classification ID
     */
    function getClassificationIdByIndex(uint256 index) external view returns (bytes32 classificationId) {
        require(index < _classificationIds.length, "Index out of bounds");
        return _classificationIds[index];
    }

    /**
     * @notice Get multiple recent classifications
     * @param count Number of classifications to return
     * @return classifications Array of recent classifications
     */
    function getRecentClassifications(uint256 count)
        external
        view
        returns (NewsClassification[] memory classifications)
    {
        uint256 total = _classificationIds.length;
        uint256 returnCount = count > total ? total : count;

        classifications = new NewsClassification[](returnCount);

        for (uint256 i = 0; i < returnCount; i++) {
            bytes32 id = _classificationIds[total - returnCount + i];
            classifications[i] = _classifications[id];
        }

        return classifications;
    }

    /**
     * @notice Get oracle reputation score
     * @return score Current reputation (0-1000)
     */
    function getOracleReputation() external view returns (uint256 score) {
        return verificationRegistry.getReputationScore(oracleTokenId, "news_classification");
    }
}
