import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/session';
import { revenueQueries, expenseQueries, employeeQueries, notificationQueries } from '@/lib/db';
import { formatDate } from '@/lib/utils';

export const GET: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const authResult = await requireAuth(locals.runtime.env.SESSIONS, request);
  if (authResult instanceof Response) {
    return authResult;
  }

  const session = authResult;

  try {
    // Get date range for current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startDate = firstDayOfMonth.toISOString().split('T')[0];
    const endDate = lastDayOfMonth.toISOString().split('T')[0];

    // For demo purposes, using a default branch "BR001"
    // In production, get from user's session or preferences
    const branchId = 'BR001';

    // Fetch revenues for current month
    const revenuesResult = await revenueQueries.getByDateRange(
      locals.runtime.env.DB,
      branchId,
      startDate,
      endDate
    );

    // Fetch expenses for current month
    const expensesResult = await expenseQueries.getByDateRange(
      locals.runtime.env.DB,
      branchId,
      startDate,
      endDate
    );

    // Fetch employees
    const employeesResult = await employeeQueries.getByBranch(
      locals.runtime.env.DB,
      branchId
    );

    // Fetch notifications
    const notificationsResult = await notificationQueries.getByBranch(
      locals.runtime.env.DB,
      branchId,
      false // Only unread
    );

    // Calculate totals
    const totalRevenue = revenuesResult.results?.reduce((sum: number, r: any) => sum + (r.total || 0), 0) || 0;
    const totalExpenses = expensesResult.results?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
    const netProfit = totalRevenue - totalExpenses;
    const employeeCount = employeesResult.results?.length || 0;

    // Count mismatched revenues
    const mismatchedCount = revenuesResult.results?.filter((r: any) => r.is_matched === 0).length || 0;

    // Prepare chart data (last 7 days)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayRevenue = revenuesResult.results
        ?.filter((r: any) => r.date === dateStr)
        .reduce((sum: number, r: any) => sum + (r.total || 0), 0) || 0;

      const dayExpense = expensesResult.results
        ?.filter((e: any) => e.date === dateStr)
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;

      chartData.push({
        date: dateStr,
        dateAr: new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short' }).format(date),
        revenue: dayRevenue,
        expense: dayExpense,
        profit: dayRevenue - dayExpense
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          totalRevenue,
          totalExpenses,
          netProfit,
          employeeCount,
          mismatchedCount
        },
        chartData,
        recentActivities: [
          ...revenuesResult.results?.slice(0, 3).map((r: any) => ({
            type: 'revenue',
            title: `إيراد بتاريخ ${r.date}`,
            amount: r.total,
            date: r.created_at
          })) || [],
          ...expensesResult.results?.slice(0, 3).map((e: any) => ({
            type: 'expense',
            title: e.title,
            amount: e.amount,
            date: e.created_at
          })) || []
        ],
        notifications: notificationsResult.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
