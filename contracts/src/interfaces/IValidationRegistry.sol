// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IValidationRegistry
 * @notice Interface for ERC-8004 Validation Registry
 * @dev Interface for requesting and submitting validations
 */
interface IValidationRegistry {
    /**
     * @notice Request validation for a piece of work
     * @param workId Unique identifier for the work (classification ID)
     * @param workHash Hash of the work data
     * @param agentTokenId NFT token ID of the requesting agent
     */
    function requestValidation(
        bytes32 workId,
        bytes32 workHash,
        uint256 agentTokenId
    ) external;

    /**
     * @notice Submit validation response for a work item
     * @param workId Unique identifier for the work (classification ID)
     * @param approved Whether the validation is approved or rejected
     * @param proofHash Hash of the validation proof
     * @param validatorTokenId NFT token ID of the validator submitting the validation
     */
    function submitValidation(
        bytes32 workId,
        bool approved,
        bytes32 proofHash,
        uint256 validatorTokenId
    ) external;
}
