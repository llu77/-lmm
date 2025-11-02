#!/usr/bin/env node

/**
 * Create Secure Admin User
 *
 * This script creates a new admin user with:
 * - Strong bcrypt password hashing
 * - Cryptographically secure random password
 * - Proper logging for audit
 *
 * Usage:
 *   node scripts/create-secure-admin.js
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Configuration
const SALT_ROUNDS = 10;
const PASSWORD_LENGTH = 24;

/**
 * Generate a cryptographically secure random password
 */
function generateSecurePassword(length = PASSWORD_LENGTH) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }

  return password;
}

/**
 * Generate user ID with timestamp
 */
function generateUserId() {
  return `admin_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Main function
 */
async function createSecureAdmin() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║     SymbolAI - Secure Admin User Creation         ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Generate secure password
    console.log('🔐 Step 1: Generating secure password...');
    const password = generateSecurePassword();
    console.log('✓ Secure password generated\n');

    // Step 2: Hash password with bcrypt
    console.log('🔒 Step 2: Hashing password with bcrypt...');
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('✓ Password hashed successfully\n');

    // Step 3: Generate user ID
    console.log('🆔 Step 3: Generating user ID...');
    const userId = generateUserId();
    console.log(`✓ User ID: ${userId}\n`);

    // Step 4: Generate SQL
    console.log('📝 Step 4: Generating SQL statement...\n');

    const sql = `
-- =====================================================
-- Secure Admin User
-- Generated: ${new Date().toISOString()}
-- IMPORTANT: Save the credentials below securely!
-- =====================================================

INSERT INTO users_new (
  id,
  username,
  password,
  email,
  full_name,
  role_id,
  branch_id,
  is_active,
  created_at
) VALUES (
  '${userId}',
  'admin',
  '${hashedPassword}',
  'admin@symbolai.net',
  'System Administrator',
  'role_admin',
  NULL,
  1,
  datetime('now')
);

-- Verification query
SELECT
  id,
  username,
  email,
  full_name,
  role_id,
  is_active
FROM users_new
WHERE id = '${userId}';
`;

    // Step 5: Display credentials
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║           🔑 ADMIN CREDENTIALS                     ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║ Username: admin                                    ║`);
    console.log(`║ Password: ${password.padEnd(42)} ║`);
    console.log('╠════════════════════════════════════════════════════╣');
    console.log('║ ⚠️  SAVE THESE CREDENTIALS IMMEDIATELY!            ║');
    console.log('║ ⚠️  THEY WILL NOT BE SHOWN AGAIN!                  ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    console.log('📄 SQL Statement:\n');
    console.log(sql);

    console.log('\n📋 To execute this SQL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('For LOCAL database:');
    console.log('  1. Save the SQL above to a file: admin.sql');
    console.log('  2. Run: wrangler d1 execute DB --local --file=admin.sql\n');

    console.log('For PRODUCTION database:');
    console.log('  1. Save the SQL above to a file: admin.sql');
    console.log('  2. Run: wrangler d1 execute DB --remote --file=admin.sql\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Step 6: Save to file
    const fs = await import('fs');
    const filename = `admin-${Date.now()}.sql`;

    await fs.promises.writeFile(filename, sql);
    console.log(`✅ SQL saved to: ${filename}`);

    console.log('\n🔐 Security Recommendations:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. ✓ Store credentials in a password manager');
    console.log('2. ✓ Delete the SQL file after execution');
    console.log('3. ✓ Change password after first login');
    console.log('4. ✓ Enable 2FA (when implemented)');
    console.log('5. ✓ Review audit logs regularly');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✨ Admin user creation complete!\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createSecureAdmin();
}

export { createSecureAdmin, generateSecurePassword };
