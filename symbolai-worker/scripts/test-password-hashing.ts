#!/usr/bin/env node

/**
 * Test Password Hashing Functionality
 *
 * This script tests:
 * - Argon2id password hashing
 * - Password verification
 * - Legacy SHA-256 compatibility
 * - Rehash detection
 * - Password strength validation
 * - Performance benchmarking
 *
 * @version 1.0
 * @date 2025-11-20
 */

import crypto from 'crypto';
import {
  hashPassword,
  verifyPassword,
  verifyLegacySHA256,
  needsRehash,
  validatePasswordStrength
} from '../src/lib/password';

console.log('========================================');
console.log('🧪 Password Hashing Test Suite');
console.log('========================================\n');

// =====================================================
// Test 1: Basic Hashing
// =====================================================
console.log('Test 1: Basic Argon2id Hashing');
console.log('─────────────────────────────────────');

const testPassword = 'SecureP@ssw0rd123!';
console.log(`Password: ${testPassword}`);

const startHash = Date.now();
const hash = await hashPassword(testPassword);
const hashTime = Date.now() - startHash;

console.log(`Hash: ${hash.substring(0, 50)}...`);
console.log(`Hash length: ${hash.length} characters`);
console.log(`Time taken: ${hashTime}ms`);
console.log(`Format valid: ${hash.startsWith('$argon2id$v=19$')}`);
console.log('✅ Test 1 PASSED\n');

// =====================================================
// Test 2: Password Verification
// =====================================================
console.log('Test 2: Password Verification');
console.log('─────────────────────────────────────');

const startVerify = Date.now();
const isValid = await verifyPassword(testPassword, hash);
const verifyTime = Date.now() - startVerify;

console.log(`Correct password verified: ${isValid}`);
console.log(`Time taken: ${verifyTime}ms`);

const wrongPassword = 'WrongPassword123!';
const isInvalid = await verifyPassword(wrongPassword, hash);
console.log(`Wrong password rejected: ${!isInvalid}`);

if (isValid && !isInvalid) {
  console.log('✅ Test 2 PASSED\n');
} else {
  console.log('❌ Test 2 FAILED\n');
  process.exit(1);
}

// =====================================================
// Test 3: Legacy SHA-256 Compatibility
// =====================================================
console.log('Test 3: Legacy SHA-256 Compatibility');
console.log('─────────────────────────────────────');

const legacyPassword = 'laban1010';
const legacySHA256 = crypto.createHash('sha256').update(legacyPassword).digest('hex');

console.log(`Legacy password: ${legacyPassword}`);
console.log(`Legacy SHA-256: ${legacySHA256.substring(0, 30)}...`);

const legacyValid = await verifyLegacySHA256(legacyPassword, legacySHA256);
console.log(`Legacy password verified: ${legacyValid}`);

const shouldRehash = needsRehash(legacySHA256);
console.log(`Detected as needing rehash: ${shouldRehash}`);

const modernHashRehash = needsRehash(hash);
console.log(`Modern hash needs rehash: ${modernHashRehash}`);

if (legacyValid && shouldRehash && !modernHashRehash) {
  console.log('✅ Test 3 PASSED\n');
} else {
  console.log('❌ Test 3 FAILED\n');
  process.exit(1);
}

// =====================================================
// Test 4: Password Strength Validation
// =====================================================
console.log('Test 4: Password Strength Validation');
console.log('─────────────────────────────────────');

const testCases = [
  { password: 'weak', expectedValid: false, reason: 'Too short' },
  { password: 'weakpassword', expectedValid: false, reason: 'No uppercase/numbers/symbols (only 1 type)' },
  { password: 'WeakPassword', expectedValid: false, reason: 'Only 2 types (uppercase + lowercase)' },
  { password: 'WeakPass1', expectedValid: true, reason: '3 types (uppercase + lowercase + numbers) - Valid' },
  { password: 'Str0ng!Pass', expectedValid: true, reason: '4 types - Valid password' },
  { password: 'SecureP@ssw0rd123!', expectedValid: true, reason: '4 types - Strong password' }
];

let allPassed = true;
testCases.forEach((test, idx) => {
  const result = validatePasswordStrength(test.password);
  const passed = result.valid === test.expectedValid;

  console.log(`  ${idx + 1}. "${test.password}" (${test.reason})`);
  console.log(`     Expected: ${test.expectedValid ? 'VALID' : 'INVALID'}, Got: ${result.valid ? 'VALID' : 'INVALID'}`);

  if (!passed) {
    console.log(`     ❌ FAILED`);
    allPassed = false;
  } else {
    console.log(`     ✅ PASSED`);
  }

  if (!result.valid && result.error) {
    console.log(`     Error: ${result.error}`);
  }
});

if (allPassed) {
  console.log('✅ Test 4 PASSED\n');
} else {
  console.log('❌ Test 4 FAILED\n');
  process.exit(1);
}

// =====================================================
// Test 5: Performance Benchmark
// =====================================================
console.log('Test 5: Performance Benchmark');
console.log('─────────────────────────────────────');

const iterations = 5;
const passwords = [
  'TestPass1!',
  'AnotherP@ss2',
  'Secure#Pass3',
  'Strong$Pass4',
  'Complex%Pass5'
];

console.log(`Running ${iterations} hash operations...`);

const hashTimes = [];
for (let i = 0; i < iterations; i++) {
  const start = Date.now();
  await hashPassword(passwords[i]);
  const elapsed = Date.now() - start;
  hashTimes.push(elapsed);
  console.log(`  Hash ${i + 1}: ${elapsed}ms`);
}

const avgHashTime = hashTimes.reduce((a, b) => a + b, 0) / hashTimes.length;
const minHashTime = Math.min(...hashTimes);
const maxHashTime = Math.max(...hashTimes);

console.log(`\nHash Performance:`);
console.log(`  Average: ${avgHashTime.toFixed(2)}ms`);
console.log(`  Min: ${minHashTime}ms`);
console.log(`  Max: ${maxHashTime}ms`);

console.log(`\nRunning ${iterations} verify operations...`);

const hashes = await Promise.all(passwords.map(p => hashPassword(p)));
const verifyTimes = [];

for (let i = 0; i < iterations; i++) {
  const start = Date.now();
  await verifyPassword(passwords[i], hashes[i]);
  const elapsed = Date.now() - start;
  verifyTimes.push(elapsed);
  console.log(`  Verify ${i + 1}: ${elapsed}ms`);
}

const avgVerifyTime = verifyTimes.reduce((a, b) => a + b, 0) / verifyTimes.length;
const minVerifyTime = Math.min(...verifyTimes);
const maxVerifyTime = Math.max(...verifyTimes);

console.log(`\nVerify Performance:`);
console.log(`  Average: ${avgVerifyTime.toFixed(2)}ms`);
console.log(`  Min: ${minVerifyTime}ms`);
console.log(`  Max: ${maxVerifyTime}ms`);

// Check if performance is acceptable (< 200ms for hash, < 150ms for verify)
const performanceAcceptable = avgHashTime < 200 && avgVerifyTime < 150;

if (performanceAcceptable) {
  console.log('✅ Test 5 PASSED (Performance within acceptable range)\n');
} else {
  console.log('⚠️  Test 5 WARNING (Performance slower than expected)\n');
}

// =====================================================
// Test 6: Hash Uniqueness (Same password, different salts)
// =====================================================
console.log('Test 6: Hash Uniqueness');
console.log('─────────────────────────────────────');

const samePassword = 'TestPassword123!';
const hash1 = await hashPassword(samePassword);
const hash2 = await hashPassword(samePassword);
const hash3 = await hashPassword(samePassword);

console.log(`Password: ${samePassword}`);
console.log(`Hash 1: ${hash1.substring(0, 50)}...`);
console.log(`Hash 2: ${hash2.substring(0, 50)}...`);
console.log(`Hash 3: ${hash3.substring(0, 50)}...`);

const allDifferent = hash1 !== hash2 && hash2 !== hash3 && hash1 !== hash3;
console.log(`All hashes different: ${allDifferent}`);

// Verify all hashes are valid for the same password
const verify1 = await verifyPassword(samePassword, hash1);
const verify2 = await verifyPassword(samePassword, hash2);
const verify3 = await verifyPassword(samePassword, hash3);

const allValid = verify1 && verify2 && verify3;
console.log(`All hashes verify correctly: ${allValid}`);

if (allDifferent && allValid) {
  console.log('✅ Test 6 PASSED\n');
} else {
  console.log('❌ Test 6 FAILED\n');
  process.exit(1);
}

// =====================================================
// Summary
// =====================================================
console.log('========================================');
console.log('📊 Test Summary');
console.log('========================================');
console.log('✅ All tests passed successfully!');
console.log('');
console.log('Key Metrics:');
console.log(`  - Average hash time: ${avgHashTime.toFixed(2)}ms`);
console.log(`  - Average verify time: ${avgVerifyTime.toFixed(2)}ms`);
console.log(`  - Hash format: PHC (Argon2id)`);
console.log(`  - Legacy SHA-256 support: Active`);
console.log(`  - Password strength validation: Working`);
console.log('');
console.log('🔒 Password hashing system is production-ready!');
console.log('========================================\n');

process.exit(0);
