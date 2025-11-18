import type { APIRoute } from 'astro';
import {
  authenticateRequest,
  resolveBranchFilter,
  createSuccessResponse,
  withErrorHandling
} from '@/lib/api-helpers';
import { bonusQueries } from '@/lib/db';

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
  const url = new URL(request.url);
  const requestedBranchId = url.searchParams.get('branchId');
  const month = url.searchParams.get('month');
  const year = url.searchParams.get('year');

  // Resolve branch filtering (use session branch if not provided)
  const branchId = await resolveBranchFilter({
    session: authResult,
    requestedBranchId: requestedBranchId || authResult.branchId || 'BR001'
  });

  if (branchId instanceof Response) {
    return branchId;
  }

  // Default to current month if not provided
  let finalMonth = month;
  let finalYear = year ? parseInt(year) : undefined;

  if (!finalMonth || !finalYear) {
    const now = new Date();
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    finalMonth = monthNames[now.getMonth()];
    finalYear = now.getFullYear();
  }

  const result = await bonusQueries.getByBranchAndPeriod(
    locals.runtime.env.DB,
    branchId as string,
    finalMonth,
    finalYear!
  );

  // Parse employee bonuses JSON
  const bonusRecords = (result.results || []).map((record: any) => ({
    ...record,
    employee_bonuses: record.employee_bonuses ? JSON.parse(record.employee_bonuses) : []
  }));

  return createSuccessResponse({
    bonusRecords,
    count: bonusRecords.length
  });
});
