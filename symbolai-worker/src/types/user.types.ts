/**
 * User and Authentication Types
 * Core user management and permission types
 */

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'supervisor' | 'employee' | 'accountant';

/**
 * User permissions
 */
export interface UserPermissions {
  canManageUsers: boolean;
  canManageBranches: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canManagePayroll: boolean;
  canApproveRequests: boolean;
  canManageExpenses: boolean;
  canManageRevenues: boolean;
  canManageOrders: boolean;
  canAccessAdvancedFeatures: boolean;
}

/**
 * Core User interface
 */
export interface User {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  branchId: string;
  branchName?: string;
  permissions: UserPermissions;
  createdAt?: number;
  lastLogin?: number;
  isActive: boolean;
}

/**
 * User session data
 */
export interface UserSession {
  userId: string;
  username: string;
  role: UserRole;
  branchId: string;
  branchName: string;
  permissions: UserPermissions;
  expiresAt: number;
  createdAt: number;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
  branchId?: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  success: boolean;
  user?: User;
  session?: UserSession;
  error?: string;
}

/**
 * Helper to check if user has permission
 */
export function hasPermission(
  user: User | UserSession,
  permission: keyof UserPermissions
): boolean {
  return user.permissions[permission] === true;
}

/**
 * Helper to check if user is admin
 */
export function isAdmin(user: User | UserSession): boolean {
  return user.role === 'admin';
}

/**
 * Helper to check if user is supervisor
 */
export function isSupervisor(user: User | UserSession): boolean {
  return user.role === 'supervisor';
}

/**
 * Default permissions by role
 */
export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    canManageUsers: true,
    canManageBranches: true,
    canViewReports: true,
    canExportData: true,
    canManagePayroll: true,
    canApproveRequests: true,
    canManageExpenses: true,
    canManageRevenues: true,
    canManageOrders: true,
    canAccessAdvancedFeatures: true
  },
  supervisor: {
    canManageUsers: false,
    canManageBranches: false,
    canViewReports: true,
    canExportData: true,
    canManagePayroll: true,
    canApproveRequests: true,
    canManageExpenses: true,
    canManageRevenues: true,
    canManageOrders: true,
    canAccessAdvancedFeatures: false
  },
  accountant: {
    canManageUsers: false,
    canManageBranches: false,
    canViewReports: true,
    canExportData: true,
    canManagePayroll: true,
    canApproveRequests: false,
    canManageExpenses: true,
    canManageRevenues: true,
    canManageOrders: true,
    canAccessAdvancedFeatures: false
  },
  employee: {
    canManageUsers: false,
    canManageBranches: false,
    canViewReports: false,
    canExportData: false,
    canManagePayroll: false,
    canApproveRequests: false,
    canManageExpenses: false,
    canManageRevenues: false,
    canManageOrders: false,
    canAccessAdvancedFeatures: false
  }
};
