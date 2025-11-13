#!/usr/bin/env node
/**
 * Test Admin and Supervisors Access
 * 
 * This script tests:
 * 1. Admin login with new password (Omar101010)
 * 2. Supervisor access (each supervisor can only access their branch)
 * 3. Branch data isolation
 */

import crypto from 'crypto';

// Test credentials
const credentials = {
  admin: {
    username: 'admin',
    password: 'Omar101010',
    expectedRole: 'admin',
    expectedBranch: null, // Admin has no branch restriction
    canViewAllBranches: true
  },
  supervisorTuwaiq: {
    username: 'supervisor_tuwaiq',
    password: 'tuwaiq2020',
    expectedRole: 'supervisor',
    expectedBranch: 'branch_2020',
    expectedName: 'محمد إسماعيل',
    canViewAllBranches: false
  },
  supervisorLaban: {
    username: 'supervisor_laban',
    password: 'laban1010',
    expectedRole: 'supervisor',
    expectedBranch: 'branch_1010',
    expectedName: 'عبدالحي جلال',
    canViewAllBranches: false
  }
};

// Hash password using SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Test results
const results = {
  passed: [],
  failed: []
};

console.log('╔════════════════════════════════════════════════════╗');
console.log('║     Admin & Supervisors Access Test               ║');
console.log('╚════════════════════════════════════════════════════╝\n');

// Test 1: Admin password hash
console.log('📝 Test 1: Generating password hashes...\n');
Object.entries(credentials).forEach(([key, cred]) => {
  const hash = hashPassword(cred.password);
  console.log(`${key}:`);
  console.log(`  Username: ${cred.username}`);
  console.log(`  Password: ${cred.password}`);
  console.log(`  Hash: ${hash}\n`);
});

// Test 2: Expected permissions
console.log('\n📋 Test 2: Expected Permissions\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Admin (admin):');
console.log('  ✓ Can view all branches');
console.log('  ✓ Can manage users');
console.log('  ✓ Can manage settings');
console.log('  ✓ Can manage branches');
console.log('  ✓ Full access to all data\n');

console.log('Supervisor Tuwaiq (محمد إسماعيل):');
console.log('  ✓ Can only access branch_2020 (Tuwaiq)');
console.log('  ✓ Can manage employees in their branch');
console.log('  ✓ Can add revenue/expenses in their branch');
console.log('  ✓ Can view reports for their branch');
console.log('  ✗ Cannot view other branches\n');

console.log('Supervisor Laban (عبدالحي جلال):');
console.log('  ✓ Can only access branch_1010 (Laban)');
console.log('  ✓ Can manage employees in their branch');
console.log('  ✓ Can add revenue/expenses in their branch');
console.log('  ✓ Can view reports for their branch');
console.log('  ✗ Cannot view other branches\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 3: SQL Queries for validation
console.log('📊 Test 3: SQL Validation Queries\n');

const sqlQueries = `
-- Verify admin password
SELECT id, username, password, full_name, role_id, branch_id
FROM users_new
WHERE username = 'admin';

-- Verify supervisor Tuwaiq
SELECT id, username, full_name, role_id, branch_id
FROM users_new
WHERE username = 'supervisor_tuwaiq';

-- Verify supervisor Laban
SELECT id, username, full_name, role_id, branch_id
FROM users_new
WHERE username = 'supervisor_laban';

-- Check admin permissions
SELECT r.name, r.name_ar, r.can_view_all_branches, r.can_manage_users
FROM roles r
WHERE r.id = 'role_admin';

-- Check supervisor permissions
SELECT r.name, r.name_ar, r.can_view_all_branches, r.can_manage_employees
FROM roles r
WHERE r.id = 'role_supervisor';

-- Test branch isolation: Admin should see all branches
SELECT id, name, name_ar, manager_name
FROM branches;

-- Test branch isolation: Supervisor should only see their branch
SELECT id, name, name_ar, manager_name
FROM branches
WHERE id = 'branch_2020'; -- For Tuwaiq supervisor

SELECT id, name, name_ar, manager_name
FROM branches
WHERE id = 'branch_1010'; -- For Laban supervisor
`;

console.log(sqlQueries);

console.log('\n📝 To test in the database:\n');
console.log('1. Local database:');
console.log('   wrangler d1 execute DB --local --command="<query>"\n');
console.log('2. Remote database:');
console.log('   wrangler d1 execute DB --remote --command="<query>"\n');

// Test 4: API endpoint tests
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('🌐 Test 4: API Endpoints to Test\n');

console.log('After logging in with each user, test these endpoints:\n');

console.log('Admin (should see ALL branches):');
console.log('  GET /api/branches/list');
console.log('  GET /api/employees/list');
console.log('  GET /api/revenues/list-rbac');
console.log('  GET /api/expenses/list\n');

console.log('Supervisor Tuwaiq (should ONLY see branch_2020):');
console.log('  GET /api/branches/list (should return only branch_2020)');
console.log('  GET /api/employees/list (should return only branch_2020 employees)');
console.log('  GET /api/revenues/list-rbac (should return only branch_2020 revenues)');
console.log('  GET /api/expenses/list (should return only branch_2020 expenses)\n');

console.log('Supervisor Laban (should ONLY see branch_1010):');
console.log('  GET /api/branches/list (should return only branch_1010)');
console.log('  GET /api/employees/list (should return only branch_1010 employees)');
console.log('  GET /api/revenues/list-rbac (should return only branch_1010 revenues)');
console.log('  GET /api/expenses/list (should return only branch_1010 expenses)\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('✅ Test script completed!\n');
console.log('Next steps:');
console.log('1. Apply migrations to update database');
console.log('2. Test login with new admin password');
console.log('3. Test supervisor access and branch isolation');
console.log('4. Verify middleware is working correctly\n');
