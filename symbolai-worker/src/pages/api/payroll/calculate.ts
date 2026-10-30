import type { APIRoute } from 'astro';
import { fail, getBranchName, ok, readJsonObject, resolveBranchId } from '@/lib/finance/http';
import { computeBranchPayroll, getOpenRun } from '@/lib/finance/payroll-data';
import { dailyRate, overtimeHourlyRate } from '@/lib/finance/payroll-engine';
import { periodLabelAr, periodLabelEn } from '@/lib/finance/catalog';
import { describeOrphans, payrollAuth, readPeriodInput, serializeRun } from '@/lib/finance/payroll-runs';

// POST /api/payroll/calculate {branchId, period}
// Live preview of the branch payroll for the period. Nothing is saved.
export const POST: APIRoute = async context => {
  const auth = await payrollAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  const branchId = resolveBranchId(session, body.branchId);
  if (branchId instanceof Response) return branchId;
  const period = readPeriodInput(body.period, body.month, body.year);
  if (!period) return fail('الفترة غير صحيحة — اختر الشهر والسنة', 400);

  try {
    const [computation, openRun, branchName] = await Promise.all([
      computeBranchPayroll(db, branchId, period),
      getOpenRun(db, branchId, period),
      getBranchName(db, branchId),
    ]);
    const orphans = await describeOrphans(db, branchId, computation.orphanAdjustments);
    const locked = openRun !== null && (openRun.status === 'approved' || openRun.status === 'paid');
    const differs = openRun !== null && openRun.fingerprint !== computation.fingerprint;

    return ok({
      branchId,
      branchName,
      period,
      periodLabelAr: periodLabelAr(period),
      periodLabelEn: periodLabelEn(period),
      employeeCount: computation.employeeCount,
      items: computation.items.map(item => ({
        ...item,
        dailyRate: dailyRate(item),
        overtimeHourlyRate: overtimeHourlyRate(item),
      })),
      totals: computation.totals,
      activeColumns: computation.activeColumns,
      fingerprint: computation.fingerprint,
      orphans,
      run: openRun ? serializeRun(openRun) : null,
      locked,
      /** The saved draft no longer matches the current data: it must be refreshed before approval. */
      stale: openRun?.status === 'draft' && differs,
      /** Data changed after approval but before payment (e.g. a salary edit); the approved sheet stays as approved. */
      changedSinceApproval: openRun?.status === 'approved' && differs,
    });
  } catch (error) {
    console.error('Payroll calculate failed:', error);
    return fail('حدث خطأ أثناء حساب الرواتب', 500);
  }
};
