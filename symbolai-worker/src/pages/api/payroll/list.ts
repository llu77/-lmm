import type { APIRoute } from 'astro';
import type { PayrollRunRow } from '@/lib/finance/payroll-data';
import { fail, ok, resolveBranchId } from '@/lib/finance/http';
import { payrollAuth, serializeRun } from '@/lib/finance/payroll-runs';

// GET /api/payroll/list?branchId[&year]
// Payroll runs of a branch (newest period first), with totals and live voucher counts.
export const GET: APIRoute = async context => {
  const auth = await payrollAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const url = new URL(context.request.url);
  const branchId = resolveBranchId(session, url.searchParams.get('branchId'));
  if (branchId instanceof Response) return branchId;

  const yearParam = (url.searchParams.get('year') ?? '').trim();
  let year: number | null = null;
  if (yearParam) {
    year = Number(yearParam);
    if (!/^\d{4}$/.test(yearParam) || year < 2000 || year > 2100) return fail('السنة غير صحيحة', 400);
  }

  try {
    const result = await db
      .prepare(
        `SELECT r.*,
                (SELECT COUNT(*) FROM financial_vouchers fv
                  WHERE fv.source_type = 'payroll'
                    AND substr(fv.source_id, 1, length(r.id) + 1) = r.id || ':'
                    AND fv.status != 'cancelled') AS voucher_count
         FROM payroll_runs r
         WHERE r.branch_id = ? ${year ? 'AND r.period LIKE ?' : ''}
         ORDER BY r.period DESC, r.created_at DESC
         LIMIT 200`,
      )
      .bind(branchId, ...(year ? [`${year}-%`] : []))
      .all<PayrollRunRow & { voucher_count: number }>();

    return ok({ branchId, year, runs: (result.results ?? []).map(serializeRun) });
  } catch (error) {
    console.error('Payroll list failed:', error);
    return fail('حدث خطأ أثناء تحميل سجل الرواتب', 500);
  }
};
