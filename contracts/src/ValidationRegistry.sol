// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IZkMLVerificationRegistry.sol";

/**
 * @title ValidationRegistry
 * @notice ERC-8004 Validation Registry for tracking zkML proof validation requests and responses
 * @dev Implements the validation lifecycle defined in EIP-8004
 */
contract ValidationRegistry {
    // Link to Identity Registry (ERC-8004 requirement)
    IZkMLVerificationRegistry public immutable identityRegistry;

    // Validation request status
    enum ValidationStatus { Pending, Approved, Rejected }

    // Validation request structure
    struct ValidationRequest {
        uint256 agentTokenId;        // Oracle's NFT token ID
        bytes32 workId;              // Classification ID (unique identifier for the work)
        bytes32 workHash;            // Hash of the classification data
        uint256 requestTime;
        ValidationStatus status;
        uint256 responseCount;       // Number of validator responses
    }

    // Validator response structure
    struct ValidationResponse {
        uint256 validatorTokenId;    // Validator's NFT token ID
        address validatorAddress;    // Validator contract address
        bool approved;               // True if proof verified successfully
        bytes32 proofHash;           // zkML proof hash
        uint256 responseTime;
    }

    // Storage mappings
    mapping(bytes32 => ValidationRequest) public validationRequests;
    mapping(bytes32 => ValidationResponse[]) public validationResponses;
    mapping(bytes32 => mapping(uint256 => bool)) public hasValidatorResponded; // workId => validatorTokenId => responded

    // Statistics
    mapping(uint256 => uint256) public agentValidationCount;      // tokenId => total validations requested
    mapping(uint256 => uint256) public validatorResponseCount;    // tokenId => total responses submitted
    mapping(uint256 => uint256) public validatorApprovalCount;    // tokenId => total approvals given

    // Events per ERC-8004 spec
    event ValidationRequested(
        bytes32 indexed workId,
        uint256 indexed agentTokenId,
        bytes32 workHash,
        uint256 timestamp
    );

    event ValidationSubmitted(
        bytes32 indexed workId,
        uint256 indexed validatorTokenId,
        bool approved,
        bytes32 proofHash,
        uint256 timestamp
    );

    event ValidationCompleted(
        bytes32 indexed workId,
        ValidationStatus finalStatus,
        uint256 responseCount
    );

    /**
     * @notice Constructor links to the Identity Registry per ERC-8004
     * @param _identityRegistry Address of the ZkMLVerificationRegistry (Identity Registry)
     */
    constructor(address _identityRegistry) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = IZkMLVerificationRegistry(_identityRegistry);
    }

    /**
     * @notice Get the Identity Registry address (ERC-8004 requirement)
     * @return Address of the identity registry
     */
    function getIdentityRegistry() external view returns (address) {
        return address(identityRegistry);
    }

    /**
     * @notice Request validation for a piece of work (called by Oracle)
     * @param workId Unique identifier for the work (classification ID)
     * @param workHash Hash of the work data
     * @param agentTokenId NFT token ID of the requesting agent
     */
    function requestValidation(
        bytes32 workId,
        bytes32 workHash,
        uint256 agentTokenId
    ) external {
        require(workId != bytes32(0), "Invalid work ID");
        require(workHash != bytes32(0), "Invalid work hash");
        require(validationRequests[workId].workId == bytes32(0), "Validation already requested");

        // Verify agent owns the token ID OR caller is authorized contract
        address tokenOwner = identityRegistry.ownerOf(agentTokenId);
        bool isAuthorized = identityRegistry.authorizedContracts(msg.sender);
        require(
            tokenOwner == msg.sender || isAuthorized,
            "Not token owner or authorized"
        );

        // Create validation request
        validationRequests[workId] = ValidationRequest({
            agentTokenId: agentTokenId,
            workId: workId,
            workHash: workHash,
            requestTime: block.timestamp,
            status: ValidationStatus.Pending,
            responseCount: 0
        });

        // Update statistics
        agentValidationCount[agentTokenId]++;

        emit ValidationRequested(workId, agentTokenId, workHash, block.timestamp);
    }

    /**
     * @notice Submit validation response (called by Validator)
     * @param workId Work identifier to validate
     * @param approved Whether the validation passed
     * @param proofHash Hash of the zkML proof
     * @param validatorTokenId NFT token ID of the validator
     */
    function submitValidation(
        bytes32 workId,
        bool approved,
        bytes32 proofHash,
        uint256 validatorTokenId
    ) external {
        ValidationRequest storage request = validationRequests[workId];
        require(request.workId != bytes32(0), "Validation request not found");
        require(request.status == ValidationStatus.Pending, "Validation already completed");

        // Verify validator owns the token ID
        require(identityRegistry.ownerOf(validatorTokenId) == msg.sender, "Not token owner");

        // Prevent duplicate responses from same validator
        require(!hasValidatorResponded[workId][validatorTokenId], "Already responded");
        hasValidatorResponded[workId][validatorTokenId] = true;

        // Store response
        validationResponses[workId].push(ValidationResponse({
            validatorTokenId: validatorTokenId,
            validatorAddress: msg.sender,
            approved: approved,
            proofHash: proofHash,
            responseTime: block.timestamp
        }));

        // Update request
        request.responseCount++;

        // Update statistics
        validatorResponseCount[validatorTokenId]++;
        if (approved) {
            validatorApprovalCount[validatorTokenId]++;
        }

        // Update status (first response determines outcome for now - could be expanded to multi-validator consensus)
        if (request.responseCount == 1) {
            request.status = approved ? ValidationStatus.Approved : ValidationStatus.Rejected;

            // Update Identity Registry reputation based on validation outcome
            _updateReputation(request.agentTokenId, validatorTokenId, approved);

            emit ValidationCompleted(workId, request.status, request.responseCount);
        }

        emit ValidationSubmitted(workId, validatorTokenId, approved, proofHash, block.timestamp);
    }

    /**
     * @notice Update reputation scores in Identity Registry based on validation outcome
     * @param agentTokenId Oracle's token ID
     * @param validatorTokenId Validator's token ID
     * @param approved Whether validation was approved
     */
    function _updateReputation(
        uint256 agentTokenId,
        uint256 validatorTokenId,
        bool approved
    ) private {
        // Update oracle's reputation based on validation outcome
        // +10 reputation for validated work, -5 for rejected work
        if (approved) {
            try identityRegistry.increaseReputation(agentTokenId, 10) {
                // Reputation increased successfully
            } catch {
                // If reputation update fails, skip (maintains backwards compatibility)
            }
        } else {
            try identityRegistry.decreaseReputation(agentTokenId, 5) {
                // Reputation decreased successfully
            } catch {
                // If reputation update fails, skip
            }
        }

        // Also credit the validator for performing validation work
        try identityRegistry.increaseReputation(validatorTokenId, 1) {
            // Validator credited successfully
        } catch {
            // If reputation update fails, skip
        }
    }

    /**
     * @notice Get validation request details
     * @param workId Work identifier
     * @return request The validation request
     */
    function getValidationRequest(bytes32 workId)
        external
        view
        returns (ValidationRequest memory)
    {
        return validationRequests[workId];
    }

    /**
     * @notice Get all responses for a validation request
     * @param workId Work identifier
     * @return responses Array of validation responses
     */
    function getValidationResponses(bytes32 workId)
        external
        view
        returns (ValidationResponse[] memory)
    {
        return validationResponses[workId];
    }

    /**
     * @notice Get validation statistics for an agent
     * @param tokenId Agent's NFT token ID
     * @return totalRequests Total validation requests made
     * @return approvedRequests Number of approved validations
     * @return rejectedRequests Number of rejected validations
     */
    function getAgentStats(uint256 tokenId)
        external
        view
        returns (
            uint256 totalRequests,
            uint256 approvedRequests,
            uint256 rejectedRequests
        )
    {
        totalRequests = agentValidationCount[tokenId];
        // Note: Individual request status tracking would require iteration
        // For now, returning total count. Can be enhanced with more storage.
        approvedRequests = 0;
        rejectedRequests = 0;
    }

    /**
     * @notice Get validation statistics for a validator
     * @param tokenId Validator's NFT token ID
     * @return totalResponses Total validations performed
     * @return totalApprovals Total approvals given
     * @return approvalRate Approval rate (percentage * 100)
     */
    function getValidatorStats(uint256 tokenId)
        external
        view
        returns (
            uint256 totalResponses,
            uint256 totalApprovals,
            uint256 approvalRate
        )
    {
        totalResponses = validatorResponseCount[tokenId];
        totalApprovals = validatorApprovalCount[tokenId];

        if (totalResponses > 0) {
            approvalRate = (totalApprovals * 10000) / totalResponses; // Basis points (e.g., 7500 = 75%)
        } else {
            approvalRate = 0;
        }
    }

    /**
     * @notice Check if a validation request exists and its status
     * @param workId Work identifier
     * @return exists Whether the request exists
     * @return status Current validation status
     */
    function getValidationStatus(bytes32 workId)
        external
        view
        returns (bool exists, ValidationStatus status)
    {
        ValidationRequest memory request = validationRequests[workId];
        exists = request.workId != bytes32(0);
        status = request.status;
    }
}
