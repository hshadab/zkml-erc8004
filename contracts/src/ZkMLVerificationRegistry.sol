// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC8004.sol";

/**
 * @title ZkMLVerificationRegistry
 * @notice Enhanced ERC-8004 implementation with dynamic reputation mechanics and X402 payment tracking
 * @dev Tracks agent registrations, capabilities, reputation, validation history, and micropayments
 *
 * Features:
 * - Agent registration with capability-based authorization
 * - Dynamic reputation system with streak bonuses and progressive penalties
 * - Validation history tracking for audit trails
 * - X402 payment integration for paid classifications
 * - Access control for validation recording
 *
 * Security:
 * - Only authorized validators can record validations
 * - Only authorized contracts can record payments
 * - Owner-controlled validator authorization
 *
 * @custom:security-contact security@example.com
 */
contract ZkMLVerificationRegistry is IERC8004 {
    // ============ Constants ============

    /// @notice Initial reputation score for newly registered agents
    uint256 public constant INITIAL_REPUTATION = 250;

    /// @notice Maximum reputation score achievable
    uint256 public constant MAX_REPUTATION = 1000;

    /// @notice Minimum reputation score (floor)
    uint256 public constant MIN_REPUTATION = 0;

    /// @notice Reputation reward for each correct prediction
    uint256 public constant CORRECT_PREDICTION_REWARD = 10;

    /// @notice Base penalty for incorrect predictions
    uint256 public constant INCORRECT_PREDICTION_PENALTY = 20;

    /// @notice Bonus reward for reaching streak threshold
    uint256 public constant STREAK_BONUS = 50;

    /// @notice Number of correct predictions needed for streak bonus
    uint256 public constant STREAK_THRESHOLD = 10;

    /// @notice Additional reputation bonus for paid classifications
    uint256 public constant PAID_CLASSIFICATION_BONUS = 5;

    /// @notice Consecutive failures threshold for warning
    uint256 public constant CONSECUTIVE_FAILURE_WARNING_THRESHOLD = 5;

    // ============ Structs ============

    /// @notice Capability-specific statistics for an agent
    /// @dev Tracks performance metrics and payment info for each capability
    struct AgentCapability {
        bool isActive;                    // Whether this capability is active
        uint256 reputationScore;          // Current reputation (0-1000)
        uint256 proofsSubmitted;          // Total proofs submitted
        uint256 registeredAt;             // Registration timestamp
        uint256 correctPredictions;       // Count of correct predictions
        uint256 incorrectPredictions;     // Count of incorrect predictions
        uint256 consecutiveFailures;      // Current failure streak
        uint256 paidClassifications;      // Count of paid classifications (X402)
        uint256 totalPaymentsReceived;    // Total USDC received (6 decimals)
    }

    /// @notice Complete agent record
    /// @dev Stores agent owner, token ID, and all capabilities
    struct Agent {
        address owner;                                    // Agent owner address
        uint256 tokenId;                                  // ERC-8004 token ID
        mapping(string => AgentCapability) capabilities;  // Capability name => stats
        string[] capabilityTypes;                         // List of capability names
    }

    /// @notice Record of a validation event
    /// @dev Immutable audit trail for each classification validation
    struct ValidationRecord {
        bytes32 classificationId;  // Classification being validated
        uint256 oracleTokenId;     // Oracle's token ID
        bool wasCorrect;           // Whether prediction was correct
        uint256 timestamp;         // Validation timestamp
        address validator;         // Validator address
        string reason;             // Validation reason/notes
    }

    /// @notice Record of an X402 payment
    /// @dev Tracks micropayments for classification requests
    struct PaymentRecord {
        bytes32 classificationId;  // Classification ID
        uint256 oracleTokenId;     // Oracle's token ID
        address payer;             // Payment sender
        uint256 amount;            // USDC amount (6 decimals)
        uint256 timestamp;         // Payment timestamp
        bytes32 paymentTxHash;     // Payment transaction hash
    }

    // ============ State Variables ============

    /// @notice Contract owner with admin privileges
    address public owner;

    /// @notice Next token ID to be assigned
    uint256 private _nextTokenId = 1;

    /// @notice Mapping of token ID to agent data
    mapping(uint256 => Agent) private _agents;

    /// @notice Mapping of owner address to their token IDs
    mapping(address => uint256[]) private _ownerToTokenIds;

    /// @notice Mapping of classification ID to validation history
    mapping(bytes32 => ValidationRecord[]) private _validationHistory;

    /// @notice Addresses authorized to submit proofs
    mapping(address => bool) public authorizedContracts;

    /// @notice Addresses authorized to record validations
    mapping(address => bool) public authorizedValidators;

    /// @notice Mapping of classification ID to payment record
    mapping(bytes32 => PaymentRecord) private _paymentRecords;

    // ============ Events ============

    /// @notice Emitted when a classification validation is recorded
    /// @param classificationId Classification being validated
    /// @param oracleTokenId Oracle's token ID
    /// @param wasCorrect Whether the prediction was correct
    /// @param validator Address that recorded the validation
    event ValidationRecorded(
        bytes32 indexed classificationId,
        uint256 indexed oracleTokenId,
        bool wasCorrect,
        address indexed validator
    );

    /// @notice Emitted when an agent reaches consecutive failure threshold
    /// @param tokenId Agent's token ID
    /// @param capabilityType Capability with failures
    /// @param consecutiveFailures Number of consecutive failures
    event ConsecutiveFailureWarning(
        uint256 indexed tokenId,
        string capabilityType,
        uint256 consecutiveFailures
    );

    /// @notice Emitted when a contract's authorization status changes
    /// @param contractAddress Address being authorized/deauthorized
    /// @param authorized New authorization status
    event ContractAuthorized(address indexed contractAddress, bool authorized);

    /// @notice Emitted when a validator's authorization status changes
    /// @param validator Address being authorized/deauthorized
    /// @param authorized New authorization status
    event ValidatorAuthorized(address indexed validator, bool authorized);

    /// @notice Emitted when an X402 payment is recorded
    /// @param classificationId Classification ID
    /// @param oracleTokenId Oracle's token ID
    /// @param payer Payment sender
    /// @param amount USDC amount paid (6 decimals)
    /// @param paymentTxHash Payment transaction hash
    event PaymentRecorded(
        bytes32 indexed classificationId,
        uint256 indexed oracleTokenId,
        address indexed payer,
        uint256 amount,
        bytes32 paymentTxHash
    );

    // ============ Modifiers ============

    /// @notice Restricts access to agent owner or authorized contracts
    /// @param tokenId Agent's token ID
    modifier onlyAgentOwner(uint256 tokenId) {
        require(
            _agents[tokenId].owner == msg.sender || authorizedContracts[msg.sender],
            "Registry: not agent owner or authorized"
        );
        _;
    }

    /// @notice Verifies that an agent exists
    /// @param tokenId Agent's token ID
    modifier agentExists(uint256 tokenId) {
        require(_agents[tokenId].owner != address(0), "Registry: agent does not exist");
        _;
    }

    /// @notice Restricts access to contract owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Registry: caller is not owner");
        _;
    }

    /// @notice Restricts access to authorized validators or owner
    modifier onlyAuthorizedValidator() {
        require(
            msg.sender == owner || authorizedValidators[msg.sender],
            "Registry: not authorized validator"
        );
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initializes the registry
     * @dev Sets deployer as owner and initial authorized validator
     */
    constructor() {
        owner = msg.sender;
        // Owner is automatically authorized as validator
        authorizedValidators[msg.sender] = true;
    }

    // ============ Authorization Functions ============

    /**
     * @notice Authorizes or deauthorizes a contract to submit proofs
     * @dev Only owner can modify contract authorizations
     * @param contractAddress Contract address to authorize/deauthorize
     * @param authorized True to authorize, false to revoke
     */
    function authorizeContract(address contractAddress, bool authorized) external onlyOwner {
        require(contractAddress != address(0), "Registry: invalid address");
        authorizedContracts[contractAddress] = authorized;
        emit ContractAuthorized(contractAddress, authorized);
    }

    /**
     * @notice Authorizes or deauthorizes a validator to record validations
     * @dev Only owner can modify validator authorizations
     *      This prevents unauthorized reputation manipulation
     * @param validator Validator address to authorize/deauthorize
     * @param authorized True to authorize, false to revoke
     */
    function authorizeValidator(address validator, bool authorized) external onlyOwner {
        require(validator != address(0), "Registry: invalid address");
        authorizedValidators[validator] = authorized;
        emit ValidatorAuthorized(validator, authorized);
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
     * @notice Records validation of a classification (manual or automatic)
     * @dev CRITICAL: Only authorized validators can record validations to prevent reputation manipulation
     * @param classificationId Unique classification identifier
     * @param oracleTokenId Oracle's ERC-8004 token ID
     * @param wasCorrect Whether the classification was correct
     * @param reason Validation reason or notes
     *
     * Security:
     * - Only authorized validators can call this function
     * - Owner is automatically authorized
     * - Prevents unauthorized reputation manipulation
     * - Creates immutable audit trail
     *
     * Effects:
     * - Adds validation record to history
     * - Updates oracle reputation based on correctness
     * - Emits ValidationRecorded event
     * - May emit ConsecutiveFailureWarning if threshold reached
     */
    function recordValidation(
        bytes32 classificationId,
        uint256 oracleTokenId,
        bool wasCorrect,
        string calldata reason
    ) external onlyAuthorizedValidator agentExists(oracleTokenId) {
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

            // Emit warning if consecutive failures reach threshold
            if (capability.consecutiveFailures >= CONSECUTIVE_FAILURE_WARNING_THRESHOLD) {
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
