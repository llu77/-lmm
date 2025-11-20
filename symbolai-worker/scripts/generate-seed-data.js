#!/usr/bin/env node

/**
 * Generate Seed Data - SECURE VERSION
 *
 * ⚠️  SECURITY NOTICE:
 * This script NO LONGER contains hardcoded passwords.
 * Passwords must be set manually via admin panel after initial setup.
 *
 * For generating secure passwords, use:
 *   node scripts/generate-secure-passwords.js
 *
 * This script generates SQL INSERT statements for:
 * - Branches
 * - Roles
 * - Users (WITHOUT passwords)
 *
 * Run with:
 *   node generate-seed-data.js > ../migrations/003_seed_branches_and_users.sql
 *
 * @version 2.0 - SECURE (No hardcoded passwords)
 * @author SymbolAI Security Team
 * @date 2025-11-20
 */

import crypto from 'crypto';

// =====================================================
// Branch Data
// =====================================================

const branches = [
  {
    id: 'branch_1010',
    name: 'Laban Branch',
    name_ar: 'فرع لبن',
    location: 'Riyadh - Laban District',
    phone: '+966501234567',
    manager_name: 'محمد أحمد'
  },
  {
    id: 'branch_2020',
    name: 'Tuwaiq Branch',
    name_ar: 'فرع طويق',
    location: 'Riyadh - Tuwaiq District',
    phone: '+966501234568',
    manager_name: 'عبدالله خالد'
  }
];

// =====================================================
// User Data (WITHOUT PASSWORDS)
// =====================================================

const users = [
  // Supervisors
  {
    id: 'user_supervisor_1010',
    username: 'supervisor_laban',
    password: null, // ⚠️ Must be set via admin panel
    email: 'supervisor.laban@symbolai.net',
    full_name: 'محمد أحمد - مشرف فرع لبن',
    phone: '+966501234567',
    role_id: 'role_supervisor',
    branch_id: 'branch_1010'
  },
  {
    id: 'user_supervisor_2020',
    username: 'supervisor_tuwaiq',
    password: null, // ⚠️ Must be set via admin panel
    email: 'supervisor.tuwaiq@symbolai.net',
    full_name: 'عبدالله خالد - مشرف فرع طويق',
    phone: '+966501234568',
    role_id: 'role_supervisor',
    branch_id: 'branch_2020'
  },
  // Partners
  {
    id: 'user_partner_1010',
    username: 'partner_laban',
    password: null, // ⚠️ Must be set via admin panel
    email: 'partner.laban@symbolai.net',
    full_name: 'سعد عبدالرحمن - شريك فرع لبن',
    phone: '+966501234569',
    role_id: 'role_partner',
    branch_id: 'branch_1010'
  },
  {
    id: 'user_partner_2020',
    username: 'partner_tuwaiq',
    password: null, // ⚠️ Must be set via admin panel
    email: 'partner.tuwaiq@symbolai.net',
    full_name: 'فيصل ناصر - شريك فرع طويق',
    phone: '+966501234570',
    role_id: 'role_partner',
    branch_id: 'branch_2020'
  },
  // Employees - Laban Branch
  {
    id: 'user_employee_1010_1',
    username: 'emp_laban_ahmad',
    password: null, // ⚠️ Must be set via admin panel
    email: 'ahmad.ali@symbolai.net',
    full_name: 'أحمد علي - موظف فرع لبن',
    phone: '+966501234571',
    role_id: 'role_employee',
    branch_id: 'branch_1010'
  },
  {
    id: 'user_employee_1010_2',
    username: 'emp_laban_omar',
    password: null, // ⚠️ Must be set via admin panel
    email: 'omar.hassan@symbolai.net',
    full_name: 'عمر حسن - موظف فرع لبن',
    phone: '+966501234572',
    role_id: 'role_employee',
    branch_id: 'branch_1010'
  },
  {
    id: 'user_employee_1010_3',
    username: 'emp_laban_fatima',
    password: null, // ⚠️ Must be set via admin panel
    email: 'fatima.mohammed@symbolai.net',
    full_name: 'فاطمة محمد - موظفة فرع لبن',
    phone: '+966501234573',
    role_id: 'role_employee',
    branch_id: 'branch_1010'
  },
  {
    id: 'user_employee_1010_4',
    username: 'emp_laban_sara',
    password: null, // ⚠️ Must be set via admin panel
    email: 'sara.ahmed@symbolai.net',
    full_name: 'سارة أحمد - موظفة فرع لبن',
    phone: '+966501234574',
    role_id: 'role_employee',
    branch_id: 'branch_1010'
  },
  // Employees - Tuwaiq Branch
  {
    id: 'user_employee_2020_1',
    username: 'emp_tuwaiq_khalid',
    password: null, // ⚠️ Must be set via admin panel
    email: 'khalid.abdullah@symbolai.net',
    full_name: 'خالد عبدالله - موظف فرع طويق',
    phone: '+966501234575',
    role_id: 'role_employee',
    branch_id: 'branch_2020'
  },
  {
    id: 'user_employee_2020_2',
    username: 'emp_tuwaiq_sara',
    password: null, // ⚠️ Must be set via admin panel
    email: 'sara.khalid@symbolai.net',
    full_name: 'سارة خالد - موظفة فرع طويق',
    phone: '+966501234576',
    role_id: 'role_employee',
    branch_id: 'branch_2020'
  },
  {
    id: 'user_employee_2020_3',
    username: 'emp_tuwaiq_fatima',
    password: null, // ⚠️ Must be set via admin panel
    email: 'fatima.ali@symbolai.net',
    full_name: 'فاطمة علي - موظفة فرع طويق',
    phone: '+966501234577',
    role_id: 'role_employee',
    branch_id: 'branch_2020'
  },
  {
    id: 'user_employee_2020_4',
    username: 'emp_tuwaiq_mohammed',
    password: null, // ⚠️ Must be set via admin panel
    email: 'mohammed.saad@symbolai.net',
    full_name: 'محمد سعد - موظف فرع طويق',
    phone: '+966501234578',
    role_id: 'role_employee',
    branch_id: 'branch_2020'
  }
];

// =====================================================
// SQL Generation Functions
// =====================================================

function generateBranchesSQL() {
  let sql = `-- Insert Branches\n`;
  sql += `-- Generated at: ${new Date().toISOString()}\n\n`;

  branches.forEach(branch => {
    sql += `INSERT INTO branches (id, name, name_ar, location, phone, manager_name)\n`;
    sql += `VALUES ('${branch.id}', '${branch.name}', '${branch.name_ar}', '${branch.location}', '${branch.phone}', '${branch.manager_name}');\n\n`;
  });

  return sql;
}

function generateUsersSQL() {
  let sql = `-- Insert Users (WITHOUT PASSWORDS)\n`;
  sql += `-- ⚠️  IMPORTANT: Passwords must be set via admin panel\n`;
  sql += `-- Use: node scripts/generate-secure-passwords.js to generate secure passwords\n`;
  sql += `-- Generated at: ${new Date().toISOString()}\n\n`;

  users.forEach(user => {
    // Note: password field is left as empty string, must be set via admin panel
    sql += `INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)\n`;
    sql += `VALUES ('${user.id}', '${user.username}', '', `; // Empty password
    sql += `'${user.email}', '${user.full_name}', '${user.phone}', `;
    sql += `'${user.role_id}', '${user.branch_id}', 0);\n`; // is_active = 0 until password is set
    sql += `-- ⚠️  User '${user.username}' must have password set before activation\n\n`;
  });

  return sql;
}

function generateWarningSQL() {
  return `
-- =====================================================
-- SECURITY NOTICE
-- =====================================================
--
-- ⚠️  All users created with EMPTY passwords
-- ⚠️  Users are INACTIVE (is_active = 0) until passwords are set
--
-- Next Steps:
-- 1. Run: node scripts/generate-secure-passwords.js
-- 2. Use admin panel to set passwords for all users
-- 3. Activate users after passwords are set
--
-- DO NOT use hardcoded passwords in source code!
-- =====================================================

`;
}

// =====================================================
// Main Script
// =====================================================

function main() {
  console.log('-- =====================================================');
  console.log('-- SymbolAI Seed Data - SECURE VERSION');
  console.log('-- Generated at: ' + new Date().toISOString());
  console.log('-- =====================================================');
  console.log('');

  console.log(generateWarningSQL());
  console.log(generateBranchesSQL());
  console.log(generateUsersSQL());

  console.error(''); // Log to stderr (won't appear in SQL output)
  console.error('✅ Seed data generated successfully!');
  console.error('');
  console.error('⚠️  IMPORTANT NEXT STEPS:');
  console.error('   1. Run: node scripts/generate-secure-passwords.js');
  console.error('   2. Set passwords via admin panel');
  console.error('   3. Activate users after passwords are set');
  console.error('');
}

// Run the script
main();
