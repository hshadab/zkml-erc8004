// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC8004.sol";

/**
 * @title ZkMLVerificationRegistry
 * @notice Enhanced ERC-8004 implementation with dynamic reputation mechanics
 * @dev Tracks agent registrations, capabilities, reputation, and validation history
 */
contract ZkMLVerificationRegistry is IERC8004 {
    struct AgentCapability {
        bool isActive;
        uint256 reputationScore;  // 0-1000
        uint256 proofsSubmitted;
        uint256 registeredAt;
        uint256 correctPredictions;
        uint256 incorrectPredictions;
        uint256 consecutiveFailures;
        uint256 paidClassifications;      // NEW: Count of paid classifications
        uint256 totalPaymentsReceived;    // NEW: Total USDC received (in wei, 6 decimals)
    }

    struct Agent {
        address owner;
        uint256 tokenId;
        mapping(string => AgentCapability) capabilities;
        string[] capabilityTypes;
    }

    struct ValidationRecord {
        bytes32 classificationId;
        uint256 oracleTokenId;
        bool wasCorrect;
        uint256 timestamp;
        address validator;
        string reason;
    }

    struct PaymentRecord {
        bytes32 classificationId;
        uint256 oracleTokenId;
        address payer;
        uint256 amount;          // USDC amount in wei (6 decimals)
        uint256 timestamp;
        bytes32 paymentTxHash;
    }

    // State variables
    address public owner;
    uint256 private _nextTokenId = 1;
    mapping(uint256 => Agent) private _agents;
    mapping(address => uint256[]) private _ownerToTokenIds;
    mapping(bytes32 => ValidationRecord[]) private _validationHistory;
    mapping(address => bool) public authorizedContracts;  // Contracts authorized to submit proofs
    mapping(bytes32 => PaymentRecord) private _paymentRecords;  // NEW: Track payments per classification

    // Constants
    uint256 public constant INITIAL_REPUTATION = 250;
    uint256 public constant MAX_REPUTATION = 1000;
    uint256 public constant MIN_REPUTATION = 0;

    // Reputation adjustments
    uint256 public constant CORRECT_PREDICTION_REWARD = 10;
    uint256 public constant INCORRECT_PREDICTION_PENALTY = 20;
    uint256 public constant STREAK_BONUS = 50;  // Every 10 correct predictions
    uint256 public constant STREAK_THRESHOLD = 10;
    uint256 public constant PAID_CLASSIFICATION_BONUS = 5;  // NEW: Bonus for paid classifications

    // Events
    event ValidationRecorded(
        bytes32 indexed classificationId,
        uint256 indexed oracleTokenId,
        bool wasCorrect,
        address indexed validator
    );

    event ConsecutiveFailureWarning(
        uint256 indexed tokenId,
        string capabilityType,
        uint256 consecutiveFailures
    );

    event ContractAuthorized(
        address indexed contractAddress,
        bool authorized
    );

    event PaymentRecorded(
        bytes32 indexed classificationId,
        uint256 indexed oracleTokenId,
        address indexed payer,
        uint256 amount,
        bytes32 paymentTxHash
    );

    // Modifiers
    modifier onlyAgentOwner(uint256 tokenId) {
        require(
            _agents[tokenId].owner == msg.sender || authorizedContracts[msg.sender],
            "Not agent owner or authorized"
        );
        _;
    }

    modifier agentExists(uint256 tokenId) {
        require(_agents[tokenId].owner != address(0), "Agent does not exist");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Authorize a contract to submit proofs on behalf of agents
     * @param contractAddress The contract address to authorize
     * @param authorized True to authorize, false to revoke
     */
    function authorizeContract(address contractAddress, bool authorized) external onlyOwner {
        require(contractAddress != address(0), "Invalid address");
        authorizedContracts[contractAddress] = authorized;
        emit ContractAuthorized(contractAddress, authorized);
    }

    /**
     * @notice Register a new agent with specified capability
     * @param capabilityType The type of capability (e.g., "news_classification")
     * @return tokenId The unique token ID assigned to this agent
     */
    function registerAgent(string calldata capabilityType)
        external
        override
        returns (uint256 tokenId)
    {
        tokenId = _nextTokenId++;

        Agent storage agent = _agents[tokenId];
        agent.owner = msg.sender;
        agent.tokenId = tokenId;

        // Initialize capability
        agent.capabilities[capabilityType] = AgentCapability({
            isActive: true,
            reputationScore: INITIAL_REPUTATION,
            proofsSubmitted: 0,
            registeredAt: block.timestamp,
            correctPredictions: 0,
            incorrectPredictions: 0,
            consecutiveFailures: 0,
            paidClassifications: 0,
            totalPaymentsReceived: 0
        });

        agent.capabilityTypes.push(capabilityType);
        _ownerToTokenIds[msg.sender].push(tokenId);

        emit AgentRegistered(tokenId, msg.sender, capabilityType);
        emit ReputationUpdated(tokenId, capabilityType, INITIAL_REPUTATION, "Initial registration");
    }

    /**
     * @notice Submit a verification proof for an agent's action
     * @param tokenId The agent's token ID
     * @param proofHash Hash of the verification proof
     */
    function submitProof(uint256 tokenId, bytes32 proofHash)
        external
        override
        onlyAgentOwner(tokenId)
        agentExists(tokenId)
    {
        // Find the capability type (assuming first one for now)
        string memory capabilityType = _agents[tokenId].capabilityTypes[0];
        _agents[tokenId].capabilities[capabilityType].proofsSubmitted++;

        emit ProofSubmitted(tokenId, proofHash, block.timestamp);
    }

    /**
     * @notice Record validation of a classification (manual or automatic)
     * @param classificationId The classification being validated
     * @param oracleTokenId The oracle's token ID
     * @param wasCorrect Whether the classification was correct
     * @param reason Reason for validation
     */
    function recordValidation(
        bytes32 classificationId,
        uint256 oracleTokenId,
        bool wasCorrect,
        string calldata reason
    ) external agentExists(oracleTokenId) {
        string memory capabilityType = "news_classification";

        // Record validation
        _validationHistory[classificationId].push(ValidationRecord({
            classificationId: classificationId,
            oracleTokenId: oracleTokenId,
            wasCorrect: wasCorrect,
            timestamp: block.timestamp,
            validator: msg.sender,
            reason: reason
        }));

        // Update reputation
        _updateReputationWithHistory(oracleTokenId, capabilityType, wasCorrect);

        emit ValidationRecorded(classificationId, oracleTokenId, wasCorrect, msg.sender);
    }

    /**
     * @notice Manual reputation update by agent owner
     * @param tokenId The agent's token ID
     * @param capabilityType The capability type
     * @param newScore The new reputation score
     * @param reason Reason for update
     */
    function updateReputationManual(
        uint256 tokenId,
        string calldata capabilityType,
        uint256 newScore,
        string calldata reason
    ) external onlyAgentOwner(tokenId) agentExists(tokenId) {
        require(newScore <= MAX_REPUTATION, "Score exceeds maximum");

        _agents[tokenId].capabilities[capabilityType].reputationScore = newScore;

        emit ReputationUpdated(tokenId, capabilityType, newScore, reason);
    }

    /**
     * @notice Increase reputation (called by validated systems)
     * @param tokenId The agent's token ID
     * @param amount Amount to increase
     */
    function increaseReputation(uint256 tokenId, uint256 amount) external agentExists(tokenId) {
        string memory capabilityType = "news_classification";
        AgentCapability storage capability = _agents[tokenId].capabilities[capabilityType];

        uint256 newScore = capability.reputationScore + amount;
        if (newScore > MAX_REPUTATION) {
            newScore = MAX_REPUTATION;
        }

        capability.reputationScore = newScore;
        emit ReputationUpdated(tokenId, capabilityType, newScore, "Reputation increased");
    }

    /**
     * @notice Decrease reputation (called by validated systems)
     * @param tokenId The agent's token ID
     * @param amount Amount to decrease
     */
    function decreaseReputation(uint256 tokenId, uint256 amount) external agentExists(tokenId) {
        string memory capabilityType = "news_classification";
        AgentCapability storage capability = _agents[tokenId].capabilities[capabilityType];

        uint256 newScore;
        if (capability.reputationScore > amount) {
            newScore = capability.reputationScore - amount;
        } else {
            newScore = MIN_REPUTATION;
        }

        capability.reputationScore = newScore;
        emit ReputationUpdated(tokenId, capabilityType, newScore, "Reputation decreased");
    }

    /**
     * @notice Internal function to update reputation with history tracking
     */
    function _updateReputationWithHistory(
        uint256 tokenId,
        string memory capabilityType,
        bool wasCorrect
    ) internal {
        AgentCapability storage capability = _agents[tokenId].capabilities[capabilityType];

        if (wasCorrect) {
            capability.correctPredictions++;
            capability.consecutiveFailures = 0;

            // Check for streak bonus
            if (capability.correctPredictions % STREAK_THRESHOLD == 0) {
                uint256 newScore = capability.reputationScore + STREAK_BONUS;
                if (newScore > MAX_REPUTATION) newScore = MAX_REPUTATION;
                capability.reputationScore = newScore;

                emit ReputationUpdated(
                    tokenId,
                    capabilityType,
                    newScore,
                    "Streak bonus"
                );
            } else {
                // Base reward for correct prediction
                uint256 reward = CORRECT_PREDICTION_REWARD;

                // Bonus for paid classifications (shows real market demand)
                if (capability.paidClassifications > 0) {
                    reward += PAID_CLASSIFICATION_BONUS;
                }

                uint256 newScore = capability.reputationScore + reward;
                if (newScore > MAX_REPUTATION) newScore = MAX_REPUTATION;
                capability.reputationScore = newScore;

                emit ReputationUpdated(
                    tokenId,
                    capabilityType,
                    newScore,
                    "Correct prediction"
                );
            }
        } else {
            capability.incorrectPredictions++;
            capability.consecutiveFailures++;

            // Progressive penalty
            uint256 penalty = INCORRECT_PREDICTION_PENALTY * capability.consecutiveFailures;

            uint256 newScore;
            if (capability.reputationScore > penalty) {
                newScore = capability.reputationScore - penalty;
            } else {
                newScore = MIN_REPUTATION;
            }

            capability.reputationScore = newScore;

            emit ReputationUpdated(
                tokenId,
                capabilityType,
                newScore,
                "Incorrect prediction"
            );

            // Emit warning for consecutive failures
            if (capability.consecutiveFailures >= 5) {
                emit ConsecutiveFailureWarning(
                    tokenId,
                    capabilityType,
                    capability.consecutiveFailures
                );
            }
        }
    }

    /**
     * @notice Get reputation score for an agent's capability
     * @param tokenId The agent's token ID
     * @param capabilityType The capability type to check
     * @return score The reputation score (0-1000)
     */
    function getReputationScore(
        uint256 tokenId,
        string calldata capabilityType
    ) external view override agentExists(tokenId) returns (uint256 score) {
        return _agents[tokenId].capabilities[capabilityType].reputationScore;
    }

    /**
     * @notice Check if an agent is authorized for a specific capability
     * @param tokenId The agent's token ID
     * @param capabilityType The capability type to check
     * @return authorized True if agent has the capability
     */
    function isAuthorized(
        uint256 tokenId,
        string calldata capabilityType
    ) external view override agentExists(tokenId) returns (bool authorized) {
        return _agents[tokenId].capabilities[capabilityType].isActive;
    }

    /**
     * @notice Record a payment for a classification (X402 integration)
     * @param classificationId The classification ID
     * @param oracleTokenId The oracle's token ID
     * @param payer The address that paid
     * @param amount The amount paid in USDC (6 decimals)
     * @param paymentTxHash The payment transaction hash
     */
    function recordPayment(
        bytes32 classificationId,
        uint256 oracleTokenId,
        address payer,
        uint256 amount,
        bytes32 paymentTxHash
    ) external agentExists(oracleTokenId) {
        require(authorizedContracts[msg.sender], "Not authorized to record payments");
        require(_paymentRecords[classificationId].timestamp == 0, "Payment already recorded");

        string memory capabilityType = "news_classification";
        AgentCapability storage capability = _agents[oracleTokenId].capabilities[capabilityType];

        // Update payment tracking
        capability.paidClassifications++;
        capability.totalPaymentsReceived += amount;

        // Store payment record
        _paymentRecords[classificationId] = PaymentRecord({
            classificationId: classificationId,
            oracleTokenId: oracleTokenId,
            payer: payer,
            amount: amount,
            timestamp: block.timestamp,
            paymentTxHash: paymentTxHash
        });

        emit PaymentRecorded(classificationId, oracleTokenId, payer, amount, paymentTxHash);
    }

    /**
     * @notice Get payment information for a classification
     * @param classificationId The classification ID
     * @return payer The address that paid
     * @return amount The amount paid
     * @return timestamp When the payment was recorded
     * @return paymentTxHash The payment transaction hash
     */
    function getPaymentInfo(bytes32 classificationId) external view returns (
        address payer,
        uint256 amount,
        uint256 timestamp,
        bytes32 paymentTxHash
    ) {
        PaymentRecord storage record = _paymentRecords[classificationId];
        return (record.payer, record.amount, record.timestamp, record.paymentTxHash);
    }

    /**
     * @notice Check if a classification was paid for
     * @param classificationId The classification ID
     * @return isPaid True if payment was recorded
     */
    function isClassificationPaid(bytes32 classificationId) external view returns (bool isPaid) {
        return _paymentRecords[classificationId].timestamp > 0;
    }

    /**
     * @notice Get payment statistics for an oracle
     * @param tokenId The oracle's token ID
     * @param capabilityType The capability type
     * @return paidCount Number of paid classifications
     * @return totalReceived Total USDC received (6 decimals)
     */
    function getPaymentStats(
        uint256 tokenId,
        string calldata capabilityType
    ) external view agentExists(tokenId) returns (
        uint256 paidCount,
        uint256 totalReceived
    ) {
        AgentCapability storage capability = _agents[tokenId].capabilities[capabilityType];
        return (capability.paidClassifications, capability.totalPaymentsReceived);
    }

    /**
     * @notice Get validation history for a classification
     * @param classificationId The classification ID
     * @return records Array of validation records
     */
    function getValidationHistory(bytes32 classificationId)
        external
        view
        returns (ValidationRecord[] memory records)
    {
        return _validationHistory[classificationId];
    }

    /**
     * @notice Get detailed capability statistics
     * @param tokenId The agent's token ID
     * @param capabilityType The capability type
     * @return reputationScore Current reputation score (0-1000)
     * @return correctPredictions Total correct predictions
     * @return incorrectPredictions Total incorrect predictions
     * @return consecutiveFailures Current streak of failures
     * @return totalPredictions Total predictions made
     * @return accuracyPercent Accuracy percentage (0-100)
     */
    function getCapabilityStats(
        uint256 tokenId,
        string calldata capabilityType
    )
        external
        view
        agentExists(tokenId)
        returns (
            uint256 reputationScore,
            uint256 correctPredictions,
            uint256 incorrectPredictions,
            uint256 consecutiveFailures,
            uint256 totalPredictions,
            uint256 accuracyPercent
        )
    {
        AgentCapability storage capability = _agents[tokenId].capabilities[capabilityType];

        reputationScore = capability.reputationScore;
        correctPredictions = capability.correctPredictions;
        incorrectPredictions = capability.incorrectPredictions;
        consecutiveFailures = capability.consecutiveFailures;
        totalPredictions = correctPredictions + incorrectPredictions;

        if (totalPredictions > 0) {
            accuracyPercent = (correctPredictions * 100) / totalPredictions;
        } else {
            accuracyPercent = 0;
        }
    }

    /**
     * @notice Get all token IDs owned by an address
     * @param tokenOwner The owner address
     * @return tokenIds Array of token IDs
     */
    function getOwnedTokenIds(address tokenOwner) external view returns (uint256[] memory tokenIds) {
        return _ownerToTokenIds[tokenOwner];
    }

    /**
     * @notice Get agent details
     * @param tokenId The agent's token ID
     * @return agentOwner The agent owner
     * @return capabilityTypes Array of capability types
     */
    function getAgentInfo(uint256 tokenId)
        external
        view
        agentExists(tokenId)
        returns (address agentOwner, string[] memory capabilityTypes)
    {
        Agent storage agent = _agents[tokenId];
        return (agent.owner, agent.capabilityTypes);
    }

    /**
     * @notice Get the owner of an agent token (ERC-721 compatible)
     * @param tokenId The token ID to query
     * @return The address owning the token
     */
    function ownerOf(uint256 tokenId)
        external
        view
        agentExists(tokenId)
        returns (address)
    {
        return _agents[tokenId].owner;
    }
}
