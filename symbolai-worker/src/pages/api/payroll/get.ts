import type { APIRoute } from 'astro';
import { fail, ok } from '@/lib/finance/http';
import { computeBranchPayroll } from '@/lib/finance/payroll-data';
import { loadRunForUser, loadRunItems, loadRunVouchers, payrollAuth, serializeRun } from '@/lib/finance/payroll-runs';

// GET /api/payroll/get?id
// A saved run with its sheet rows (lines and warnings parsed) and its vouchers.
export const GET: APIRoute = async context => {
  const auth = await payrollAuth(context);
  if (auth instanceof Response) return auth;
  const { db } = auth;

  const url = new URL(context.request.url);

  try {
    const run = await loadRunForUser(auth, url.searchParams.get('id'));
    if (run instanceof Response) return run;

    const [items, vouchers] = await Promise.all([loadRunItems(db, run.id), loadRunVouchers(db, run.id)]);

    // Does the saved sheet still match the live data? (informational)
    let differs: boolean | null = null;
    if (run.status === 'draft' || run.status === 'approved') {
      try {
        const live = await computeBranchPayroll(db, run.branch_id, run.period);
        differs = live.fingerprint !== run.fingerprint;
      } catch (error) {
        console.error('Payroll get: live recompute failed:', error);
      }
    }

    const serialized = serializeRun({
      ...run,
      voucher_count: vouchers.filter(v => v.status !== 'cancelled').length,
    });
    return ok({
      run: serialized,
      items,
      totals: serialized.totals,
      activeColumns: serialized.activeColumns,
      vouchers,
      stale: run.status === 'draft' && differs === true,
      changedSinceApproval: run.status === 'approved' && differs === true,
    });
  } catch (error) {
    console.error('Payroll get failed:', error);
    return fail('حدث خطأ أثناء تحميل مسير الرواتب', 500);
  }
};
