/**
 * Test Data Factories
 *
 * Provides factory functions for generating consistent test data.
 * Follows the Factory pattern for test data creation.
 */

/**
 * User Factory
 *
 * Creates test user objects with sensible defaults.
 * Allows overriding any field via the overrides parameter.
 */
export const userFactory = {
  /**
   * Create a default user
   */
  default: (overrides: Record<string, any> = {}) => ({
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username: 'testuser',
    password: 'TestPass123!',
    email: 'test@example.com',
    full_name: 'Test User',
    role_id: 'role-user',
    branch_id: 'branch-1',
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Create an admin user
   */
  admin: (overrides: Record<string, any> = {}) =>
    userFactory.default({
      username: 'admin',
      email: 'admin@example.com',
      full_name: 'Admin User',
      role_id: 'role-admin',
      branch_id: null,
      ...overrides,
    }),

  /**
   * Create a user with legacy SHA-256 password
   */
  legacy: (overrides: Record<string, any> = {}) =>
    userFactory.default({
      username: 'legacyuser',
      email: 'legacy@example.com',
      full_name: 'Legacy User',
      // SHA-256 hash of 'laban1010'
      password: '1efaaf2195720bd5bad0c2285df2db04065f9b989061bba9674032e0905629a5',
      ...overrides,
    }),

  /**
   * Create an inactive user
   */
  inactive: (overrides: Record<string, any> = {}) =>
    userFactory.default({
      username: 'inactiveuser',
      email: 'inactive@example.com',
      full_name: 'Inactive User',
      is_active: 0,
      ...overrides,
    }),
};

/**
 * Session Factory
 *
 * Creates test session objects.
 */
export const sessionFactory = {
  default: (overrides: Record<string, any> = {}) => ({
    userId: 'user-1',
    username: 'testuser',
    role: 'user',
    createdAt: Date.now(),
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    ...overrides,
  }),

  admin: (overrides: Record<string, any> = {}) =>
    sessionFactory.default({
      userId: 'admin-1',
      username: 'admin',
      role: 'admin',
      ...overrides,
    }),

  expired: (overrides: Record<string, any> = {}) =>
    sessionFactory.default({
      createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      expiresAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
      ...overrides,
    }),
};

/**
 * Password Test Data
 *
 * Common passwords for testing validation
 */
export const passwordTestData = {
  valid: {
    strong: 'VeryStr0ng!P@ssw0rd',
    medium: 'Medium123!',
    weak: 'Weak123!',
    simple: 'Pass123!',
    long: 'ThisIsAVeryLongAndSecurePassword123!@#',
  },
  invalid: {
    tooShort: 'P@ss1',
    tooLong: 'a'.repeat(129),
    noUppercase: 'password123!',
    noLowercase: 'PASSWORD123!',
    noNumbers: 'Password!',
    noSpecial: 'Password123',
    onlyLowercase: 'password',
    empty: '',
  },
  legacy: {
    password: 'laban1010',
    // Correct SHA-256 hash of 'laban1010'
    sha256Hash: '1efaaf2195720bd5bad0c2285df2db04065f9b989061bba9674032e0905629a5',
  },
};

/**
 * API Request Factory
 *
 * Creates test API request bodies
 */
export const requestFactory = {
  login: (overrides: Record<string, any> = {}) => ({
    username: 'testuser',
    password: 'TestPass123!',
    ...overrides,
  }),

  createUser: (overrides: Record<string, any> = {}) => ({
    username: 'newuser',
    password: 'SecurePass123!',
    email: 'newuser@example.com',
    full_name: 'New User',
    role_id: 'role-user',
    branch_id: 'branch-1',
    ...overrides,
  }),
};
