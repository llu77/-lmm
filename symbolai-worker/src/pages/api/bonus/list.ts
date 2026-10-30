import type { APIRoute } from 'astro';
import { financeAuth, ok, fail, resolveBranchId, getBranchName, canApproveFinance } from '@/lib/finance/http';
import { currentPeriod, parseMonth, parsePeriod, periodLabelAr, toPeriod } from '@/lib/finance/catalog';
import { getOpenRun } from '@/lib/finance/payroll-data';
import { firstOpenPeriod } from '@/lib/finance/ledger';
import { loadPeriodOverview } from '@/lib/finance/bonus';

/**
 * Month overview of the weekly bonus: the 5 (or 4) weeks with their date range,
 * completeness and stored request, the approved total that reaches payroll
 * (one approved row per week, as payroll pays it), the part of it rolled over
 * to a later payroll, where new approvals of this month go (`payrollPeriod`:
 * this month, or the first open month after it when its payroll is closed),
 * and the number of requests awaiting the manager.
 * Query: branchId, period=YYYY-MM (or month & year).
 */
export const GET: APIRoute = async context => {
  const auth = await financeAuth(context, ['canManageBonus', 'canManageSettings', 'canViewReports']);
  if (auth instanceof Response) return auth;
  const { db, session } = auth;

  const url = new URL(context.request.url);
  const branchId = resolveBranchId(session, url.searchParams.get('branchId'));
  if (branchId instanceof Response) return branchId;

  let period = (url.searchParams.get('period') ?? '').trim();
  if (!period) {
    const month = parseMonth(url.searchParams.get('month'));
    const year = Number(url.searchParams.get('year'));
    period = month && Number.isInteger(year) && year > 0 ? toPeriod(year, month) : currentPeriod();
  }
  if (!parsePeriod(period)) return fail('الشهر غير صالح — استخدم الصيغة YYYY-MM', 400);

  try {
    const [overview, branchName, run, payrollPeriod] = await Promise.all([
      loadPeriodOverview(db, branchId, period),
      getBranchName(db, branchId),
      getOpenRun(db, branchId, period),
      firstOpenPeriod(db, branchId, period),
    ]);
    const weeks = overview.weeks.map(w => ({
      ...w,
      // The month view does not need every employee line.
      record: w.record ? { ...w.record, entries: undefined } : null,
    }));
    return ok({
      branchId,
      branchName,
      period,
      periodLabel: periodLabelAr(period),
      weeks,
      approvedTotal: overview.approvedTotal,
      monthApprovedTotal: overview.approvedTotal,
      rolledOverTotal: overview.rolledOverTotal,
      pendingCount: overview.pendingCount,
      locked: overview.locked,
      payrollStatus: run?.status ?? null,
      payrollPeriod,
      payrollPeriodLabel: periodLabelAr(payrollPeriod),
      employees: overview.employees,
      permissions: {
        canSubmit: session.permissions.canManageBonus || canApproveFinance(session),
        isManager: canApproveFinance(session),
      },
    });
  } catch (error) {
    console.error('List bonus error:', error);
    return fail('تعذر تحميل سجلات البونص', 500);
  }
};
