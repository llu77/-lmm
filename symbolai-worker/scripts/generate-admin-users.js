/**
 * Generate Admin and Supervisor Users
 * Uses PBKDF2 with 100,000 iterations (matching password.ts)
 */

import crypto from 'crypto';

const ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

/**
 * Generate a random salt
 */
function generateSalt() {
  return crypto.randomBytes(SALT_LENGTH);
}

/**
 * Hash password using PBKDF2
 */
function pbkdf2Hash(password, salt) {
  if (!salt) {
    salt = generateSalt();
  }

  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    HASH_LENGTH,
    'sha256'
  );

  return {
    salt: salt.toString('hex'),
    hash: hash.toString('hex')
  };
}

/**
 * Hash a password for storage
 */
function hashPassword(password) {
  const { salt, hash } = pbkdf2Hash(password);
  return `${salt}:${hash}`;
}

// Users to create
const users = [
  {
    id: 'user_admin_main',
    username: 'Omar123',
    password: 'Omar101010',
    email: null,
    full_name: 'عمر - المدير الرئيسي',
    phone: null,
    role_id: 'role_admin',
    branch_id: null, // Admin can access all branches
    is_active: 1
  },
  {
    id: 'user_supervisor_laban_new',
    username: 'Aa123123',
    password: 'Aa12341234',
    email: 'Galalbdo766@gmail.com',
    full_name: 'عبدالحي جلال - مشرف فرع لبن',
    phone: '+966501234567',
    role_id: 'role_supervisor',
    branch_id: 'branch_1010',
    is_active: 1
  },
  {
    id: 'user_supervisor_tuwaiq_new',
    username: 'At123123',
    password: 'At123123',
    email: 'mohamedismaelebrhem@gmail.com',
    full_name: 'محمد إسماعيل - مشرف فرع طويق',
    phone: '+966501234568',
    role_id: 'role_supervisor',
    branch_id: 'branch_2020',
    is_active: 1
  }
];

// Generate SQL
console.log('-- =========================================');
console.log('-- Admin and Supervisor Users Migration');
console.log('-- Generated:', new Date().toISOString());
console.log('-- =========================================');
console.log('');
console.log('-- Delete old supervisors if they exist');
console.log("DELETE FROM users_new WHERE id IN ('user_supervisor_1010', 'user_supervisor_2020');");
console.log('');

users.forEach(user => {
  const hashedPassword = hashPassword(user.password);

  console.log(`-- User: ${user.username} (Password: ${user.password})`);
  console.log(`INSERT OR REPLACE INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)`);
  console.log(`VALUES ('${user.id}', '${user.username}', '${hashedPassword}', ${user.email ? `'${user.email}'` : 'NULL'}, '${user.full_name}', ${user.phone ? `'${user.phone}'` : 'NULL'}, '${user.role_id}', ${user.branch_id ? `'${user.branch_id}'` : 'NULL'}, ${user.is_active});`);
  console.log('');
});

console.log('-- =========================================');
console.log('-- Summary of Created Users');
console.log('-- =========================================');
console.log('-- Admin: 1');
console.log('--   Username: Omar123');
console.log('--   Password: Omar101010');
console.log('--   Role: Admin (full system access)');
console.log('--');
console.log('-- Supervisors: 2');
console.log('--   Laban Branch:');
console.log('--     Username: Aa123123');
console.log('--     Password: Aa12341234');
console.log('--     Email: Galalbdo766@gmail.com');
console.log('--     Receives: Laban branch notifications');
console.log('--');
console.log('--   Tuwaiq Branch:');
console.log('--     Username: At123123');
console.log('--     Password: At123123');
console.log('--     Email: mohamedismaelebrhem@gmail.com');
console.log('--     Receives: Tuwaiq branch notifications');
console.log('-- =========================================');
