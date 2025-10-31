import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/session';
import { expenseQueries } from '@/lib/db';

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
    const category = url.searchParams.get('category');

    // Default to current month if no dates provided
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const result = await expenseQueries.getByDateRange(
      locals.runtime.env.DB,
      branchId,
      startDate || defaultStartDate,
      endDate || defaultEndDate
    );

    let expenses = result.results || [];

    // Filter by category if provided
    if (category && category !== 'all') {
      expenses = expenses.filter((e: any) => e.category === category);
    }

    // Calculate stats by category
    const statsByCategory: { [key: string]: { count: number; total: number } } = {};
    expenses.forEach((e: any) => {
      const cat = e.category || 'أخرى';
      if (!statsByCategory[cat]) {
        statsByCategory[cat] = { count: 0, total: 0 };
      }
      statsByCategory[cat].count++;
      statsByCategory[cat].total += e.amount;
    });

    return new Response(
      JSON.stringify({
        success: true,
        expenses,
        count: expenses.length,
        statsByCategory
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List expenses error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
