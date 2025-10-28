/**
 * Input validation utilities for API endpoints
 * Provides validation functions to prevent injection attacks and ensure data integrity
 */

/**
 * Validates a news headline
 * @param {string} headline - The headline to validate
 * @returns {{valid: boolean, error: string|null, sanitized: string}}
 */
export function validateHeadline(headline) {
  if (!headline) {
    return { valid: false, error: 'Headline is required', sanitized: '' };
  }

  if (typeof headline !== 'string') {
    return { valid: false, error: 'Headline must be a string', sanitized: '' };
  }

  // Trim whitespace
  const trimmed = headline.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Headline cannot be empty', sanitized: '' };
  }

  if (trimmed.length < 10) {
    return { valid: false, error: 'Headline must be at least 10 characters', sanitized: '' };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: 'Headline cannot exceed 500 characters', sanitized: '' };
  }

  // Check for malicious patterns (basic XSS prevention)
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,  // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  for (const pattern of maliciousPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Headline contains potentially malicious content', sanitized: '' };
    }
  }

  // Sanitize by removing any HTML tags
  const sanitized = trimmed.replace(/<[^>]*>/g, '');

  return { valid: true, error: null, sanitized };
}

/**
 * Validates a transaction hash
 * @param {string} txHash - The transaction hash to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateTxHash(txHash) {
  if (!txHash) {
    return { valid: false, error: 'Transaction hash is required' };
  }

  if (typeof txHash !== 'string') {
    return { valid: false, error: 'Transaction hash must be a string' };
  }

  // Ethereum transaction hash: 0x followed by 64 hex characters
  const txHashPattern = /^0x[a-fA-F0-9]{64}$/;

  if (!txHashPattern.test(txHash)) {
    return { valid: false, error: 'Invalid transaction hash format' };
  }

  return { valid: true, error: null };
}

/**
 * Validates a request ID
 * @param {string} requestId - The request ID to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateRequestId(requestId) {
  if (!requestId) {
    // Request ID is optional
    return { valid: true, error: null };
  }

  if (typeof requestId !== 'string') {
    return { valid: false, error: 'Request ID must be a string' };
  }

  // UUID or custom ID pattern (alphanumeric, hyphens, underscores)
  const requestIdPattern = /^[a-zA-Z0-9_-]{1,128}$/;

  if (!requestIdPattern.test(requestId)) {
    return { valid: false, error: 'Invalid request ID format' };
  }

  return { valid: true, error: null };
}

/**
 * Validates pagination parameters
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @returns {{valid: boolean, error: string|null, page: number, limit: number}}
 */
export function validatePagination(page, limit) {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return { valid: false, error: 'Page must be a positive integer', page: 1, limit: 10 };
  }

  if (isNaN(limitNum) || limitNum < 1) {
    return { valid: false, error: 'Limit must be a positive integer', page: 1, limit: 10 };
  }

  if (limitNum > 100) {
    return { valid: false, error: 'Limit cannot exceed 100', page: 1, limit: 10 };
  }

  return { valid: true, error: null, page: pageNum, limit: limitNum };
}

/**
 * Sanitizes error messages before sending to client
 * Removes sensitive information like file paths, internal IPs, etc.
 * @param {string} errorMessage - The error message to sanitize
 * @returns {string} Sanitized error message
 */
export function sanitizeErrorMessage(errorMessage) {
  if (!errorMessage || typeof errorMessage !== 'string') {
    return 'An error occurred';
  }

  // Remove file paths
  let sanitized = errorMessage.replace(/\/[\w\/.-]+/g, '[path]');

  // Remove IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]');

  // Remove private keys or sensitive hex strings
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{40,}/g, '[sensitive]');

  // Truncate very long messages
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + '...';
  }

  return sanitized;
}
