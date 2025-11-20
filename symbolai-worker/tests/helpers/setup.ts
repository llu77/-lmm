/**
 * Global Test Setup
 *
 * This file provides global setup and teardown for all tests.
 * It initializes mock Cloudflare bindings and test data.
 */

import { beforeEach, afterEach } from 'vitest';
import { createMockEnv } from '../mocks/cloudflare';
import { hashPassword } from '../../src/lib/password';

/**
 * Setup test database with seed data
 *
 * Creates test users with different authentication states:
 * - testuser: Active user with Argon2id password
 * - legacyuser: Active user with SHA-256 password (for migration testing)
 * - inactiveuser: Inactive user
 * - admin: Admin user with elevated permissions
 */
export async function setupTestDatabase(db: any) {
  const testUsers = [
    {
      id: 'user-1',
      username: 'testuser',
      password: await hashPassword('TestPass123!'),
      email: 'test@example.com',
      full_name: 'Test User',
      role_id: 'role-user',
      branch_id: 'branch-1',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'user-2',
      username: 'legacyuser',
      // SHA-256 hash of 'laban1010'
      password: '1efaaf2195720bd5bad0c2285df2db04065f9b989061bba9674032e0905629a5',
      email: 'legacy@example.com',
      full_name: 'Legacy User',
      role_id: 'role-user',
      branch_id: 'branch-1',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'user-3',
      username: 'inactiveuser',
      password: await hashPassword('TestPass123!'),
      email: 'inactive@example.com',
      full_name: 'Inactive User',
      role_id: 'role-user',
      branch_id: 'branch-1',
      is_active: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'admin-1',
      username: 'admin',
      password: await hashPassword('AdminPass123!'),
      email: 'admin@example.com',
      full_name: 'Admin User',
      role_id: 'role-admin',
      branch_id: null,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  db.seedData('users', testUsers);
}

/**
 * Global test setup - runs before each test
 */
beforeEach(async () => {
  const env = createMockEnv();
  await setupTestDatabase(env.DB);

  // Make env available globally for tests
  (globalThis as any).testEnv = env;
});

/**
 * Global test cleanup - runs after each test
 */
afterEach(() => {
  const env = (globalThis as any).testEnv;
  if (env && env.SESSIONS) {
    env.SESSIONS.clear();
  }
  if (env && env.CACHE) {
    env.CACHE.clear();
  }
});
