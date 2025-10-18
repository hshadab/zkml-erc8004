// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC8004
 * @notice Interface for ERC-8004 Non-Fungible Agent Capability Standard
 * @dev Defines the standard for agent capability verification and reputation tracking
 */
interface IERC8004 {
    /// @notice Emitted when a new agent is registered
    event AgentRegistered(
        uint256 indexed tokenId,
        address indexed owner,
        string capabilityType
    );

    /// @notice Emitted when agent reputation is updated
    event ReputationUpdated(
        uint256 indexed tokenId,
        string capabilityType,
        uint256 newScore,
        string reason
    );

    /// @notice Emitted when a verification proof is submitted
    event ProofSubmitted(
        uint256 indexed tokenId,
        bytes32 proofHash,
        uint256 timestamp
    );

    /**
     * @notice Register a new agent with specified capability
     * @param capabilityType The type of capability (e.g., "news_classification")
     * @return tokenId The unique token ID assigned to this agent
     */
    function registerAgent(string calldata capabilityType) external returns (uint256 tokenId);

    /**
     * @notice Get reputation score for an agent's capability
     * @param tokenId The agent's token ID
     * @param capabilityType The capability type to check
     * @return score The reputation score (0-1000)
     */
    function getReputationScore(
        uint256 tokenId,
        string calldata capabilityType
    ) external view returns (uint256 score);

    /**
     * @notice Submit a verification proof for an agent's action
     * @param tokenId The agent's token ID
     * @param proofHash Hash of the verification proof
     */
    function submitProof(uint256 tokenId, bytes32 proofHash) external;

    /**
     * @notice Check if an agent is authorized for a specific capability
     * @param tokenId The agent's token ID
     * @param capabilityType The capability type to check
     * @return authorized True if agent has the capability
     */
    function isAuthorized(
        uint256 tokenId,
        string calldata capabilityType
    ) external view returns (bool authorized);
}
