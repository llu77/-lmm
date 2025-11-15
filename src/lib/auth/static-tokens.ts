/**
 * Static Token Authentication System
 * LMM System - Cloudflare Workers Edition
 * 
 * @author llu77
 * @date 2025-11-15
 * @version 2.0.0
 */

// ============================================
// Types & Interfaces
// ============================================

export type UserRole = 'SUPER_ADMIN' | 'BRANCH_SUPERVISOR';
export type BranchType = 'LUBAN' | 'TUWAIQ';

export interface AdminAccount {
  username: string;
  role: UserRole;
  branch?: BranchType;
  permissions: string[];
  displayName: string;
  email: string;
}

export interface TokenValidationResult {
  valid: boolean;
  user?: AdminAccount;
  error?: string;
}

// ============================================
// Static Token Configuration
// ============================================

/**
 * System Users Configuration
 * Tokens are stored in Cloudflare environment variables
 */
export const SYSTEM_USERS: Record<string, Omit<AdminAccount, 'username'> & { tokenEnvKey: string }> = {
  'Omar101010': {
    role: 'SUPER_ADMIN',
    permissions: ['*'], // Full access to everything
    displayName: 'عمر - المدير العام',
    email: 'omar@symbolai.net',
    tokenEnvKey: 'OMAR_ADMIN_TOKEN'
  },
  'Aa101010': {
    role: 'BRANCH_SUPERVISOR',
    branch: 'LUBAN',
    permissions: [
      'view:luban_branch',
      'edit:luban_branch',
      'manage:luban_staff',
      'view:luban_reports',
      'manage:luban_attendance',
      'manage:luban_payroll',
      'view:luban_inventory'
    ],
    displayName: 'مشرف فرع لبن',
    email: 'luban.supervisor@symbolai.net',
    tokenEnvKey: 'AA_LUBAN_TOKEN'
  },
  'Mm101010': {
    role: 'BRANCH_SUPERVISOR',
    branch: 'TUWAIQ',
    permissions: [
      'view:tuwaiq_branch',
      'edit:tuwaiq_branch',
      'manage:tuwaiq_staff',
      'view:tuwaiq_reports',
      'manage:tuwaiq_attendance',
      'manage:tuwaiq_payroll',
      'view:tuwaiq_inventory'
    ],
    displayName: 'مشرف فرع طويق',
    email: 'tuwaiq.supervisor@symbolai.net',
    tokenEnvKey: 'MM_TUWAIQ_TOKEN'
  }
};

// ============================================
// Token Validation Functions
// ============================================

/**
 * Validates a static token against Cloudflare environment variables
 * 
 * @param token - The authentication token provided by the user
 * @param env - Cloudflare Workers environment bindings
 * @returns TokenValidationResult with user information if valid
 */
export async function validateStaticToken(
  token: string,
  env: any
): Promise<TokenValidationResult> {
  // Basic validation
  if (!token || typeof token !== 'string' || token.length < 32) {
    return {
      valid: false,
      error: 'Invalid token format'
    };
  }

  // Trim whitespace
  const cleanToken = token.trim();

  // Check against each user's token
  for (const [username, userConfig] of Object.entries(SYSTEM_USERS)) {
    const envToken = env[userConfig.tokenEnvKey];
    
    // Use constant-time comparison to prevent timing attacks
    if (envToken && await constantTimeCompare(cleanToken, envToken)) {
      return {
        valid: true,
        user: {
          username,
          role: userConfig.role,
          branch: userConfig.branch,
          permissions: userConfig.permissions,
          displayName: userConfig.displayName,
          email: userConfig.email
        }
      };
    }
  }

  return {
    valid: false,
    error: 'Invalid token'
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 * 
 * @param a - First string
 * @param b - Second string
 * @returns Promise<boolean> - True if strings are equal
 */
async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) {
    return false;
  }

  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  let result = 0;
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i];
  }

  return result === 0;
}

// ============================================
// Permission Checking Functions
// ============================================

/**
 * Checks if a user has a specific permission
 * 
 * @param user - The admin account to check
 * @param permission - The permission string to verify
 * @returns boolean - True if user has permission
 */
export function hasPermission(user: AdminAccount, permission: string): boolean {
  // Super admin has all permissions
  if (user.permissions.includes('*')) {
    return true;
  }

  // Check exact permission match
  if (user.permissions.includes(permission)) {
    return true;
  }

  // Check wildcard patterns (e.g., "view:*" matches "view:luban_branch")
  const hasWildcard = user.permissions.some(p => {
    if (p.endsWith(':*')) {
      const prefix = p.slice(0, -1);
      return permission.startsWith(prefix);
    }
    return false;
  });

  return hasWildcard;
}

/**
 * Checks if a user has access to a specific branch
 * 
 * @param user - The admin account to check
 * @param branch - The branch to verify access for
 * @returns boolean - True if user has access to the branch
 */
export function hasBranchAccess(user: AdminAccount, branch: BranchType): boolean {
  // Super admin has access to all branches
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Branch supervisors only have access to their assigned branch
  return user.branch === branch;
}

/**
 * Checks if a user has multiple permissions
 * 
 * @param user - The admin account to check
 * @param permissions - Array of permission strings to verify
 * @returns boolean - True if user has ALL permissions
 */
export function hasAllPermissions(user: AdminAccount, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Checks if a user has any of the specified permissions
 * 
 * @param user - The admin account to check
 * @param permissions - Array of permission strings to verify
 * @returns boolean - True if user has ANY permission
 */
export function hasAnyPermission(user: AdminAccount, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

// ============================================
// Utility Functions
// ============================================

/**
 * Gets all available branches for a user
 * 
 * @param user - The admin account
 * @returns BranchType[] - Array of accessible branches
 */
export function getAccessibleBranches(user: AdminAccount): BranchType[] {
  if (user.role === 'SUPER_ADMIN') {
    return ['LUBAN', 'TUWAIQ'];
  }

  return user.branch ? [user.branch] : [];
}

/**
 * Checks if a user is a super admin
 * 
 * @param user - The admin account
 * @returns boolean - True if user is super admin
 */
export function isSuperAdmin(user: AdminAccount): boolean {
  return user.role === 'SUPER_ADMIN';
}

/**
 * Gets user info by username (for internal use only)
 * 
 * @param username - The username to look up
 * @returns AdminAccount | null - User account or null if not found
 */
export function getUserByUsername(username: string): AdminAccount | null {
  const userConfig = SYSTEM_USERS[username];
  if (!userConfig) {
    return null;
  }

  return {
    username,
    role: userConfig.role,
    branch: userConfig.branch,
    permissions: userConfig.permissions,
    displayName: userConfig.displayName,
    email: userConfig.email
  };
}