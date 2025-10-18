// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title INewsOracle
 * @notice Interface for the News Classification Oracle
 */
interface INewsOracle {
    enum Sentiment {
        BAD_NEWS,      // Negative news (0)
        NEUTRAL_NEWS,  // Neutral news (1)
        GOOD_NEWS      // Positive news (2)
    }

    struct NewsClassification {
        bytes32 id;              // Unique classification ID
        string headline;         // News headline
        Sentiment sentiment;     // Classification result
        uint8 confidence;        // Confidence score (0-100)
        bytes32 proofHash;       // JOLT-Atlas proof hash
        uint256 timestamp;       // Classification timestamp
        uint256 oracleTokenId;   // ERC-8004 token ID of oracle
    }

    /// @notice Emitted when news is classified
    event NewsClassified(
        bytes32 indexed classificationId,
        string headline,
        Sentiment sentiment,
        uint8 confidence,
        bytes32 proofHash,
        uint256 timestamp,
        uint256 indexed oracleTokenId
    );

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
    ) external returns (bytes32 classificationId);

    /**
     * @notice Get classification by ID
     * @param classificationId The classification ID
     * @return classification The full classification data
     */
    function getClassification(
        bytes32 classificationId
    ) external view returns (NewsClassification memory classification);

    /**
     * @notice Get latest classification
     * @return classification The most recent classification
     */
    function getLatestClassification() external view returns (NewsClassification memory classification);

    /**
     * @notice Get total number of classifications
     * @return count Total classifications posted
     */
    function getClassificationCount() external view returns (uint256 count);
}
