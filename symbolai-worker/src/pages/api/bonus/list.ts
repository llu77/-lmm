import type { APIRoute } from 'astro';
import { requireAuthWithPermissions, requirePermission, validateBranchAccess } from '@/lib/permissions';
import { bonusQueries } from '@/lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  // Check authentication with permissions
  const authResult = await requireAuthWithPermissions(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  // Check permission to view reports (needed to view bonus)
  const permError = requirePermission(authResult, 'canViewReports');
  if (permError) {
    return permError;
  }

  try {
    const url = new URL(request.url);
    let branchId = url.searchParams.get('branchId');
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');

    // If no branchId provided, use user's branch
    if (!branchId) {
      branchId = authResult.permissions.branchId || 'BR001';
    }

    // Validate branch access if branchId is specified
    if (branchId) {
      const branchError = validateBranchAccess(authResult, branchId);
      if (branchError) {
        return branchError;
      }
    }

    if (!month || !year) {
      // Default to current month
      const now = new Date();
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];

      const result = await bonusQueries.getByBranchAndPeriod(
        locals.runtime.env.DB,
        branchId,
        monthNames[now.getMonth()],
        now.getFullYear()
      );

      return new Response(
        JSON.stringify({
          success: true,
          bonusRecords: result.results || [],
          count: result.results?.length || 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await bonusQueries.getByBranchAndPeriod(
      locals.runtime.env.DB,
      branchId,
      month,
      parseInt(year)
    );

    // Parse employee bonuses JSON
    const bonusRecords = (result.results || []).map((record: any) => ({
      ...record,
      employee_bonuses: record.employee_bonuses ? JSON.parse(record.employee_bonuses) : []
    }));

    return new Response(
      JSON.stringify({
        success: true,
        bonusRecords,
        count: bonusRecords.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List bonus error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
