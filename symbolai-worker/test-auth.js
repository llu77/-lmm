/**
 * Test Authentication System
 * Verify password hashing and user authentication
 */

import crypto from 'crypto';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Test credentials from seed data
const testCredentials = [
  { username: 'supervisor_laban', password: 'laban1010', expectedHash: '1efaaf2195720bd5bad0c2285df2db04065f9b989061bba9674032e0905629a5' },
  { username: 'supervisor_tuwaiq', password: 'tuwaiq2020', expectedHash: '29b600bac689312719c4b5a1f334f207cd6976a6913e550c8cf0605a272309d4' },
  { username: 'emp_laban_ahmad', password: 'emp1010', expectedHash: '63e993352d8919a3a468a9d842a9f5e0ace2ecf6476fb2327bc78b20701dd2fe' },
  { username: 'emp_tuwaiq_khalid', password: 'emp2020', expectedHash: '96a4512a6d4fa640978b18cbefee117457504eb134147ffa8af3d86ad4aaf625' },
  { username: 'partner_laban', password: 'partner1010', expectedHash: 'daeba6437909179fe6f0c559c501bf8bba18cee5c27c5c74d486d1014c18f7fc' },
];

console.log('========================================');
console.log('Authentication System Test');
console.log('========================================\n');

let passed = 0;
let failed = 0;

testCredentials.forEach(({ username, password, expectedHash }) => {
  const actualHash = hashPassword(password);
  const isMatch = actualHash === expectedHash;

  if (isMatch) {
    console.log(`✅ PASS: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Hash matches: ${actualHash.substring(0, 16)}...`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${username}`);
    console.log(`   Expected: ${expectedHash}`);
    console.log(`   Actual:   ${actualHash}`);
    failed++;
  }
  console.log('');
});

console.log('========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed === 0) {
  console.log('\n🎉 All authentication tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some authentication tests failed!');
  process.exit(1);
}
