import type { APIRoute } from 'astro';
import {
  authenticateRequest,
  resolveBranchFilter,
  buildBranchFilteredQuery,
  calculateStatusStats,
  createSuccessResponse,
  withErrorHandling
} from '@/lib/api-helpers';

export const GET: APIRoute = withErrorHandling(async ({ request, locals }) => {
  // Authenticate request with required permission
  const authResult = await authenticateRequest({
    kv: locals.runtime.env.SESSIONS,
    db: locals.runtime.env.DB,
    request,
    requiredPermission: 'canManageOrders'
  });

  if (authResult instanceof Response) {
    return authResult;
  }

  // Extract query parameters
  const url = new URL(request.url);
  const requestedBranchId = url.searchParams.get('branchId');
  const status = url.searchParams.get('status');
  const employeeName = url.searchParams.get('employeeName');
  const isDraft = url.searchParams.get('isDraft');

  // Resolve branch filtering (use session branch if not provided)
  const branchId = await resolveBranchFilter({
    session: authResult,
    requestedBranchId: requestedBranchId || authResult.branchId
  });

  if (branchId instanceof Response) {
    return branchId;
  }

  // Build base query with branch filtering
  let baseQuery = `SELECT * FROM product_orders WHERE 1=1`;
  const { baseQuery: query, params } = buildBranchFilteredQuery(
    baseQuery,
    authResult,
    branchId
  );

  let finalQuery = query;

  // Add additional filters
  if (status) {
    finalQuery += ` AND status = ?`;
    params.push(status);
  }

  if (employeeName) {
    finalQuery += ` AND employee_name LIKE ?`;
    params.push(`%${employeeName}%`);
  }

  if (isDraft !== null && isDraft !== undefined && isDraft !== '') {
    finalQuery += ` AND is_draft = ?`;
    params.push(isDraft === 'true' ? 1 : 0);
  }

  finalQuery += ` ORDER BY created_at DESC`;

  const stmt = locals.runtime.env.DB.prepare(finalQuery);
  const result = params.length > 0
    ? await stmt.bind(...params).all()
    : await stmt.all();

  const orders = (result.results || []).map((order: any) => ({
    ...order,
    products: JSON.parse(order.products || '[]')
  }));

  // Calculate statistics
  const statusStats = calculateStatusStats(orders);
  const stats = {
    ...statusStats,
    draft: orders.filter((o: any) => o.is_draft === 1).length,
    totalValue: orders.reduce((sum: number, o: any) => sum + (o.grand_total || 0), 0)
  };

  return createSuccessResponse({
    orders,
    stats
  });
});
