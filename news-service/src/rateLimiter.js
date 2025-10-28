/**
 * Rate limiting utilities to prevent API abuse
 * Uses in-memory store with configurable limits per endpoint
 */

/**
 * Simple in-memory rate limiter
 */
export class RateLimiter {
  constructor() {
    // Store: { key: { count: number, resetTime: timestamp } }
    this.store = new Map();

    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request should be rate limited
   * @param {string} key - Unique identifier (e.g., IP address)
   * @param {Object} options - Rate limit options
   * @param {number} options.windowMs - Time window in milliseconds
   * @param {number} options.maxRequests - Max requests per window
   * @returns {{allowed: boolean, remaining: number, resetTime: number}}
   */
  checkLimit(key, options = {}) {
    const { windowMs = 60000, maxRequests = 10 } = options;
    const now = Date.now();

    if (!this.store.has(key)) {
      // First request from this key
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    const record = this.store.get(key);

    // Check if window has expired
    if (now >= record.resetTime) {
      // Reset the window
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs
      });

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    // Within the window
    if (record.count >= maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime
      };
    }

    // Increment count
    record.count++;
    this.store.set(key, record);

    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Remove expired entries from store
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetTime + 60000) { // 1 minute after expiry
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`[RateLimiter] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Reset rate limit for a specific key
   * @param {string} key - The key to reset
   */
  reset(key) {
    this.store.delete(key);
  }

  /**
   * Get current status for a key
   * @param {string} key - The key to check
   * @returns {{count: number, resetTime: number}|null}
   */
  getStatus(key) {
    return this.store.get(key) || null;
  }

  /**
   * Get total number of tracked keys
   * @returns {number}
   */
  getKeyCount() {
    return this.store.size;
  }
}

/**
 * Express middleware factory for rate limiting
 * @param {RateLimiter} rateLimiter - RateLimiter instance
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Max requests per window
 * @param {string} options.keyGenerator - Function to generate key from request
 * @returns {Function} Express middleware
 */
export function createRateLimitMiddleware(rateLimiter, options = {}) {
  const {
    windowMs = 60000,          // 1 minute
    maxRequests = 10,           // 10 requests per minute
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    message = 'Too many requests, please try again later'
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const result = rateLimiter.checkLimit(key, { windowMs, maxRequests });

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      });
    }

    next();
  };
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Demo endpoint: more lenient
  demo: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 5,              // 5 requests per minute
    message: 'Demo endpoint rate limit exceeded. Please wait before trying again.'
  },

  // Paid classification endpoint: moderate
  classify: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 10,             // 10 requests per minute
    message: 'Classification rate limit exceeded. Please wait before submitting another request.'
  },

  // Payment request endpoint: stricter
  paymentRequest: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 20,             // 20 requests per minute
    message: 'Payment request rate limit exceeded. Please wait before trying again.'
  },

  // General API: lenient
  general: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 60,             // 60 requests per minute
    message: 'API rate limit exceeded. Please wait before making more requests.'
  }
};
