// Role-based Access Control (RBAC) System
// Handles permissions, role checks, and branch isolation

import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

// =====================================================
// Interfaces
// =====================================================

export interface UserPermissions {
  userId: string;
  username: string;
  roleId: string;
  roleName: string;
  roleNameAr: string;
  branchId: string | null;
  branchName: string | null;

  // System-level permissions
  canViewAllBranches: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canManageBranches: boolean;

  // Branch-level permissions
  canAddRevenue: boolean;
  canAddExpense: boolean;
  canViewReports: boolean;
  canManageEmployees: boolean;
  canManageOrders: boolean;
  canManageRequests: boolean;
  canApproveRequests: boolean;
  canGeneratePayroll: boolean;
  canManageBonus: boolean;

  // Employee-specific permissions
  canSubmitRequests: boolean;
  canViewOwnRequests: boolean;
  canViewOwnBonus: boolean;
}

export interface EnhancedSession {
  userId: string;
  username: string;
  role: string;
  branchId: string | null;
  permissions: UserPermissions;
  createdAt: number;
  expiresAt: number;
}

// =====================================================
// Load User Permissions from Database
// =====================================================

export async function loadUserPermissions(
  db: D1Database,
  userId: string
): Promise<UserPermissions | null> {
  try {
    const result = await db.prepare(`
      SELECT
        u.id as userId,
        u.username,
        u.role_id as roleId,
        r.name as roleName,
        r.name_ar as roleNameAr,
        u.branch_id as branchId,
        b.name as branchName,
        -- System permissions
        r.can_view_all_branches as canViewAllBranches,
        r.can_manage_users as canManageUsers,
        r.can_manage_settings as canManageSettings,
        r.can_manage_branches as canManageBranches,
        -- Branch permissions
        r.can_add_revenue as canAddRevenue,
        r.can_add_expense as canAddExpense,
        r.can_view_reports as canViewReports,
        r.can_manage_employees as canManageEmployees,
        r.can_manage_orders as canManageOrders,
        r.can_manage_requests as canManageRequests,
        r.can_approve_requests as canApproveRequests,
        r.can_generate_payroll as canGeneratePayroll,
        r.can_manage_bonus as canManageBonus,
        -- Employee permissions
        r.can_submit_requests as canSubmitRequests,
        r.can_view_own_requests as canViewOwnRequests,
        r.can_view_own_bonus as canViewOwnBonus
      FROM users_new u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.id = ? AND u.is_active = 1
    `).bind(userId).first();

    if (!result) {
      return null;
    }

    return {
      userId: result.userId as string,
      username: result.username as string,
      roleId: result.roleId as string,
      roleName: result.roleName as string,
      roleNameAr: result.roleNameAr as string,
      branchId: result.branchId as string | null,
      branchName: result.branchName as string | null,

      canViewAllBranches: Boolean(result.canViewAllBranches),
      canManageUsers: Boolean(result.canManageUsers),
      canManageSettings: Boolean(result.canManageSettings),
      canManageBranches: Boolean(result.canManageBranches),

      canAddRevenue: Boolean(result.canAddRevenue),
      canAddExpense: Boolean(result.canAddExpense),
      canViewReports: Boolean(result.canViewReports),
      canManageEmployees: Boolean(result.canManageEmployees),
      canManageOrders: Boolean(result.canManageOrders),
      canManageRequests: Boolean(result.canManageRequests),
      canApproveRequests: Boolean(result.canApproveRequests),
      canGeneratePayroll: Boolean(result.canGeneratePayroll),
      canManageBonus: Boolean(result.canManageBonus),

      canSubmitRequests: Boolean(result.canSubmitRequests),
      canViewOwnRequests: Boolean(result.canViewOwnRequests),
      canViewOwnBonus: Boolean(result.canViewOwnBonus)
    };
  } catch (error) {
    console.error('Failed to load user permissions:', error);
    return null;
  }
}

// =====================================================
// Enhanced Authentication Middleware
// =====================================================

export async function requireAuthWithPermissions(
  kv: KVNamespace,
  db: D1Database,
  request: Request
): Promise<EnhancedSession | Response> {
  // Extract session token from cookies
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) {
    return new Response(
      JSON.stringify({ error: 'غير مصرح - يرجى تسجيل الدخول' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith('session='));

  if (!sessionCookie) {
    return new Response(
      JSON.stringify({ error: 'غير مصرح - يرجى تسجيل الدخول' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const token = sessionCookie.split('=')[1];

  // Get session from KV
  const sessionData = await kv.get(`session:${token}`, 'text');

  if (!sessionData) {
    return new Response(
      JSON.stringify({ error: 'جلسة منتهية - يرجى تسجيل الدخول مرة أخرى' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const session = JSON.parse(sessionData);

  // Check expiration
  if (session.expiresAt < Date.now()) {
    await kv.delete(`session:${token}`);
    return new Response(
      JSON.stringify({ error: 'جلسة منتهية - يرجى تسجيل الدخول مرة أخرى' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Load permissions from database
  const permissions = await loadUserPermissions(db, session.userId);

  if (!permissions) {
    return new Response(
      JSON.stringify({ error: 'مستخدم غير موجود أو غير نشط' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return {
    ...session,
    branchId: permissions.branchId,
    permissions
  };
}

// =====================================================
// Role-Based Middleware
// =====================================================

// Require Admin role
export async function requireAdminRole(
  kv: KVNamespace,
  db: D1Database,
  request: Request
): Promise<EnhancedSession | Response> {
  const result = await requireAuthWithPermissions(kv, db, request);

  if (result instanceof Response) {
    return result;
  }

  if (result.permissions.roleName !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'صلاحيات غير كافية - مطلوب صلاحيات الأدمن' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return result;
}

// Require Supervisor or Admin role
export async function requireSupervisorOrAdmin(
  kv: KVNamespace,
  db: D1Database,
  request: Request
): Promise<EnhancedSession | Response> {
  const result = await requireAuthWithPermissions(kv, db, request);

  if (result instanceof Response) {
    return result;
  }

  const allowedRoles = ['admin', 'supervisor'];
  if (!allowedRoles.includes(result.permissions.roleName)) {
    return new Response(
      JSON.stringify({ error: 'صلاحيات غير كافية - مطلوب صلاحيات مشرف أو أدمن' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return result;
}

// =====================================================
// Permission Checks
// =====================================================

export function checkPermission(
  session: EnhancedSession,
  permission: keyof Omit<UserPermissions, 'userId' | 'username' | 'roleId' | 'roleName' | 'roleNameAr' | 'branchId' | 'branchName'>
): boolean {
  return session.permissions[permission] === true;
}

export function requirePermission(
  session: EnhancedSession,
  permission: keyof Omit<UserPermissions, 'userId' | 'username' | 'roleId' | 'roleName' | 'roleNameAr' | 'branchId' | 'branchName'>
): Response | null {
  if (!checkPermission(session, permission)) {
    return new Response(
      JSON.stringify({ error: 'صلاحيات غير كافية لتنفيذ هذا الإجراء' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  return null;
}

// =====================================================
// Branch Isolation Helpers
// =====================================================

// Check if user can access specific branch
export function canAccessBranch(
  session: EnhancedSession,
  branchId: string
): boolean {
  // Admin can access all branches
  if (session.permissions.canViewAllBranches) {
    return true;
  }

  // Others can only access their own branch
  return session.branchId === branchId;
}

// Get allowed branch IDs for user
export function getAllowedBranchIds(session: EnhancedSession): string[] | null {
  // Admin can access all branches (return null to indicate all)
  if (session.permissions.canViewAllBranches) {
    return null;
  }

  // Others can only access their own branch
  if (session.branchId) {
    return [session.branchId];
  }

  // Employee without branch can't access any branch data
  return [];
}

// Validate branch access for API request
export function validateBranchAccess(
  session: EnhancedSession,
  requestedBranchId: string
): Response | null {
  if (!canAccessBranch(session, requestedBranchId)) {
    return new Response(
      JSON.stringify({ error: 'لا يمكنك الوصول إلى بيانات هذا الفرع' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  return null;
}

// Get SQL WHERE clause for branch isolation
export function getBranchFilterSQL(session: EnhancedSession): {
  clause: string;
  params: string[];
} {
  if (session.permissions.canViewAllBranches) {
    // Admin: no filter
    return { clause: '', params: [] };
  }

  if (session.branchId) {
    // Supervisor/Partner/Employee: filter by their branch
    return { clause: 'AND branch_id = ?', params: [session.branchId] };
  }

  // No branch: return impossible condition
  return { clause: 'AND 1 = 0', params: [] };
}

// =====================================================
// Audit Logging
// =====================================================

export async function logAudit(
  db: D1Database,
  session: EnhancedSession,
  action: 'create' | 'update' | 'delete' | 'view',
  entityType: string,
  entityId: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.prepare(`
      INSERT INTO audit_logs (id, user_id, username, role_name, branch_id, action, entity_type, entity_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      auditId,
      session.userId,
      session.username,
      session.permissions.roleName,
      session.branchId || null,
      action,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null,
      ipAddress || null,
      userAgent || null
    ).run();
  } catch (error) {
    console.error('Failed to log audit:', error);
    // Don't throw - audit logging failure shouldn't break the request
  }
}

// =====================================================
// Helper: Extract Client IP
// =====================================================

export function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0] ||
         'unknown';
}
