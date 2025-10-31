import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/session';
import { employeeQueries } from '@/lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const authResult = await requireAuth(locals.runtime.env.SESSIONS, request);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const url = new URL(request.url);
    const branchId = url.searchParams.get('branchId') || 'BR001';
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    const result = await employeeQueries.getByBranch(locals.runtime.env.DB, branchId);

    let employees = result.results || [];

    // If includeInactive is false, filter only active employees
    if (!includeInactive) {
      employees = employees.filter((e: any) => e.is_active === 1);
    }

    // Calculate total salary cost
    const totalSalaryCost = employees.reduce((sum: number, e: any) => {
      return sum + (e.base_salary || 0) + (e.supervisor_allowance || 0) + (e.incentives || 0);
    }, 0);

    return new Response(
      JSON.stringify({
        success: true,
        employees,
        count: employees.length,
        totalSalaryCost
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List employees error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
