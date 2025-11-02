#!/usr/bin/env node

/**
 * Create Secure Admin User for SymbolAI
 *
 * This script must be run from symbolai-worker directory:
 *   cd symbolai-worker && node scripts/create-secure-admin.mjs
 *
 * Requirements:
 *   - bcryptjs installed (npm install bcryptjs)
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
const SALT_ROUNDS = 10;
const PASSWORD_LENGTH = 24;

function generateSecurePassword(length = PASSWORD_LENGTH) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

function generateUserId() {
  return `admin_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║     🔐 SymbolAI Secure Admin Creator             ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  try {
    // Generate credentials
    console.log('⏳ Generating secure credentials...');
    const password = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = generateUserId();
    const timestamp = new Date().toISOString();

    console.log('✅ Credentials generated!\n');

    // Create SQL
    const sql = `-- =====================================================
-- Secure Admin User
-- Generated: ${timestamp}
-- =====================================================

-- Delete existing admin (if any)
DELETE FROM users_new WHERE username = 'admin';

-- Create new secure admin
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

-- Verify
SELECT
  id,
  username,
  email,
  full_name,
  role_id,
  is_active,
  created_at
FROM users_new
WHERE username = 'admin';
`;

    // Save SQL file
    const sqlFilename = `../migrations/temp_admin_${Date.now()}.sql`;
    await fs.writeFile(sqlFilename, sql);

    // Display results
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║              🎉 SUCCESS!                           ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log('║                                                    ║');
    console.log('║  👤 Username: admin                                ║');
    console.log(`║  🔑 Password: ${password.substring(0, 20)}... ║`);
    console.log('║                                                    ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log('║  ⚠️  SAVE THIS PASSWORD IMMEDIATELY!               ║');
    console.log('║  ⚠️  IT WILL NOT BE SHOWN AGAIN!                   ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    console.log(`📄 SQL file saved: ${sqlFilename}\n`);

    console.log('📋 Next Steps:\n');
    console.log('  1️⃣  Save the password above in a secure location');
    console.log('  2️⃣  Execute the SQL:');
    console.log(`      Local:  wrangler d1 execute DB --local --file=${sqlFilename}`);
    console.log(`      Remote: wrangler d1 execute DB --remote --file=${sqlFilename}`);
    console.log('  3️⃣  Test login with the credentials');
    console.log('  4️⃣  Delete the SQL file after use\n');

    // Save credentials to temporary file
    const credsFile = `../ADMIN_CREDENTIALS_${Date.now()}.txt`;
    const credsContent = `
SymbolAI Admin Credentials
==========================
Generated: ${timestamp}

Username: admin
Password: ${password}

⚠️ DELETE THIS FILE AFTER SAVING THE PASSWORD SECURELY!

SQL File: ${sqlFilename}

Execution Commands:
  Local:  wrangler d1 execute DB --local --file=${sqlFilename}
  Remote: wrangler d1 execute DB --remote --file=${sqlFilename}
`;

    await fs.writeFile(credsFile, credsContent);
    console.log(`🔒 Credentials also saved to: ${credsFile}`);
    console.log('   (Delete this file after reading!)\n');

    console.log('✨ Done!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
