import type { APIRoute } from 'astro';
import {
  authenticateRequest,
  resolveBranchFilter,
  calculateStatusStats,
  createSuccessResponse,
  withErrorHandling
} from '@/lib/api-helpers';
import { employeeRequestQueries } from '@/lib/db';

export const GET: APIRoute = withErrorHandling(async ({ request, locals }) => {
  // Authenticate request with required permission
  const authResult = await authenticateRequest({
    kv: locals.runtime.env.SESSIONS,
    db: locals.runtime.env.DB,
    request,
    requiredPermission: 'canManageRequests'
  });

  if (authResult instanceof Response) {
    return authResult;
  }

  // Extract query parameters
  const url = new URL(request.url);
  const requestedBranchId = url.searchParams.get('branchId');
  const status = url.searchParams.get('status');

  // Resolve branch filtering (use session branch if not provided)
  const branchId = await resolveBranchFilter({
    session: authResult,
    requestedBranchId: requestedBranchId || authResult.branchId || 'BR001'
  });

  if (branchId instanceof Response) {
    return branchId;
  }

  // Get requests by branch
  const result = await employeeRequestQueries.getByBranch(
    locals.runtime.env.DB,
    branchId as string,
    status && status !== 'all' ? status : undefined
  );

  const requests = result.results || [];

  // Calculate statistics by status
  const stats = calculateStatusStats(requests);

  return createSuccessResponse({
    requests,
    count: requests.length,
    stats: {
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected
    }
  });
});
