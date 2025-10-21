// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Groth16Verifier.sol";
import "./interfaces/IValidationRegistry.sol";

/**
 * @title NewsVerifier
 * @notice Wrapper contract for verifying zkML news classification proofs
 * @dev Stores verified classifications and provides query interface
 */
contract NewsVerifier is Groth16Verifier {
    struct VerifiedClassification {
        uint256 sentiment;      // 0=BAD, 1=NEUTRAL, 2=GOOD
        uint256 confidence;     // 0-100
        uint256 featuresHash;   // Hash of input features
        uint256 timestamp;
        address verifier;
        bytes32 proofHash;
    }

    // ERC-8004 Validation Registry integration
    IValidationRegistry public validationRegistry;
    uint256 public validatorTokenId;
    address public owner;

    // Mapping from classification ID to verified data
    mapping(bytes32 => VerifiedClassification) public verifiedClassifications;

    // Mapping to prevent duplicate verifications
    mapping(bytes32 => bool) public isVerified;

    // Events
    event ClassificationVerified(
        bytes32 indexed classificationId,
        uint256 sentiment,
        uint256 confidence,
        uint256 featuresHash,
        address indexed verifier,
        uint256 timestamp
    );

    event VerificationFailed(
        bytes32 indexed classificationId,
        address indexed verifier,
        string reason
    );

    // Modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Set the validation registry address (ERC-8004)
     * @param _validationRegistry Address of the ValidationRegistry contract
     */
    function setValidationRegistry(address _validationRegistry) external onlyOwner {
        require(_validationRegistry != address(0), "Invalid validation registry");
        validationRegistry = IValidationRegistry(_validationRegistry);
    }

    /**
     * @notice Set the validator token ID from Identity Registry
     * @param _validatorTokenId The ERC-8004 token ID for this validator
     */
    function setValidatorTokenId(uint256 _validatorTokenId) external onlyOwner {
        require(_validatorTokenId > 0, "Invalid token ID");
        validatorTokenId = _validatorTokenId;
    }

    /**
     * @notice Verify and store a news classification proof
     * @param classificationId Unique ID for this classification
     * @param _pA Proof point A
     * @param _pB Proof point B
     * @param _pC Proof point C
     * @param _pubSignals Public signals [sentiment, confidence, featuresHash]
     * @return success True if verification succeeded
     */
    function verifyAndStore(
        bytes32 classificationId,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[3] calldata _pubSignals
    ) external returns (bool success) {
        // Check not already verified
        require(!isVerified[classificationId], "Already verified");

        // Validate public signals
        require(_pubSignals[0] <= 2, "Invalid sentiment"); // 0, 1, or 2
        require(_pubSignals[1] <= 100, "Invalid confidence"); // 0-100

        // Verify the Groth16 proof
        bool proofValid = verifyProof(_pA, _pB, _pC, _pubSignals);

        if (!proofValid) {
            emit VerificationFailed(classificationId, msg.sender, "Invalid proof");
            return false;
        }

        // Store verified classification
        bytes32 proofHash = keccak256(abi.encodePacked(_pA, _pB, _pC));

        verifiedClassifications[classificationId] = VerifiedClassification({
            sentiment: _pubSignals[0],
            confidence: _pubSignals[1],
            featuresHash: _pubSignals[2],
            timestamp: block.timestamp,
            verifier: msg.sender,
            proofHash: proofHash
        });

        isVerified[classificationId] = true;

        emit ClassificationVerified(
            classificationId,
            _pubSignals[0],
            _pubSignals[1],
            _pubSignals[2],
            msg.sender,
            block.timestamp
        );

        // Submit validation to ValidationRegistry (ERC-8004)
        if (address(validationRegistry) != address(0) && validatorTokenId > 0) {
            try validationRegistry.submitValidation(
                classificationId,
                true,  // approved - proof was valid
                proofHash,
                validatorTokenId
            ) {
                // Validation submitted successfully
            } catch {
                // Validation registry call failed, continue without it
            }
        }

        return true;
    }

    /**
     * @notice Check if a classification has been verified
     * @param classificationId The classification ID
     * @return verified True if verified
     */
    function isClassificationVerified(bytes32 classificationId)
        external
        view
        returns (bool verified)
    {
        return isVerified[classificationId];
    }

    /**
     * @notice Get verified classification details
     * @param classificationId The classification ID
     * @return classification The verified classification data
     */
    function getVerifiedClassification(bytes32 classificationId)
        external
        view
        returns (VerifiedClassification memory classification)
    {
        require(isVerified[classificationId], "Not verified");
        return verifiedClassifications[classificationId];
    }

    /**
     * @notice Verify a classification matches stored data
     * @param classificationId The classification ID
     * @param sentiment Expected sentiment
     * @param confidence Expected confidence
     * @return matches True if data matches
     */
    function verifyClassificationData(
        bytes32 classificationId,
        uint256 sentiment,
        uint256 confidence
    ) external view returns (bool matches) {
        if (!isVerified[classificationId]) {
            return false;
        }

        VerifiedClassification memory verified = verifiedClassifications[classificationId];

        return (verified.sentiment == sentiment && verified.confidence == confidence);
    }
}
