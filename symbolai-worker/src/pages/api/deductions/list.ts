// GET /api/deductions/list?branchId[&period=YYYY-MM | &month&year | &year][&employeeId]
// Backward-compatible listing: active deduction entries of the payroll
// adjustments ledger (everything except advances) plus rows still in the
// legacy `deductions` table, scoped to one branch. Defaults to the current
// month. New code should use /api/adjustments/list.

import type { APIRoute } from 'astro';
import { fromMinor, toMinor } from '@/lib/finance/money';
import { fail, financeAuth, ok, resolveBranchId } from '@/lib/finance/http';
import { canViewAdjustments } from '../adjustments/create';
import { compatPeriods, loadCompatRows, sumAmounts } from '../advances/list';

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;
  if (!canViewAdjustments(session)) return fail('صلاحيات غير كافية لعرض بيانات الرواتب', 403);

  const url = new URL(context.request.url);
  const branchId = resolveBranchId(session, url.searchParams.get('branchId'));
  if (branchId instanceof Response) return branchId;
  const periods = compatPeriods(url);
  if (!periods) return fail('الشهر أو السنة غير صالحة', 400);

  try {
    const rows = await loadCompatRows(db, branchId, periods, 'deductions', (url.searchParams.get('employeeId') ?? '').trim());
    const deductions = rows.map(row => ({ ...row, reason: row.description, deduction_type: row.category_label }));

    const byTypeMinor = new Map<string, { count: number; minor: number }>();
    for (const row of deductions) {
      const entry = byTypeMinor.get(row.deduction_type) ?? { count: 0, minor: 0 };
      entry.count++;
      entry.minor += toMinor(row.amount);
      byTypeMinor.set(row.deduction_type, entry);
    }
    const byType = Object.fromEntries(
      [...byTypeMinor].map(([type, v]) => [type, { count: v.count, total: fromMinor(v.minor) }]),
    );

    return ok({ deductions, count: deductions.length, total: sumAmounts(deductions), byType });
  } catch (error) {
    console.error('List deductions error:', error);
    return fail('حدث خطأ أثناء تحميل الخصومات', 500);
  }
};
