/**
 * User Type Definitions
 * Centralized user types to avoid duplication across the codebase
 */

export interface UserPermissions {
  canViewAllBranches?: boolean;
  canManageUsers?: boolean;
  canManageSettings?: boolean;
  canManageBranches?: boolean;
  canAddRevenue?: boolean;
  canAddExpense?: boolean;
  canViewReports?: boolean;
  canManageEmployees?: boolean;
  canManageOrders?: boolean;
  canManageRequests?: boolean;
  canApproveRequests?: boolean;
  canGeneratePayroll?: boolean;
  canManageBonus?: boolean;
  canSubmitRequests?: boolean;
  canViewOwnRequests?: boolean;
  canViewOwnBonus?: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  role: string;
  roleAr?: string;
  branchId?: string;
  branchName?: string;
  permissions?: UserPermissions;
}
