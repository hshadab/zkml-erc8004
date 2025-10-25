import { ethers } from 'ethers';
import { logger } from './logger.js';
import { config } from './config.js';

/**
 * X402-Style Payment Service for zkML Classification
 *
 * Implements a simple pay-per-use model for zkML news classification:
 * - Users pay $0.25 in USDC on Base Mainnet
 * - Service verifies payment on-chain
 * - Returns classification + zkML proof
 *
 * Inspired by X402 (https://x402.org/) - HTTP 402 for crypto payments
 */
export class X402Service {
  constructor() {
    this.provider = null;
    this.recipientAddress = null;
    this.registryContract = null;
    this.oracleTokenId = null;
    this.usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
    this.basePriceUsd = '0.25'; // Base price $0.25
    this.priceUsd = this.basePriceUsd; // Current dynamic price
    this.minimumPayment = ethers.parseUnits(this.basePriceUsd, 6); // USDC has 6 decimals
    this.usedPayments = new Map(); // Track used payments: txHash -> requestId
    this.pendingRequests = new Map(); // Track pending requests: requestId -> timestamp
    this.reputationTier = 'standard'; // Current pricing tier
  }

  /**
   * Initialize the payment verification service
   */
  async initialize() {
    try {
      logger.info('Initializing X402 Payment Service with dynamic pricing...');

      // Connect to Base Mainnet
      this.provider = new ethers.JsonRpcProvider(
        config.baseMainnetRpcUrl || process.env.BASE_MAINNET_RPC_URL
      );

      // Set recipient address (oracle wallet receives payments)
      const wallet = new ethers.Wallet(config.oraclePrivateKey, this.provider);
      this.recipientAddress = wallet.address;

      // Connect to registry contract for reputation-based pricing
      if (config.registryAddress) {
        const registryAbi = [
          'function getReputationScore(uint256 tokenId, string calldata capabilityType) external view returns (uint256)',
          'function getPaymentStats(uint256 tokenId, string calldata capabilityType) external view returns (uint256 paidCount, uint256 totalReceived)'
        ];
        this.registryContract = new ethers.Contract(
          config.registryAddress,
          registryAbi,
          this.provider
        );
      }

      // Get oracle token ID from config or environment
      this.oracleTokenId = config.oracleTokenId || process.env.ORACLE_TOKEN_ID || 1;

      // Update pricing based on current reputation
      await this.updateDynamicPricing();

      logger.info(`Payment recipient: ${this.recipientAddress}`);
      logger.info(`Oracle Token ID: ${this.oracleTokenId}`);
      logger.info(`Reputation tier: ${this.reputationTier}`);
      logger.info(`Service price: $${this.priceUsd} USDC`);
      logger.info('X402 Payment Service ready with dynamic pricing\n');

      return true;
    } catch (error) {
      logger.error('Failed to initialize X402 service:', error);
      return false;
    }
  }

  /**
   * Generate a unique request ID for idempotency
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Create a new payment request and return payment instructions
   *
   * @param {string} headline - The headline to be classified
   * @returns {Object} Payment request with instructions
   */
  createPaymentRequest(headline) {
    const requestId = this.generateRequestId();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

    this.pendingRequests.set(requestId, {
      headline,
      createdAt: Date.now(),
      expiresAt
    });

    // Clean up expired requests (simple cleanup)
    this.cleanupExpiredRequests();

    return {
      requestId,
      expiresAt: new Date(expiresAt).toISOString(),
      paymentInstructions: this.getPaymentInstructions(requestId)
    };
  }

  /**
   * Get detailed payment instructions for autonomous agents
   *
   * @param {string} requestId - Request ID for this payment
   * @returns {Object} Complete payment instructions
   */
  getPaymentInstructions(requestId) {
    // ERC20 transfer function signature
    const transferFunction = 'transfer(address,uint256)';
    const transferSelector = '0xa9059cbb'; // First 4 bytes of keccak256('transfer(address,uint256)')

    // Encode the transfer calldata
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedParams = abiCoder.encode(
      ['address', 'uint256'],
      [this.recipientAddress, this.minimumPayment]
    );

    const calldata = transferSelector + encodedParams.slice(2);

    return {
      method: 'erc20-transfer',
      protocol: 'x402',
      network: {
        name: 'Base Mainnet',
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org'
      },
      token: {
        address: this.usdcAddress,
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin'
      },
      payment: {
        recipient: this.recipientAddress,
        amount: this.minimumPayment.toString(),
        amountFormatted: `${this.priceUsd} USDC`
      },
      transaction: {
        to: this.usdcAddress,
        data: calldata,
        value: '0',
        gasLimit: '65000' // Typical ERC20 transfer gas limit
      },
      instructions: {
        function: transferFunction,
        params: {
          to: this.recipientAddress,
          amount: this.minimumPayment.toString()
        }
      },
      requestId: requestId,
      note: 'After broadcasting the transaction, include the tx hash in your API request'
    };
  }

  /**
   * Clean up expired pending requests
   */
  cleanupExpiredRequests() {
    const now = Date.now();
    for (const [requestId, request] of this.pendingRequests.entries()) {
      if (request.expiresAt < now) {
        this.pendingRequests.delete(requestId);
      }
    }

    // Also clean up old used payments (older than 24 hours)
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    for (const [txHash, data] of this.usedPayments.entries()) {
      if (data.timestamp < oneDayAgo) {
        this.usedPayments.delete(txHash);
      }
    }
  }

  /**
   * Verify payment transaction on Base Mainnet
   *
   * @param {string} txHash - Transaction hash to verify
   * @param {string} requestId - Optional request ID for idempotency
   * @returns {Object} Verification result
   */
  async verifyPayment(txHash, requestId = null) {
    try {
      logger.info(`Verifying USDC payment: ${txHash}${requestId ? ` for request ${requestId}` : ''}`);

      // Check if this payment was already used
      if (this.usedPayments.has(txHash)) {
        const existingRequest = this.usedPayments.get(txHash);
        return {
          valid: false,
          error: `Payment already used for request ${existingRequest.requestId}`,
          code: 'PAYMENT_ALREADY_USED'
        };
      }

      // If request ID provided, verify it exists and hasn't expired
      if (requestId) {
        const request = this.pendingRequests.get(requestId);
        if (!request) {
          return {
            valid: false,
            error: 'Invalid or expired request ID',
            code: 'INVALID_REQUEST_ID'
          };
        }
        if (request.expiresAt < Date.now()) {
          this.pendingRequests.delete(requestId);
          return {
            valid: false,
            error: 'Request expired. Please create a new payment request',
            code: 'REQUEST_EXPIRED'
          };
        }
      }

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return {
          valid: false,
          error: 'Transaction not found or not confirmed yet',
          code: 'TX_NOT_FOUND'
        };
      }

      if (receipt.status === 0) {
        return {
          valid: false,
          error: 'Transaction failed',
          code: 'TX_FAILED'
        };
      }

      // Parse USDC Transfer event
      const usdcInterface = new ethers.Interface([
        'event Transfer(address indexed from, address indexed to, uint256 value)'
      ]);

      let transferFound = false;
      let transferAmount = 0n;
      let senderAddress = '';

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.usdcAddress.toLowerCase()) {
          try {
            const parsedLog = usdcInterface.parseLog(log);
            if (parsedLog.name === 'Transfer' &&
                parsedLog.args.to.toLowerCase() === this.recipientAddress.toLowerCase()) {
              transferFound = true;
              transferAmount = parsedLog.args.value;
              senderAddress = parsedLog.args.from;
              break;
            }
          } catch (e) {
            // Not a Transfer event, continue
          }
        }
      }

      if (!transferFound) {
        return {
          valid: false,
          error: `No USDC transfer to ${this.recipientAddress} found in transaction`,
          code: 'INVALID_RECIPIENT'
        };
      }

      // Verify amount
      if (transferAmount < this.minimumPayment) {
        return {
          valid: false,
          error: `Insufficient payment. Minimum: $${this.priceUsd} USDC, received: $${ethers.formatUnits(transferAmount, 6)} USDC`,
          code: 'INSUFFICIENT_PAYMENT'
        };
      }

      // Check if payment is recent (within last 24 hours)
      const block = await this.provider.getBlock(receipt.blockNumber);
      const now = Math.floor(Date.now() / 1000);
      const paymentAge = now - block.timestamp;

      if (paymentAge > 24 * 60 * 60) {
        return {
          valid: false,
          error: 'Payment too old (must be within 24 hours)',
          code: 'PAYMENT_EXPIRED'
        };
      }

      logger.info(`Payment verified: $${ethers.formatUnits(transferAmount, 6)} USDC from ${senderAddress}`);

      // Mark payment as used to prevent reuse
      this.usedPayments.set(txHash, {
        requestId: requestId || 'legacy',
        timestamp: Date.now()
      });

      // Remove from pending requests if request ID was provided
      if (requestId) {
        this.pendingRequests.delete(requestId);
      }

      return {
        valid: true,
        txHash: txHash,
        from: senderAddress,
        amount: ethers.formatUnits(transferAmount, 6),
        blockNumber: receipt.blockNumber,
        timestamp: block.timestamp
      };

    } catch (error) {
      logger.error('Payment verification failed:', error);
      return {
        valid: false,
        error: error.message,
        code: 'VERIFICATION_ERROR'
      };
    }
  }

  /**
   * Update dynamic pricing based on oracle reputation (ERC-8004 integration)
   */
  async updateDynamicPricing() {
    try {
      if (!this.registryContract || !this.oracleTokenId) {
        logger.info('Registry contract not available, using base pricing');
        return;
      }

      // Get current reputation score
      const reputation = await this.registryContract.getReputationScore(
        this.oracleTokenId,
        'news_classification'
      );
      const repScore = Number(reputation);

      // Get payment statistics
      let paidCount = 0;
      let totalReceived = 0;
      try {
        const [paid, received] = await this.registryContract.getPaymentStats(
          this.oracleTokenId,
          'news_classification'
        );
        paidCount = Number(paid);
        totalReceived = Number(received);
      } catch (e) {
        // Payment stats might not be available yet
      }

      // Calculate dynamic pricing based on reputation tiers
      let price = this.basePriceUsd;
      let tier = 'standard';

      if (repScore >= 900) {
        // Premium oracle: 40% discount
        price = '0.15';
        tier = 'premium';
      } else if (repScore >= 700) {
        // Proven oracle: 20% discount
        price = '0.20';
        tier = 'proven';
      } else if (repScore >= 500) {
        // Standard oracle: base price
        price = '0.25';
        tier = 'standard';
      } else if (repScore >= 300) {
        // Developing oracle: 60% markup
        price = '0.40';
        tier = 'developing';
      } else {
        // Unproven oracle: 300% markup
        price = '1.00';
        tier = 'unproven';
      }

      this.priceUsd = price;
      this.minimumPayment = ethers.parseUnits(price, 6);
      this.reputationTier = tier;

      logger.info(`Dynamic pricing updated: Reputation=${repScore}, Tier=${tier}, Price=$${price}`);
      if (paidCount > 0) {
        logger.info(`Payment history: ${paidCount} paid classifications, $${ethers.formatUnits(totalReceived, 6)} total USDC`);
      }
    } catch (error) {
      logger.error('Failed to update dynamic pricing:', error);
      // Fall back to base pricing on error
      this.priceUsd = this.basePriceUsd;
      this.minimumPayment = ethers.parseUnits(this.basePriceUsd, 6);
    }
  }

  /**
   * Get service pricing information
   */
  getPricing() {
    return {
      service: 'zkML News Classification',
      price: `$${this.priceUsd}`,
      currency: 'USDC',
      usdcAddress: this.usdcAddress,
      description: 'Get sentiment classification with zero-knowledge proof for any news headline',
      recipient: this.recipientAddress,
      network: 'Base Mainnet (Chain ID: 8453)',
      reputationTier: this.reputationTier, // NEW: Show current tier
      oracleTokenId: this.oracleTokenId,   // NEW: Show oracle identity
      features: [
        'JOLT-Atlas zkML inference',
        'Groth16 proof generation',
        'On-chain verifiable results',
        'Instant delivery',
        'Reputation-based dynamic pricing' // NEW
      ]
    };
  }

  /**
   * Generate HTTP 402 response for unpaid requests
   */
  getPaymentRequiredResponse() {
    return {
      status: 402,
      message: 'Payment Required',
      payment: this.getPricing()
    };
  }
}
