// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC8004.sol";

/**
 * @title IZkMLVerificationRegistry
 * @notice Extended interface for ZkMLVerificationRegistry with reputation management
 * @dev Includes additional functions for dynamic reputation updates
 */
interface IZkMLVerificationRegistry is IERC8004 {
    /**
     * @notice Increase reputation (called by validated systems)
     * @param tokenId The agent's token ID
     * @param amount Amount to increase
     */
    function increaseReputation(uint256 tokenId, uint256 amount) external;

    /**
     * @notice Decrease reputation (called by validated systems)
     * @param tokenId The agent's token ID
     * @param amount Amount to decrease
     */
    function decreaseReputation(uint256 tokenId, uint256 amount) external;

    /**
     * @notice Get the owner of a token (from ERC721)
     * @param tokenId The token ID to query
     * @return The address owning the token
     */
    function ownerOf(uint256 tokenId) external view returns (address);

    /**
     * @notice Check if a contract is authorized to act on behalf of agents
     * @param contractAddress The contract address to check
     * @return True if authorized, false otherwise
     */
    function authorizedContracts(address contractAddress) external view returns (bool);
}
