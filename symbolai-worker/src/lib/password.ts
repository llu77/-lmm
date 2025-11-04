/**
 * Password Hashing & Verification Utilities
 *
 * Uses bcrypt for secure password hashing
 * - Automatically salted
 * - Configurable work factor (default: 12)
 * - Resistant to rainbow table attacks
 * - Slow by design (prevents brute force)
 */

import bcrypt from 'bcryptjs';

/**
 * Default bcrypt work factor (cost)
 * Higher = more secure but slower
 * 12 is recommended for production (256ms per hash on modern hardware)
 */
const DEFAULT_SALT_ROUNDS = 12;

/**
 * Hash a plain text password using bcrypt
 *
 * @param password - Plain text password to hash
 * @param saltRounds - bcrypt work factor (optional, defaults to 12)
 * @returns Promise<string> - Hashed password
 *
 * @example
 * const hashed = await hashPassword('mySecurePassword123');
 * // Returns: $2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW
 */
export async function hashPassword(
  password: string,
  saltRounds: number = DEFAULT_SALT_ROUNDS
): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (password.length > 72) {
    throw new Error('Password cannot exceed 72 characters (bcrypt limitation)');
  }

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a plain text password against a bcrypt hash
 *
 * @param password - Plain text password to verify
 * @param hash - bcrypt hash to compare against
 * @returns Promise<boolean> - true if password matches, false otherwise
 *
 * @example
 * const isValid = await verifyPassword('mySecurePassword123', hashedPassword);
 * if (isValid) {
 *   console.log('Password is correct!');
 * }
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error('Password verification failed:', error);
    return false;
  }
}

/**
 * Check if a hash needs to be rehashed (due to increased work factor)
 *
 * @param hash - Current password hash
 * @param targetRounds - Target work factor (optional, defaults to 12)
 * @returns boolean - true if rehash is needed
 *
 * @example
 * // If user logs in and hash is old (lower rounds), rehash it
 * if (needsRehash(user.password)) {
 *   const newHash = await hashPassword(plainPassword);
 *   await updateUserPassword(userId, newHash);
 * }
 */
export function needsRehash(
  hash: string,
  targetRounds: number = DEFAULT_SALT_ROUNDS
): boolean {
  try {
    // Extract current rounds from hash
    // bcrypt hash format: $2a$12$...
    const parts = hash.split('$');
    if (parts.length < 4) return true;

    const currentRounds = parseInt(parts[2], 10);
    return currentRounds < targetRounds;
  } catch {
    return true; // If we can't parse, assume rehash is needed
  }
}

/**
 * Migrate SHA-256 hash to bcrypt
 *
 * This is for legacy users who have SHA-256 hashes
 * Should be called during login when old hash is detected
 *
 * @param password - Plain text password provided by user
 * @param oldHash - Old SHA-256 hash from database
 * @returns Promise<{ isValid: boolean; newHash?: string }>
 *
 * @example
 * const result = await migrateSHA256ToBcrypt(password, user.password);
 * if (result.isValid && result.newHash) {
 *   await updateUserPassword(userId, result.newHash);
 * }
 */
export async function migrateSHA256ToBcrypt(
  password: string,
  oldHash: string
): Promise<{ isValid: boolean; newHash?: string }> {
  try {
    // Verify SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedHash === oldHash) {
      // Password is correct, create new bcrypt hash
      const newHash = await hashPassword(password);
      return { isValid: true, newHash };
    }

    return { isValid: false };
  } catch (error) {
    console.error('SHA-256 migration failed:', error);
    return { isValid: false };
  }
}

/**
 * Check if a hash is bcrypt format
 *
 * @param hash - Hash string to check
 * @returns boolean - true if hash is bcrypt format
 */
export function isBcryptHash(hash: string): boolean {
  // bcrypt hash starts with $2a$, $2b$, or $2y$
  return /^\$2[aby]\$\d{2}\$/.test(hash);
}

/**
 * Validate password strength
 *
 * @param password - Password to validate
 * @returns { valid: boolean; errors: string[] }
 *
 * @example
 * const validation = validatePasswordStrength('weak');
 * if (!validation.valid) {
 *   console.error('Password errors:', validation.errors);
 * }
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password) {
    errors.push('كلمة المرور مطلوبة');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }

  if (password.length > 72) {
    errors.push('كلمة المرور لا يمكن أن تتجاوز 72 حرف');
  }

  if (!/[a-z]/.test(password) && !/[أ-ي]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف صغير');
  }

  if (!/[A-Z]/.test(password) && !/[0-9]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف كبير أو رقم');
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    '123456789', 'letmein', 'welcome', 'monkey', '1234567890'
  ];

  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('كلمة المرور ضعيفة جداً - استخدم كلمة مرور أقوى');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate a random secure password
 *
 * @param length - Password length (default: 16)
 * @returns string - Random secure password
 *
 * @example
 * const password = generateSecurePassword(20);
 * console.log(password); // "K7#mP9$nQ2@vL4&xR8"
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = lowercase + uppercase + numbers + symbols;

  let password = '';

  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks
 *
 * @param a - First string
 * @param b - Second string
 * @returns boolean - true if strings match
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
