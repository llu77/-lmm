import type { APIRoute } from 'astro';
import {
  authenticateRequest,
  extractQueryParams,
  getDefaultDateRange,
  resolveBranchFilter,
  buildBranchFilteredQuery,
  calculateCategoryStats,
  createSuccessResponse,
  withErrorHandling
} from '@/lib/api-helpers';
import { logAudit, getClientIP } from '@/lib/permissions';

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
  const { branchId: requestedBranchId, startDate, endDate, category } = extractQueryParams(request);

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
  let baseQuery = `SELECT * FROM expenses WHERE date >= ? AND date <= ?`;
  const dateParams = [finalStartDate, finalEndDate];

  const { baseQuery: query, params } = buildBranchFilteredQuery(
    baseQuery,
    authResult,
    branchId,
    dateParams
  );

  let finalQuery = query;

  // Add category filter if specified
  if (category && category !== 'all') {
    finalQuery += ` AND category = ?`;
    params.push(category);
  }

  finalQuery += ` ORDER BY date DESC`;

  const result = await locals.runtime.env.DB.prepare(finalQuery)
    .bind(...params)
    .all();

  const expenses = result.results || [];

  // Calculate stats by category
  const statsByCategory = calculateCategoryStats(expenses);

  // Log audit
  await logAudit(
    locals.runtime.env.DB,
    authResult,
    'view',
    'expenses',
    'expenses_list',
    { count: expenses.length, branchId, category },
    getClientIP(request),
    request.headers.get('User-Agent') || undefined
  );

  return createSuccessResponse({
    expenses,
    count: expenses.length,
    statsByCategory
  });
});
