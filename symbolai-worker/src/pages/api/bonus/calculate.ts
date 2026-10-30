import type { APIRoute, APIContext } from 'astro';
import { financeAuth, ok, fail, readJsonObject, resolveBranchId, getBranchName, canApproveFinance } from '@/lib/finance/http';
import { parseMonth, parsePeriod, periodLabelAr, toPeriod } from '@/lib/finance/catalog';
import { isPeriodLocked } from '@/lib/finance/payroll-data';
import { firstOpenPeriod } from '@/lib/finance/ledger';
import {
  bonusFingerprint,
  computeWeekBonus,
  findWeekRecords,
  getBonusTiers,
  isFinalStatus,
  parseWeekNumber,
  pickPrimaryRecord,
  weekLabelAr,
} from '@/lib/finance/bonus';

/**
 * Live bonus of one week, computed from the cashier revenues with the current
 * tiers, plus the stored request for that week (if any). Nothing is saved.
 * `locked` = the week's month payroll is approved/paid; the week can still be
 * submitted and approved, and then goes to `payrollPeriod` (first open month).
 * Body/query: {branchId, period: 'YYYY-MM', week: 1-5}.
 */
async function handle(
  context: Pick<APIContext, 'request' | 'locals'>,
  readInput: () => Promise<Record<string, unknown> | null>,
): Promise<Response> {
  const auth = await financeAuth(context, ['canManageBonus', 'canManageSettings', 'canViewReports']);
  if (auth instanceof Response) return auth;
  const { db, session } = auth;

  const input = await readInput();
  if (!input) return fail('بيانات الطلب غير صالحة', 400);

  const branchId = resolveBranchId(session, input.branchId);
  if (branchId instanceof Response) return branchId;

  let period = typeof input.period === 'string' ? input.period.trim() : '';
  if (!parsePeriod(period) && input.year !== undefined && input.month !== undefined) {
    const month = parseMonth(input.month);
    const year = Number(input.year);
    if (month && Number.isInteger(year)) period = toPeriod(year, month);
  }
  if (!parsePeriod(period)) return fail('الشهر غير صالح — استخدم الصيغة YYYY-MM', 400);

  const week = parseWeekNumber(input.week ?? input.weekNumber);
  if (week === null) return fail('رقم الأسبوع يجب أن يكون بين 1 و 5', 400);

  try {
    const { tiers } = await getBonusTiers(db);
    const computation = await computeWeekBonus(db, branchId, period, week, tiers);
    if (!computation) return fail(`${periodLabelAr(period)} لا يحتوي على أسبوع خامس`, 400);

    const [records, locked, branchName, payrollPeriod] = await Promise.all([
      findWeekRecords(db, branchId, period, week),
      isPeriodLocked(db, branchId, period),
      getBranchName(db, branchId),
      firstOpenPeriod(db, branchId, period),
    ]);
    const record = pickPrimaryRecord(records);
    const changedSinceSubmission =
      record !== null &&
      record.status !== 'rejected' &&
      (bonusFingerprint(record.entries) !== bonusFingerprint(computation.employees));

    const isManager = canApproveFinance(session);
    const canSubmit = session.permissions.canManageBonus || isManager;
    // A closed payroll no longer blocks the bonus: approval rolls it over to payrollPeriod.
    const open = computation.complete && (!record || !isFinalStatus(record.status));

    return ok({
      ...computation,
      branchName,
      periodLabel: periodLabelAr(period),
      weekLabel: weekLabelAr(period, computation.range),
      weekComplete: computation.complete,
      record,
      duplicateCount: Math.max(0, records.length - 1),
      changedSinceSubmission,
      locked,
      payrollPeriod,
      payrollPeriodLabel: periodLabelAr(payrollPeriod),
      rolledOver: payrollPeriod !== period,
      permissions: {
        canSubmit: canSubmit && open,
        canApprove: isManager && record?.status === 'pending',
        canApproveDirectly: isManager && open,
        isManager,
      },
    });
  } catch (error) {
    console.error('Calculate bonus error:', error);
    return fail('حدث خطأ أثناء حساب البونص', 500);
  }
}

export const POST: APIRoute = context => handle(context, () => readJsonObject(context.request));

export const GET: APIRoute = context =>
  handle(context, async () => Object.fromEntries(new URL(context.request.url).searchParams.entries()));
