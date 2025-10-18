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
}
