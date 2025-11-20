#!/usr/bin/env node

/**
 * Secure Password Generator Script
 *
 * Generates cryptographically secure random passwords for all users.
 * This script replaces hardcoded passwords with secure random ones.
 *
 * ⚠️  SECURITY WARNING:
 * - Run this script ONCE and save output securely
 * - Distribute passwords via secure encrypted channels
 * - DELETE generated file after distribution
 * - DO NOT commit .secure-passwords.json to git
 *
 * Usage:
 *   node scripts/generate-secure-passwords.js
 *
 * Output:
 *   - Console: Passwords displayed for immediate use
 *   - File: .secure-passwords.json (CONFIDENTIAL - delete after use)
 *
 * @author SymbolAI Security Team
 * @date 2025-11-20
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// Configuration
// =====================================================

const PASSWORD_LENGTH = 20; // Long and secure
const OUTPUT_FILE = path.join(__dirname, '..', '.secure-passwords.json');

// All users that need passwords
const USERS = [
  { username: 'supervisor_laban', fullName: 'مشرف فرع لبن', role: 'Supervisor' },
  { username: 'supervisor_tuwaiq', fullName: 'مشرف فرع طويق', role: 'Supervisor' },
  { username: 'partner_laban', fullName: 'شريك فرع لبن', role: 'Partner' },
  { username: 'partner_tuwaiq', fullName: 'شريك فرع طويق', role: 'Partner' },
  { username: 'emp_laban_ahmad', fullName: 'أحمد علي - موظف فرع لبن', role: 'Employee' },
  { username: 'emp_laban_omar', fullName: 'عمر حسن - موظف فرع لبن', role: 'Employee' },
  { username: 'emp_laban_fatima', fullName: 'فاطمة محمد - موظفة فرع لبن', role: 'Employee' },
  { username: 'emp_laban_sara', fullName: 'سارة أحمد - موظفة فرع لبن', role: 'Employee' },
  { username: 'emp_tuwaiq_khalid', fullName: 'خالد عبدالله - موظف فرع طويق', role: 'Employee' },
  { username: 'emp_tuwaiq_sara', fullName: 'سارة خالد - موظفة فرع طويق', role: 'Employee' },
  { username: 'emp_tuwaiq_fatima', fullName: 'فاطمة علي - موظفة فرع طويق', role: 'Employee' },
  { username: 'emp_tuwaiq_mohammed', fullName: 'محمد سعد - موظف فرع طويق', role: 'Employee' },
];

// =====================================================
// Password Generation Functions
// =====================================================

/**
 * Generate cryptographically secure random password
 *
 * Password requirements:
 * - Minimum length: 20 characters
 * - Contains: uppercase, lowercase, numbers, special characters
 * - Cryptographically random (not predictable)
 *
 * @param {number} length - Password length (default: 20)
 * @returns {string} Secure random password
 */
function generateSecurePassword(length = PASSWORD_LENGTH) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + symbols;

  let password = '';

  // Ensure at least one character from each type
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += symbols[crypto.randomInt(symbols.length)];

  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  // Shuffle the password to randomize position of required characters
  return password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');
}

/**
 * Calculate password strength score
 *
 * @param {string} password - Password to analyze
 * @returns {object} Strength analysis
 */
function analyzePasswordStrength(password) {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-=+\[\]\\\/]/.test(password);

  const typesCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
    .filter(Boolean).length;

  let strength;
  if (password.length >= 16 && typesCount === 4) {
    strength = 'very_strong';
  } else if (password.length >= 12 && typesCount >= 3) {
    strength = 'strong';
  } else if (password.length >= 8 && typesCount >= 3) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  return {
    length: password.length,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
    typesCount,
    strength,
  };
}

// =====================================================
// Main Script
// =====================================================

function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║     🔐  Secure Password Generator - SymbolAI  🔐      ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('⚠️  SECURITY WARNING:');
  console.log('   - These passwords will be displayed ONCE');
  console.log('   - Distribute via secure encrypted channels ONLY');
  console.log('   - DELETE .secure-passwords.json after distribution');
  console.log('   - DO NOT commit this file to git');
  console.log('');
  console.log('Generating secure passwords...');
  console.log('');

  const passwords = {};
  const passwordsWithInfo = [];

  // Generate passwords for all users
  USERS.forEach((user) => {
    const password = generateSecurePassword();
    const analysis = analyzePasswordStrength(password);

    passwords[user.username] = password;

    passwordsWithInfo.push({
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      password: password,
      strength: analysis.strength,
    });
  });

  // Create output object
  const output = {
    generated_at: new Date().toISOString(),
    warning: '⚠️  CONFIDENTIAL - Store securely and DELETE after use',
    total_users: USERS.length,
    password_length: PASSWORD_LENGTH,
    passwords: passwordsWithInfo,
  };

  // Save to file
  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`✅ Passwords saved to: ${OUTPUT_FILE}`);
    console.log('');
  } catch (error) {
    console.error('❌ Error saving passwords to file:', error.message);
    console.log('');
  }

  // Display passwords in console
  console.log('═══════════════════════════════════════════════════════');
  console.log('                  GENERATED PASSWORDS                  ');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  passwordsWithInfo.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username}`);
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password: ${user.password}`);
    console.log(`   Strength: ${user.strength.toUpperCase()}`);
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📝 Next Steps:');
  console.log('');
  console.log('   1. Copy passwords above to a secure location');
  console.log('   2. Distribute to users via encrypted email/message');
  console.log('   3. DELETE the .secure-passwords.json file');
  console.log('   4. Force users to change passwords on first login');
  console.log('');
  console.log('⚠️  IMPORTANT: Run this command to delete the file:');
  console.log('   rm .secure-passwords.json');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('🔒 Password Security Tips:');
  console.log('');
  console.log('   - Never share passwords via unencrypted channels');
  console.log('   - Use password managers for secure storage');
  console.log('   - Enable 2FA where possible (future feature)');
  console.log('   - Regularly rotate passwords (every 90 days)');
  console.log('   - Never reuse passwords across systems');
  console.log('');
  console.log('✅ Password generation complete!');
  console.log('');
}

// Run the script
main();
