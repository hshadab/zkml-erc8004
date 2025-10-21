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
    this.usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
    this.priceUsd = '0.25'; // $0.25
    this.minimumPayment = ethers.parseUnits(this.priceUsd, 6); // USDC has 6 decimals
  }

  /**
   * Initialize the payment verification service
   */
  async initialize() {
    try {
      logger.info('Initializing X402 Payment Service...');

      // Connect to Base Mainnet
      this.provider = new ethers.JsonRpcProvider(
        config.baseMainnetRpcUrl || process.env.BASE_MAINNET_RPC_URL
      );

      // Set recipient address (oracle wallet receives payments)
      const wallet = new ethers.Wallet(config.oraclePrivateKey, this.provider);
      this.recipientAddress = wallet.address;

      logger.info(`Payment recipient: ${this.recipientAddress}`);
      logger.info(`Service price: $${this.priceUsd} USDC`);
      logger.info('X402 Payment Service ready\n');

      return true;
    } catch (error) {
      logger.error('Failed to initialize X402 service:', error);
      return false;
    }
  }

  /**
   * Verify payment transaction on Base Mainnet
   *
   * @param {string} txHash - Transaction hash to verify
   * @returns {Object} Verification result
   */
  async verifyPayment(txHash) {
    try {
      logger.info(`Verifying USDC payment: ${txHash}`);

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
      features: [
        'JOLT-Atlas zkML inference',
        'Groth16 proof generation',
        'On-chain verifiable results',
        'Instant delivery'
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
