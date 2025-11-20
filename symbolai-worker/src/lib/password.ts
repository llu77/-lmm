/**
 * Password Hashing Utility - Argon2id Implementation
 *
 * This module provides secure password hashing using Argon2id algorithm.
 * Replaces insecure SHA-256 hashing with industry-standard secure hashing.
 *
 * @package @noble/hashes
 * @author SymbolAI Security Team
 * @date 2025-11-20
 *
 * Security Features:
 * - Argon2id (winner of Password Hashing Competition 2015)
 * - Memory-hard (resistant to GPU/ASIC attacks)
 * - Configurable parameters (OWASP-compliant)
 * - Constant-time comparison (prevents timing attacks)
 * - Backward compatibility with legacy SHA-256 hashes
 */

import { argon2id } from '@noble/hashes/argon2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

// =====================================================
// Configuration (OWASP 2025 Recommendations)
// =====================================================

/**
 * Argon2id Configuration
 *
 * Parameters balanced for security and performance on Cloudflare Workers:
 * - memoryCost: 19456 KB (19 MB) - Good resistance to parallel attacks
 * - timeCost: 2 iterations - Balance between security and speed
 * - parallelism: 1 - Workers limitation (single-threaded)
 * - outputLen: 32 bytes - Standard secure output length
 *
 * Expected performance: ~80-150ms per hash/verify operation
 */
const ARGON2_CONFIG = {
  memoryCost: 19456,  // 19 MB memory
  timeCost: 2,        // 2 iterations
  outputLen: 32,      // 32 bytes output
  parallelism: 1,     // Single thread
} as const;

/**
 * Argon2id version (19 = 0x13)
 */
const ARGON2_VERSION = 19;

/**
 * Salt length in bytes (128 bits)
 */
const SALT_LENGTH = 16;

// =====================================================
// Core Functions
// =====================================================

/**
 * Generate cryptographically secure random salt
 *
 * Uses Web Crypto API for secure random number generation
 *
 * @returns {Uint8Array} 16-byte random salt
 */
function generateSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);
  return salt;
}

/**
 * Hash password using Argon2id
 *
 * Creates a secure password hash using Argon2id algorithm.
 * Output format follows PHC string format for portability.
 *
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Hashed password in PHC format
 *
 * @example
 * const hash = await hashPassword('MySecurePassword123!');
 * // Returns: $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
 *
 * @throws {Error} If password is empty or invalid
 */
export async function hashPassword(password: string): Promise<string> {
  // Validation
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  if (password.length > 128) {
    throw new Error('Password too long (max 128 characters)');
  }

  // Generate random salt
  const salt = generateSalt();

  // Convert password to bytes
  const passwordBytes = new TextEncoder().encode(password);

  // Hash with Argon2id
  const hash = argon2id(passwordBytes, salt, {
    t: ARGON2_CONFIG.timeCost,
    m: ARGON2_CONFIG.memoryCost,
    p: ARGON2_CONFIG.parallelism,
  });

  // Return in PHC (Password Hashing Competition) format
  // Format: $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
  const phcString = [
    '$argon2id',
    `v=${ARGON2_VERSION}`,
    `m=${ARGON2_CONFIG.memoryCost},t=${ARGON2_CONFIG.timeCost},p=${ARGON2_CONFIG.parallelism}`,
    bytesToHex(salt),
    bytesToHex(hash)
  ].join('$');

  return phcString;
}

/**
 * Verify password against Argon2id hash
 *
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param {string} password - Plain text password to verify
 * @param {string} storedHash - Stored hash in PHC format
 * @returns {Promise<boolean>} True if password matches, false otherwise
 *
 * @example
 * const isValid = await verifyPassword('MyPassword123!', hash);
 * if (isValid) {
 *   console.log('Password correct!');
 * }
 *
 * @throws {Error} If hash format is invalid
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    // Parse PHC format
    // Expected: $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
    const parts = storedHash.split('$');

    if (parts.length !== 6) {
      throw new Error('Invalid hash format: incorrect number of parts');
    }

    if (parts[0] !== '' || parts[1] !== 'argon2id') {
      throw new Error('Invalid hash format: not an argon2id hash');
    }

    // Extract version
    const versionStr = parts[2];
    if (!versionStr.startsWith('v=')) {
      throw new Error('Invalid hash format: missing version');
    }

    // Extract parameters
    const paramsStr = parts[3];
    const params = paramsStr.split(',');

    if (params.length !== 3) {
      throw new Error('Invalid hash format: incorrect parameters');
    }

    const m = parseInt(params[0].split('=')[1], 10);
    const t = parseInt(params[1].split('=')[1], 10);
    const p = parseInt(params[2].split('=')[1], 10);

    if (isNaN(m) || isNaN(t) || isNaN(p)) {
      throw new Error('Invalid hash format: invalid parameter values');
    }

    // Extract salt and expected hash
    const salt = hexToBytes(parts[4]);
    const expectedHash = hexToBytes(parts[5]);

    // Hash the provided password with same parameters
    const passwordBytes = new TextEncoder().encode(password);
    const computedHash = argon2id(passwordBytes, salt, { t, m, p });

    // Constant-time comparison to prevent timing attacks
    return constantTimeEqual(computedHash, expectedHash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

// =====================================================
// Legacy Support (for migration period)
// =====================================================

/**
 * Verify password against legacy SHA-256 hash
 *
 * @deprecated This function is for migration period only.
 * Will be removed after all passwords are migrated to Argon2id.
 *
 * @param {string} password - Plain text password
 * @param {string} sha256Hash - Legacy SHA-256 hash (64 hex characters)
 * @returns {Promise<boolean>} True if password matches
 */
export async function verifyLegacySHA256(
  password: string,
  sha256Hash: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedHash === sha256Hash;
  } catch (error) {
    console.error('Legacy SHA-256 verification error:', error);
    return false;
  }
}

/**
 * Check if password hash needs rehashing
 *
 * Detects legacy SHA-256 hashes that need to be migrated to Argon2id.
 *
 * @param {string} storedHash - Hash from database
 * @returns {boolean} True if hash needs rehashing
 *
 * @example
 * if (needsRehash(user.password)) {
 *   // Re-hash with Argon2id on next login
 * }
 */
export function needsRehash(storedHash: string): boolean {
  // SHA-256 hashes are exactly 64 hex characters
  // Argon2id hashes start with $argon2id$
  return (
    storedHash.length === 64 &&
    !storedHash.startsWith('$argon2id$') &&
    /^[a-f0-9]{64}$/.test(storedHash)
  );
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Constant-time comparison to prevent timing attacks
 *
 * Compares two Uint8Arrays in constant time to prevent
 * timing-based side-channel attacks.
 *
 * @param {Uint8Array} a - First array
 * @param {Uint8Array} b - Second array
 * @returns {boolean} True if arrays are equal
 *
 * @security This function is critical for security.
 * Do not replace with simple comparison operators.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  // Different lengths -> not equal
  if (a.length !== b.length) {
    return false;
  }

  // XOR all bytes and accumulate result
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  // If result is 0, all bytes matched
  return result === 0;
}

// =====================================================
// Password Strength Validation
// =====================================================

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
  strength?: 'weak' | 'medium' | 'strong' | 'very_strong';
  suggestions?: string[];
  isBreached?: boolean;
  breachCount?: number;
}

/**
 * Check if password has been breached using Have I Been Pwned API
 * 
 * Uses k-anonymity model: only sends first 5 characters of SHA-1 hash
 * to protect privacy. The API returns all hash suffixes that match,
 * and we check locally if our full hash is in the list.
 * 
 * @param {string} password - Password to check
 * @returns {Promise<{isBreached: boolean, count: number}>} Breach status and occurrence count
 * 
 * @example
 * const result = await checkPasswordBreach('password123');
 * if (result.isBreached) {
 *   console.log(`Found in ${result.count} data breaches`);
 * }
 */
export async function checkPasswordBreach(
  password: string
): Promise<{ isBreached: boolean; count: number }> {
  try {
    // Hash the password with SHA-1 (HIBP requirement)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fullHash = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

    // Take first 5 characters (k-anonymity)
    const hashPrefix = fullHash.substring(0, 5);
    const hashSuffix = fullHash.substring(5);

    // Query HIBP API
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${hashPrefix}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'LMM-Financial-System',
        },
      }
    );

    if (!response.ok) {
      // If API is unavailable, don't block password creation
      console.error('HIBP API unavailable:', response.status);
      return { isBreached: false, count: 0 };
    }

    const responseText = await response.text();
    
    // Parse response: each line is "SUFFIX:COUNT"
    const lines = responseText.split('\n');
    for (const line of lines) {
      const [suffix, countStr] = line.split(':');
      if (suffix === hashSuffix) {
        return { isBreached: true, count: parseInt(countStr, 10) };
      }
    }

    return { isBreached: false, count: 0 };
  } catch (error) {
    // On error, don't block password creation
    console.error('Password breach check failed:', error);
    return { isBreached: false, count: 0 };
  }
}

/**
 * Validate password strength and requirements
 *
 * Checks password against security requirements:
 * - Minimum length: 8 characters
 * - Maximum length: 128 characters
 * - Contains uppercase, lowercase, numbers, special characters
 * - Not found in data breaches (via Have I Been Pwned API)
 *
 * @param {string} password - Password to validate
 * @param {boolean} checkBreach - Whether to check against HIBP database (default: true)
 * @returns {Promise<PasswordValidationResult>} Validation result with suggestions
 *
 * @example
 * const result = await validatePasswordStrength('MyPass123!');
 * if (!result.valid) {
 *   console.log(result.error);
 *   console.log(result.suggestions);
 * }
 */
export async function validatePasswordStrength(
  password: string,
  checkBreach: boolean = true
): Promise<PasswordValidationResult> {
  const suggestions: string[] = [];

  // Length check
  if (password.length < 8) {
    return {
      valid: false,
      error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      suggestions: ['استخدم 8 أحرف على الأقل']
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: 'كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)',
    };
  }

  // Character type checks
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-=+[\]\\/]/.test(password);

  // Count character types
  const typesCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
    .filter(Boolean).length;

  // Generate suggestions
  if (!hasUpperCase) suggestions.push('أضف أحرف كبيرة (A-Z)');
  if (!hasLowerCase) suggestions.push('أضف أحرف صغيرة (a-z)');
  if (!hasNumbers) suggestions.push('أضف أرقام (0-9)');
  if (!hasSpecialChar) suggestions.push('أضف رموز خاصة (!@#$%^&*)');

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  if (password.length >= 12 && typesCount === 4) {
    strength = 'very_strong';
  } else if (password.length >= 10 && typesCount >= 3) {
    strength = 'strong';
  } else if (password.length >= 8 && typesCount >= 3) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  // Require at least 3 character types for validity
  if (typesCount < 3) {
    return {
      valid: false,
      error: 'كلمة المرور ضعيفة - يجب أن تحتوي على 3 أنواع مختلفة من الأحرف على الأقل',
      strength,
      suggestions
    };
  }

  // Check against Have I Been Pwned database
  let isBreached = false;
  let breachCount = 0;
  
  if (checkBreach) {
    const breachResult = await checkPasswordBreach(password);
    isBreached = breachResult.isBreached;
    breachCount = breachResult.count;
    
    if (isBreached) {
      return {
        valid: false,
        error: `كلمة المرور هذه تم اختراقها في ${breachCount.toLocaleString('ar')} حالة تسريب بيانات. الرجاء اختيار كلمة مرور أخرى.`,
        strength,
        suggestions: ['استخدم كلمة مرور فريدة لم يتم اختراقها من قبل'],
        isBreached: true,
        breachCount
      };
    }
  }

  return {
    valid: true,
    strength,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    isBreached: false,
    breachCount: 0
  };
}

// =====================================================
// Export all functions
// =====================================================

export default {
  hashPassword,
  verifyPassword,
  verifyLegacySHA256,
  needsRehash,
  validatePasswordStrength,
  checkPasswordBreach,
};
