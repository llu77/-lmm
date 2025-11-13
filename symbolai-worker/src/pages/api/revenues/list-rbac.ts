import type { APIRoute } from 'astro';
import {
  authenticateRequest,
  extractQueryParams,
  getDefaultDateRange,
  resolveBranchFilter,
  buildBranchFilteredQuery,
  createSuccessResponse,
  withErrorHandling
} from '@/lib/api-helpers';

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
  const { branchId: requestedBranchId, startDate, endDate } = extractQueryParams(request);

  // Get default date range if not provided
  const { startDate: defaultStartDate, endDate: defaultEndDate } = getDefaultDateRange();
  const finalStartDate = startDate || defaultStartDate;
  const finalEndDate = endDate || defaultEndDate;

  // Resolve branch filtering
  const branchId = await resolveBranchFilter({
    session: authResult,
    requestedBranchId,
    allowEmpty: true
  });

  if (branchId instanceof Response) {
    return branchId;
  }

  // Build query with date range and branch filtering
  const baseQuery = `SELECT * FROM revenues WHERE date >= ? AND date <= ?`;
  const dateParams = [finalStartDate, finalEndDate];

  const { baseQuery: query, params } = buildBranchFilteredQuery(
    baseQuery,
    authResult,
    branchId,
    dateParams
  );

  const finalQuery = query + ` ORDER BY date DESC`;

  const stmt = locals.runtime.env.DB.prepare(finalQuery);
  const result = await stmt.bind(...params).all();

  return createSuccessResponse({
    revenues: result.results || [],
    count: result.results?.length || 0,
    userBranch: authResult.branchId,
    canViewAllBranches: authResult.permissions.canViewAllBranches
  });
});
