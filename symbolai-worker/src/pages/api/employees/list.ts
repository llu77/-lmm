import type { APIRoute } from 'astro';
import {
  authenticateRequest,
  extractQueryParams,
  resolveBranchFilter,
  buildBranchFilteredQuery,
  createSuccessResponse,
  withErrorHandling
} from '@/lib/api-helpers';
import { employeeQueries } from '@/lib/db';

export const GET: APIRoute = withErrorHandling(async ({ request, locals }) => {
  // Authenticate request with required permission
  const authResult = await authenticateRequest({
    kv: locals.runtime.env.SESSIONS,
    db: locals.runtime.env.DB,
    request,
    requiredPermission: 'canViewReports'
  });

  if (authResult instanceof Response) {
    return authResult;
  }

  // Extract query parameters
  const { branchId: requestedBranchId, includeInactive } = extractQueryParams(request);

  // Resolve branch filtering
  const branchId = await resolveBranchFilter({
    session: authResult,
    requestedBranchId
  });

  if (branchId instanceof Response) {
    return branchId;
  }

  // Handle case where non-admin has no branch
  if (!branchId && !authResult.permissions.canViewAllBranches) {
    return createSuccessResponse({
      employees: [],
      count: 0,
      totalSalaryCost: 0
    });
  }

  // Build query with branch isolation
  let baseQuery = `SELECT * FROM employees WHERE 1=1`;

  // Apply active status filter
  if (!includeInactive) {
    baseQuery += ` AND is_active = 1`;
  }

  // Add branch filter
  const { baseQuery: query, params } = buildBranchFilteredQuery(
    baseQuery,
    authResult,
    branchId
  );

  const finalQuery = query + ` ORDER BY employee_name`;

  const stmt = locals.runtime.env.DB.prepare(finalQuery);
  const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

  let employees = result.results || [];

  // Calculate total salary cost
  const totalSalaryCost = employees.reduce((sum: number, e: any) => {
    return sum + (e.base_salary || 0) + (e.supervisor_allowance || 0) + (e.incentives || 0);
  }, 0);

  return createSuccessResponse({
    employees,
    count: employees.length,
    totalSalaryCost
  });
});
