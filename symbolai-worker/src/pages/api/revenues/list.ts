import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/session';
import { revenueQueries } from '@/lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const authResult = await requireAuth(locals.runtime.env.SESSIONS, request);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const url = new URL(request.url);
    const branchId = url.searchParams.get('branchId') || 'BR001';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const result = await revenueQueries.getByDateRange(
      locals.runtime.env.DB,
      branchId,
      startDate || defaultStartDate,
      endDate || defaultEndDate
    );

    return new Response(
      JSON.stringify({
        success: true,
        revenues: result.results || [],
        count: result.results?.length || 0
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List revenues error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
