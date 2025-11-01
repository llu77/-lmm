import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/session';
import { analyzeFinancialData } from '@/lib/ai';
import { revenueQueries, expenseQueries } from '@/lib/db';
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const authResult = await requireAuth(locals.runtime.env.SESSIONS, request);
  if (authResult instanceof Response) {
    return authResult;
  }

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    request,
    locals.runtime.env.KV || locals.runtime.env.SESSIONS,
    RATE_LIMIT_PRESETS.ai_expensive
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { startDate, endDate, branchId = 'BR001' } = await request.json();

    // Fetch financial data
    const revenuesResult = await revenueQueries.getByDateRange(
      locals.runtime.env.DB,
      branchId,
      startDate,
      endDate
    );

    const expensesResult = await expenseQueries.getByDateRange(
      locals.runtime.env.DB,
      branchId,
      startDate,
      endDate
    );

    // Calculate totals
    const totalRevenue = revenuesResult.results?.reduce((sum: number, r: any) => sum + (r.total || 0), 0) || 0;
    const totalExpenses = expensesResult.results?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    const netProfit = totalRevenue - totalExpenses;

    // Group revenue by day
    const revenueByDay = revenuesResult.results?.map((r: any) => ({
      date: r.date,
      amount: r.total
    })) || [];

    // Group expenses by category
    const expensesByCategory: { [key: string]: number } = {};
    expensesResult.results?.forEach((e: any) => {
      const category = e.category || 'أخرى';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + e.amount;
    });

    const expensesByCategoryArray = Object.entries(expensesByCategory).map(([category, amount]) => ({
      category,
      amount: amount as number
    }));

    // Call AI analysis
    const analysis = await analyzeFinancialData(
      {
        AI: locals.runtime.env.AI,
        ANTHROPIC_API_KEY: locals.runtime.env.ANTHROPIC_API_KEY,
        AI_GATEWAY_ACCOUNT_ID: locals.runtime.env.AI_GATEWAY_ACCOUNT_ID,
        AI_GATEWAY_NAME: locals.runtime.env.AI_GATEWAY_NAME
      },
      {
        totalRevenue,
        totalExpenses,
        netProfit,
        revenueByDay,
        expensesByCategory: expensesByCategoryArray
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        data: {
          totalRevenue,
          totalExpenses,
          netProfit,
          revenueByDay,
          expensesByCategory: expensesByCategoryArray
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('AI analysis error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء التحليل' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
