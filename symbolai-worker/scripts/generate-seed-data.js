/**
 * Generate Seed Data with Proper Password Hashing
 * This script generates SQL INSERT statements with properly hashed passwords
 * Run with: node generate-seed-data.js > ../migrations/003_seed_branches_and_users_hashed.sql
 */

import crypto from 'crypto';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate seed data
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

const users = [
  // Supervisors
  {
    id: 'user_supervisor_1010',
    username: 'supervisor_laban',
    password: 'laban1010',
    email: 'supervisor.laban@symbolai.net',
    full_name: 'محمد أحمد - مشرف فرع لبن',
    phone: '+966501234567',
    role_id: 'role_supervisor',
    branch_id: 'branch_1010'
  },
  {
    id: 'user_supervisor_2020',
    username: 'supervisor_tuwaiq',
    password: 'tuwaiq2020',
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
    password: 'partner1010',
    email: 'partner.laban@symbolai.net',
    full_name: 'سعد عبدالرحمن - شريك فرع لبن',
    phone: '+966501234569',
    role_id: 'role_partner',
    branch_id: 'branch_1010'
  },
  {
    id: 'user_partner_2020',
    username: 'partner_tuwaiq',
    password: 'partner2020',
    email: 'partner.tuwaiq@symbolai.net',
    full_name: 'فيصل ناصر - شريك فرع طويق',
    phone: '+966501234570',
    role_id: 'role_partner',
    branch_id: 'branch_2020'
  },
  // Employees - Laban Branch (4 employees)
  {
    id: 'user_employee_1010_1',
    username: 'emp_laban_ahmad',
    password: 'emp1010',
    email: 'ahmad.ali@symbolai.net',
    full_name: 'أحمد علي - موظف فرع لبن',
    phone: '+966501234571',
    role_id: 'role_employee',
    branch_id: 'branch_1010'
  },
  {
    id: 'user_employee_1010_2',
    username: 'emp_laban_omar',
    password: 'emp1010',
    email: 'omar.hassan@symbolai.net',
    full_name: 'عمر حسن - موظف فرع لبن',
    phone: '+966501234572',
    role_id: 'role_employee',
    branch_id: 'branch_1010'
  },
  {
    id: 'user_employee_1010_3',
    username: 'emp_laban_fatima',
    password: 'emp1010',
    email: 'fatima.ahmed@symbolai.net',
    full_name: 'فاطمة أحمد - موظف فرع لبن',
    phone: '+966501234575',
    role_id: 'role_employee',
    branch_id: 'branch_1010'
  },
  {
    id: 'user_employee_1010_4',
    username: 'emp_laban_noura',
    password: 'emp1010',
    email: 'noura.khalid@symbolai.net',
    full_name: 'نورة خالد - موظف فرع لبن',
    phone: '+966501234576',
    role_id: 'role_employee',
    branch_id: 'branch_1010'
  },
  // Employees - Tuwaiq Branch (2 employees)
  {
    id: 'user_employee_2020_1',
    username: 'emp_tuwaiq_khalid',
    password: 'emp2020',
    email: 'khalid.salem@symbolai.net',
    full_name: 'خالد سالم - موظف فرع طويق',
    phone: '+966501234573',
    role_id: 'role_employee',
    branch_id: 'branch_2020'
  },
  {
    id: 'user_employee_2020_2',
    username: 'emp_tuwaiq_youssef',
    password: 'emp2020',
    email: 'youssef.fahad@symbolai.net',
    full_name: 'يوسف فهد - موظف فرع طويق',
    phone: '+966501234574',
    role_id: 'role_employee',
    branch_id: 'branch_2020'
  }
];

const employees = [
  // Laban Branch Employees (4 employees)
  { id: 'emp_rec_1010_1', branch_id: 'branch_1010', name: 'أحمد علي محمد', national_id: '1234567890', base_salary: 5000, supervisor_allowance: 0, incentives: 500 },
  { id: 'emp_rec_1010_2', branch_id: 'branch_1010', name: 'عمر حسن عبدالله', national_id: '1234567891', base_salary: 4500, supervisor_allowance: 0, incentives: 300 },
  { id: 'emp_rec_1010_3', branch_id: 'branch_1010', name: 'فاطمة أحمد سعيد', national_id: '1234567892', base_salary: 4000, supervisor_allowance: 0, incentives: 200 },
  { id: 'emp_rec_1010_4', branch_id: 'branch_1010', name: 'نورة خالد محمد', national_id: '1234567893', base_salary: 4200, supervisor_allowance: 0, incentives: 250 },
  // Tuwaiq Branch Employees (2 employees)
  { id: 'emp_rec_2020_1', branch_id: 'branch_2020', name: 'خالد سالم عبدالله', national_id: '2234567890', base_salary: 5200, supervisor_allowance: 0, incentives: 600 },
  { id: 'emp_rec_2020_2', branch_id: 'branch_2020', name: 'يوسف فهد أحمد', national_id: '2234567891', base_salary: 4800, supervisor_allowance: 0, incentives: 400 }
];

// Generate SQL
console.log('-- =========================================');
console.log('-- Seed Data for Branches and Users');
console.log('-- Generated with properly hashed passwords');
console.log('-- =========================================\n');

console.log('-- Insert Branches');
branches.forEach(branch => {
  console.log(`INSERT INTO branches (id, name, name_ar, location, phone, manager_name, is_active)`);
  console.log(`VALUES ('${branch.id}', '${branch.name}', '${branch.name_ar}', '${branch.location}', '${branch.phone}', '${branch.manager_name}', 1);`);
  console.log('');
});

console.log('\n-- Insert Users (Supervisors, Partners, Employees)');
users.forEach(user => {
  const hashedPassword = hashPassword(user.password);
  console.log(`-- User: ${user.username} (Password: ${user.password})`);
  console.log(`INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)`);
  console.log(`VALUES ('${user.id}', '${user.username}', '${hashedPassword}', '${user.email}', '${user.full_name}', '${user.phone}', '${user.role_id}', '${user.branch_id}', 1);`);
  console.log('');
});

console.log('\n-- Insert Employee Records');
employees.forEach(emp => {
  console.log(`INSERT INTO employees (id, branch_id, employee_name, national_id, base_salary, supervisor_allowance, incentives, is_active)`);
  console.log(`VALUES ('${emp.id}', '${emp.branch_id}', '${emp.name}', '${emp.national_id}', ${emp.base_salary}, ${emp.supervisor_allowance}, ${emp.incentives}, 1);`);
  console.log('');
});

console.log('\n-- =========================================');
console.log('-- Summary of Created Data');
console.log('-- =========================================');
console.log('-- Branches: 2 (Laban - 1010, Tuwaiq - 2020)');
console.log('-- Supervisors: 2 (1 per branch)');
console.log('-- Partners: 2 (1 per branch)');
console.log('-- Employee Users: 6 total (4 Laban + 2 Tuwaiq)');
console.log('-- Employee Records: 6 total (4 Laban + 2 Tuwaiq)');
console.log('--');
console.log('-- Branch Totals:');
console.log('-- Laban: 1 Supervisor + 4 Employees = 5 people');
console.log('-- Tuwaiq: 1 Supervisor + 2 Employees = 3 people');
console.log('--');
console.log('-- Login Credentials:');
console.log('-- Supervisor Laban: supervisor_laban / laban1010');
console.log('-- Supervisor Tuwaiq: supervisor_tuwaiq / tuwaiq2020');
console.log('-- Partner Laban: partner_laban / partner1010');
console.log('-- Partner Tuwaiq: partner_tuwaiq / partner2020');
console.log('-- Employees Laban: emp_laban_ahmad, emp_laban_omar, emp_laban_fatima, emp_laban_noura / emp1010');
console.log('-- Employees Tuwaiq: emp_tuwaiq_khalid, emp_tuwaiq_youssef / emp2020');
