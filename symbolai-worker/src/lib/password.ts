/**
 * Secure Password Hashing for Cloudflare Workers
 * Uses PBKDF2 with 100,000 iterations (recommended by OWASP)
 *
 * Why PBKDF2 instead of bcrypt?
 * - bcrypt requires native Node.js modules (not available in Workers)
 * - PBKDF2 is available via Web Crypto API
 * - 100k iterations provides strong resistance to brute force
 *
 * Security Properties:
 * - Salt: 16 bytes random (prevents rainbow tables)
 * - Iterations: 100,000 (OWASP recommended minimum)
 * - Hash: SHA-256 (256-bit output)
 * - Format: salt:hash (both hex-encoded)
 */

const ITERATIONS = 100_000; // OWASP minimum for PBKDF2-SHA256
const SALT_LENGTH = 16; // 128 bits
const HASH_LENGTH = 32; // 256 bits

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Convert Uint8Array to hex string
 */
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Hash password using PBKDF2
 *
 * @param password - Plain text password
 * @param salt - Salt as Uint8Array (optional, generated if not provided)
 * @returns Object with salt and hash (both hex-encoded)
 */
async function pbkdf2Hash(
  password: string,
  salt?: Uint8Array
): Promise<{ salt: string; hash: string }> {
  // Generate salt if not provided
  if (!salt) {
    salt = generateSalt();
  }

  // Import password as key material
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Derive key using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    HASH_LENGTH * 8 // 256 bits
  );

  return {
    salt: toHex(salt),
    hash: toHex(new Uint8Array(hashBuffer))
  };
}

/**
 * Hash a password for storage
 *
 * @param password - Plain text password
 * @returns Hashed password in format "salt:hash"
 *
 * @example
 * const hashed = await hashPassword('mySecurePassword123');
 * // Returns: "a1b2c3d4...16bytes:e5f6g7h8...32bytes"
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate password
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const { salt, hash } = await pbkdf2Hash(password);
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 *
 * @param password - Plain text password to verify
 * @param storedHash - Stored hash in format "salt:hash"
 * @returns true if password matches, false otherwise
 *
 * @example
 * const isValid = await verifyPassword('mySecurePassword123', storedHash);
 * if (isValid) {
 *   // Password correct
 * }
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    // Parse stored hash
    const parts = storedHash.split(':');
    if (parts.length !== 2) {
      // Invalid format
      return false;
    }

    const [saltHex, expectedHash] = parts;
    const salt = fromHex(saltHex);

    // Hash the provided password with the same salt
    const { hash: computedHash } = await pbkdf2Hash(password, salt);

    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(computedHash, expectedHash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by comparing all characters even if mismatch found
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Check if a password hash uses the old SHA-256 format
 * Used for migrating old passwords to new format
 *
 * @param hash - Password hash to check
 * @returns true if hash is old SHA-256 format (64 hex chars, no colon)
 */
export function isOldPasswordFormat(hash: string): boolean {
  // Old format: 64 hex characters (SHA-256 = 32 bytes = 64 hex chars)
  // New format: "salt:hash" (32 hex chars : 64 hex chars)
  return hash.length === 64 && !hash.includes(':');
}

/**
 * Hash password using old SHA-256 method (for backward compatibility)
 * ONLY use this for verifying old passwords during migration
 *
 * @deprecated Use hashPassword() for new passwords
 */
export async function hashPasswordSHA256Legacy(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate password strength
 * Returns validation result with errors if password is weak
 *
 * @param password - Password to validate
 * @returns Validation result
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
  score: number; // 0-5
} {
  const errors: string[] = [];
  let score = 0;

  // Minimum length
  if (password.length < 8) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  } else if (password.length >= 8) {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Has uppercase
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    errors.push('يجب أن تحتوي على حرف كبير (A-Z)');
  }

  // Has lowercase
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    errors.push('يجب أن تحتوي على حرف صغير (a-z)');
  }

  // Has number
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    errors.push('يجب أن تحتوي على رقم (0-9)');
  }

  // Has special character
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  // Common passwords check (basic)
  const commonPasswords = [
    'password',
    'password123',
    '12345678',
    'qwerty',
    'admin',
    'admin123'
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('كلمة المرور شائعة جداً');
    score = Math.max(0, score - 2);
  }

  return {
    valid: errors.length === 0 && score >= 3,
    errors,
    score: Math.min(5, score)
  };
}
