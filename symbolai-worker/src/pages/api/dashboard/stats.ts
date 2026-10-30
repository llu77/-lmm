import type { APIRoute } from 'astro';
import { canAccessBranch } from '@/lib/permissions';
import { financeAuth, fail } from '@/lib/finance/http';
import { todayIso } from '@/lib/finance/catalog';

// Dashboard KPIs for the selected branch (or every branch for users who can
// see all branches and picked none). Previously hardcoded to a non-existent
// 'BR001' branch and queried notification columns missing from the live schema.
export const GET: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const requested = new URL(context.request.url).searchParams.get('branchId')?.trim() || '';
  let branchIds: string[] | null; // null = all branches
  if (requested) {
    if (!canAccessBranch(session, requested)) return fail('لا يمكنك الوصول إلى بيانات هذا الفرع', 403);
    branchIds = [requested];
  } else if (session.permissions.canViewAllBranches) {
    branchIds = null;
  } else if (session.branchId) {
    branchIds = [session.branchId];
  } else {
    return fail('لا يوجد فرع محدد للمستخدم', 403);
  }

  try {
    const today = todayIso();
    const startDate = `${today.slice(0, 8)}01`;
    const [y, m] = today.split('-').map(Number);
    const endDate = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);

    const branchFilter = branchIds ? `AND branch_id IN (${branchIds.map(() => '?').join(', ')})` : '';
    const branchParams = branchIds ?? [];

    const [revenues, expenses, employees, notifications] = await Promise.all([
      db.prepare(`SELECT * FROM revenues WHERE date >= ? AND date <= ? ${branchFilter} ORDER BY date DESC`)
        .bind(startDate, endDate, ...branchParams).all<Record<string, any>>(),
      db.prepare(`SELECT * FROM expenses WHERE date >= ? AND date <= ? ${branchFilter} ORDER BY date DESC`)
        .bind(startDate, endDate, ...branchParams).all<Record<string, any>>()
        .catch(() => ({ results: [] as Record<string, any>[] })),
      db.prepare(`SELECT id FROM employees WHERE is_active = 1 ${branchFilter}`)
        .bind(...branchParams).all(),
      db.prepare(`SELECT id, type, severity, title, message, link, created_at FROM user_notifications
                  WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 10`)
        .bind(session.userId).all(),
    ]);

    const revenueRows = revenues.results ?? [];
    const expenseRows = expenses.results ?? [];
    const sum = (rows: Record<string, any>[], field: string) =>
      Math.round(rows.reduce((acc, r) => acc + (Number(r[field]) || 0) * 100, 0)) / 100;

    const totalRevenue = sum(revenueRows, 'total');
    const totalExpenses = sum(expenseRows, 'amount');
    const mismatchedCount = revenueRows.filter(r => r.is_matched === 0).length;

    const chartData = [];
    const dayFormat = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    for (let i = 6; i >= 0; i--) {
      const date = new Date(`${today}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayRevenue = sum(revenueRows.filter(r => r.date === dateStr), 'total');
      const dayExpense = sum(expenseRows.filter(e => e.date === dateStr), 'amount');
      chartData.push({
        date: dateStr,
        dateAr: dayFormat.format(date),
        revenue: dayRevenue,
        expense: dayExpense,
        profit: Math.round((dayRevenue - dayExpense) * 100) / 100,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          totalRevenue,
          totalExpenses,
          netProfit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
          employeeCount: employees.results?.length ?? 0,
          mismatchedCount,
        },
        chartData,
        recentActivities: [
          ...revenueRows.slice(0, 3).map(r => ({ type: 'revenue', title: `إيراد بتاريخ ${r.date}`, amount: r.total, date: r.created_at })),
          ...expenseRows.slice(0, 3).map(e => ({ type: 'expense', title: e.title, amount: e.amount, date: e.created_at })),
        ],
        notifications: notifications.results ?? [],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return fail('حدث خطأ أثناء جلب البيانات', 500);
  }
};
