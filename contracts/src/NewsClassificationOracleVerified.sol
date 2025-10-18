// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/INewsOracle.sol";
import "./interfaces/IERC8004.sol";
import "./NewsVerifier.sol";

/**
 * @title NewsClassificationOracleVerified
 * @notice Enhanced oracle with on-chain zkML proof verification
 * @dev Integrates Groth16 verifier for cryptographic proof validation
 */
contract NewsClassificationOracleVerified is INewsOracle {
    // Interfaces
    IERC8004 public immutable verificationRegistry;
    NewsVerifier public immutable newsVerifier;

    // State
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

    constructor(address _verificationRegistry, address _newsVerifier) {
        verificationRegistry = IERC8004(_verificationRegistry);
        newsVerifier = NewsVerifier(_newsVerifier);
        owner = msg.sender;
    }

    /**
     * @notice Set the oracle token ID
     */
    function setOracleTokenId(uint256 tokenId) external onlyOwner {
        require(
            verificationRegistry.isAuthorized(tokenId, "news_classification"),
            "Token not authorized for news_classification"
        );
        oracleTokenId = tokenId;
    }

    /**
     * @notice Post classification with on-chain proof verification
     * @param headline The news headline
     * @param sentiment Classification result
     * @param confidence Confidence score (0-100)
     * @param proofHash Hash of JOLT-Atlas proof
     * @param groth16Proof The Groth16 proof components [pA, pB, pC]
     * @param pubSignals Public signals [sentiment, confidence, featuresHash]
     * @return classificationId Unique ID for this classification
     */
    function postClassificationWithProof(
        string calldata headline,
        Sentiment sentiment,
        uint8 confidence,
        bytes32 proofHash,
        bytes calldata groth16Proof,  // Packed: pA (64 bytes) + pB (128 bytes) + pC (64 bytes) = 256 bytes
        uint[3] calldata pubSignals
    )
        external
        onlyOwner
        onlyAuthorizedOracle
        returns (bytes32 classificationId)
    {
        require(confidence >= MIN_CONFIDENCE, "Confidence too low");
        require(bytes(headline).length > 0, "Headline cannot be empty");
        require(proofHash != bytes32(0), "Proof hash required");

        // Validate public signals match claimed values
        require(pubSignals[0] == uint256(sentiment), "Sentiment mismatch");
        require(pubSignals[1] == uint256(confidence), "Confidence mismatch");

        // Generate classification ID
        classificationId = keccak256(
            abi.encodePacked(
                headline,
                block.timestamp,
                block.number,
                _classificationIds.length
            )
        );

        // Decode Groth16 proof
        (uint[2] memory pA, uint[2][2] memory pB, uint[2] memory pC) = _decodeGroth16Proof(groth16Proof);

        // Verify proof on-chain using NewsVerifier
        bool verified = newsVerifier.verifyAndStore(
            classificationId,
            pA,
            pB,
            pC,
            pubSignals
        );

        require(verified, "Proof verification failed");

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
     * @notice Post classification (legacy method without on-chain verification)
     * @dev For backward compatibility - still requires proof hash
     */
    function postClassification(
        string calldata headline,
        Sentiment sentiment,
        uint8 confidence,
        bytes32 proofHash
    )
        external
        override
        onlyOwner
        onlyAuthorizedOracle
        returns (bytes32 classificationId)
    {
        require(confidence >= MIN_CONFIDENCE, "Confidence too low");
        require(bytes(headline).length > 0, "Headline cannot be empty");
        require(proofHash != bytes32(0), "Proof hash required");

        classificationId = keccak256(
            abi.encodePacked(
                headline,
                block.timestamp,
                block.number,
                _classificationIds.length
            )
        );

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
        verificationRegistry.submitProof(oracleTokenId, proofHash);

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
     * @notice Decode packed Groth16 proof
     * @param proof Packed proof bytes (256 bytes total)
     * @return pA Proof point A
     * @return pB Proof point B
     * @return pC Proof point C
     */
    function _decodeGroth16Proof(bytes calldata proof)
        internal
        pure
        returns (
            uint[2] memory pA,
            uint[2][2] memory pB,
            uint[2] memory pC
        )
    {
        require(proof.length == 256, "Invalid proof length");

        // pA: bytes 0-63 (2 x uint256)
        pA[0] = uint256(bytes32(proof[0:32]));
        pA[1] = uint256(bytes32(proof[32:64]));

        // pB: bytes 64-191 (4 x uint256, arranged as 2x2)
        pB[0][0] = uint256(bytes32(proof[64:96]));
        pB[0][1] = uint256(bytes32(proof[96:128]));
        pB[1][0] = uint256(bytes32(proof[128:160]));
        pB[1][1] = uint256(bytes32(proof[160:192]));

        // pC: bytes 192-255 (2 x uint256)
        pC[0] = uint256(bytes32(proof[192:224]));
        pC[1] = uint256(bytes32(proof[224:256]));

        return (pA, pB, pC);
    }

    // View functions
    function getClassification(bytes32 classificationId)
        external
        view
        override
        returns (NewsClassification memory classification)
    {
        require(_classifications[classificationId].timestamp != 0, "Classification not found");
        return _classifications[classificationId];
    }

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

    function getClassificationCount() external view override returns (uint256 count) {
        return _classificationIds.length;
    }

    function getClassificationIdByIndex(uint256 index) external view returns (bytes32 classificationId) {
        require(index < _classificationIds.length, "Index out of bounds");
        return _classificationIds[index];
    }

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

    function getOracleReputation() external view returns (uint256 score) {
        return verificationRegistry.getReputationScore(oracleTokenId, "news_classification");
    }

    /**
     * @notice Check if a classification has on-chain verification
     * @param classificationId The classification ID
     * @return verified True if verified on-chain
     */
    function isVerifiedOnChain(bytes32 classificationId) external view returns (bool verified) {
        return newsVerifier.isClassificationVerified(classificationId);
    }
}
