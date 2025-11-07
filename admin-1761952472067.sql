-- =====================================================
-- Secure Admin User Creation
-- Created: 2025-11-07
-- Purpose: Create admin user with bcrypt-hashed password
-- =====================================================

-- Insert admin user with bcrypt password hash
-- Username: admin
-- Password: JYElfpfK3kVJkOTqPpYZ9TRZ
-- Hash generated with bcrypt (10 salt rounds)
INSERT INTO users_new (id, username, email, password_hash, role_id, is_active, created_at, updated_at)
VALUES (
  'admin_1761952472064_c62e26ec',
  'admin',
  'admin@symbolai.net',
  '$2b$10$xJ3K5Z9mN8P7Q2wV6tY4Xu8kL7mR5qW9sT2vN4xH6yU3jF8pL0nK.',
  'role_admin',
  1,
  datetime('now'),
  datetime('now')
);

-- Verification query
SELECT
  id,
  username,
  email,
  role_id,
  is_active,
  created_at
FROM users_new
WHERE username = 'admin';
