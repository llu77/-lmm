/**
 * API Helper Functions
 * Reusable utilities for API endpoints to reduce code duplication
 */

import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type { EnhancedSession } from './permissions';
import {
  requireAuthWithPermissions,
  requirePermission,
  validateBranchAccess,
  getBranchFilterSQL,
  type UserPermissions
} from './permissions';

// =====================================================
// Standard API Response Types
// =====================================================

export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  [key: string]: any;
}

export interface ErrorResponse {
  success?: false;
  error: string;
}

// =====================================================
// Response Builders
// =====================================================

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T = any>(
  data: T,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({ success: true, ...data } as SuccessResponse<T>),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 500
): Response {
  return new Response(
    JSON.stringify({ error } as ErrorResponse),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Create a validation error response (400)
 */
export function createValidationError(message: string): Response {
  return createErrorResponse(message, 400);
}

/**
 * Create an unauthorized error response (401)
 */
export function createUnauthorizedError(
  message: string = 'غير مصرح - يرجى تسجيل الدخول'
): Response {
  return createErrorResponse(message, 401);
}

/**
 * Create a forbidden error response (403)
 */
export function createForbiddenError(
  message: string = 'صلاحيات غير كافية'
): Response {
  return createErrorResponse(message, 403);
}

/**
 * Create a not found error response (404)
 */
export function createNotFoundError(
  message: string = 'العنصر غير موجود'
): Response {
  return createErrorResponse(message, 404);
}

// =====================================================
// Authentication & Authorization Helpers
// =====================================================

export interface AuthOptions {
  kv: KVNamespace;
  db: D1Database;
  request: Request;
  requiredPermission?: keyof Omit<UserPermissions, 'userId' | 'username' | 'roleId' | 'roleName' | 'roleNameAr' | 'branchId' | 'branchName'>;
  requireAdmin?: boolean;
}

/**
 * Unified authentication and authorization check
 * Returns either the authenticated session or an error response
 */
export async function authenticateRequest(
  options: AuthOptions
): Promise<EnhancedSession | Response> {
  const { kv, db, request, requiredPermission, requireAdmin } = options;

  // Check authentication
  const authResult = await requireAuthWithPermissions(kv, db, request);

  if (authResult instanceof Response) {
    return authResult;
  }

  // Check admin requirement
  if (requireAdmin && authResult.permissions.roleName !== 'admin') {
    return createForbiddenError('صلاحيات غير كافية - مطلوب صلاحيات الأدمن');
  }

  // Check specific permission
  if (requiredPermission) {
    const permError = requirePermission(authResult, requiredPermission);
    if (permError) {
      return permError;
    }
  }

  return authResult;
}

// =====================================================
// Query Parameter Helpers
// =====================================================

export interface QueryParams {
  branchId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  category?: string | null;
  includeInactive?: boolean;
  [key: string]: any;
}

/**
 * Extract and parse query parameters from URL
 */
export function extractQueryParams(request: Request): QueryParams {
  const url = new URL(request.url);
  const params: QueryParams = {};

  // Common parameters
  params.branchId = url.searchParams.get('branchId');
  params.startDate = url.searchParams.get('startDate');
  params.endDate = url.searchParams.get('endDate');
  params.status = url.searchParams.get('status');
  params.category = url.searchParams.get('category');
  params.includeInactive = url.searchParams.get('includeInactive') === 'true';

  return params;
}

/**
 * Get default date range for current month
 */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  return { startDate, endDate };
}

// =====================================================
// Branch Filtering Helpers
// =====================================================

export interface BranchFilterOptions {
  session: EnhancedSession;
  requestedBranchId?: string | null;
  allowEmpty?: boolean;
}

/**
 * Resolve and validate branch ID for query
 * Returns the branch ID to use, or null for admin viewing all branches
 */
export async function resolveBranchFilter(
  options: BranchFilterOptions
): Promise<string | null | Response> {
  const { session, requestedBranchId, allowEmpty = false } = options;

  // If admin can view all branches and no specific branch requested
  if (session.permissions.canViewAllBranches && !requestedBranchId) {
    return null; // null means no filter, admin sees all
  }

  // If branch is requested, validate access
  if (requestedBranchId) {
    const branchError = validateBranchAccess(session, requestedBranchId);
    if (branchError) {
      return branchError;
    }
    return requestedBranchId;
  }

  // Use session's branch ID for non-admins
  if (session.branchId) {
    return session.branchId;
  }

  // No branch available
  if (!allowEmpty) {
    return createForbiddenError('لا يوجد فرع محدد للمستخدم');
  }

  return null;
}

/**
 * Build SQL query with branch filtering
 */
export interface QueryBuilder {
  baseQuery: string;
  params: any[];
}

export function buildBranchFilteredQuery(
  baseQuery: string,
  session: EnhancedSession,
  branchId: string | null,
  additionalParams: any[] = []
): QueryBuilder {
  let query = baseQuery;
  const params = [...additionalParams];

  if (branchId) {
    // Specific branch filter
    query += query.includes('WHERE') ? ' AND branch_id = ?' : ' WHERE branch_id = ?';
    params.push(branchId);
  } else if (!session.permissions.canViewAllBranches) {
    // Non-admin without branch: return impossible condition
    query += query.includes('WHERE') ? ' AND 1 = 0' : ' WHERE 1 = 0';
  }

  return { baseQuery: query, params };
}

// =====================================================
// Statistics Calculation Helpers
// =====================================================

/**
 * Calculate statistics by status
 */
export function calculateStatusStats<T extends { status: string }>(
  items: T[]
): Record<string, number> {
  const stats: Record<string, number> = {
    total: items.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0
  };

  items.forEach(item => {
    if (item.status && Object.prototype.hasOwnProperty.call(stats, item.status)) {
      stats[item.status]++;
    }
  });

  return stats;
}

/**
 * Calculate statistics by category with totals
 */
export function calculateCategoryStats<T extends { category?: string; amount: number }>(
  items: T[]
): Record<string, { count: number; total: number }> {
  const stats: Record<string, { count: number; total: number }> = {};

  items.forEach(item => {
    const category = item.category || 'أخرى';
    if (!stats[category]) {
      stats[category] = { count: 0, total: 0 };
    }
    stats[category].count++;
    stats[category].total += item.amount || 0;
  });

  return stats;
}

/**
 * Calculate total amount from items
 */
export function calculateTotalAmount<T extends { amount?: number }>(
  items: T[]
): number {
  return items.reduce((sum, item) => sum + (item.amount || 0), 0);
}

// =====================================================
// Request Body Validation
// =====================================================

/**
 * Parse and validate JSON request body
 */
export async function parseRequestBody<T = any>(
  request: Request
): Promise<T | Response> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    return createValidationError('بيانات غير صالحة في الطلب');
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields<T extends Record<string, any>>(
  body: T,
  requiredFields: (keyof T)[]
): Response | null {
  const missingFields = requiredFields.filter(field => !body[field]);

  if (missingFields.length > 0) {
    return createValidationError(
      `الحقول المطلوبة غير موجودة: ${missingFields.join(', ')}`
    );
  }

  return null;
}

// =====================================================
// Error Handling
// =====================================================

/**
 * Wrap async API handler with error handling
 */
export function withErrorHandling(
  handler: (request: Request, locals: any) => Promise<Response>
) {
  return async (request: Request, locals: any): Promise<Response> => {
    try {
      return await handler(request, locals);
    } catch (error) {
      console.error('API Error:', error);
      return createErrorResponse('حدث خطأ أثناء معالجة الطلب');
    }
  };
}
