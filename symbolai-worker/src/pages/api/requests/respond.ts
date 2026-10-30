// POST (or PUT) /api/requests/respond — approve or reject an employee request.
//
// Approval posts the request's financial effect straight into the payroll
// ledger (payroll_adjustments) so the next payroll picks it up:
//   سلفة         → 'advance' deduction, optionally split into monthly installments,
//                  plus (by default) one payment voucher (سند صرف) for the payout
//   مخالفة       → optional 'violation' penalty (0 = warning only)
//   إجازة        → 'unpaid_leave' deduction = unpaid days × daily rate (or an explicit amount)
//   صرف متأخرات  → 'dues' earning
//   استئذان      → optional 'late' deduction
//   استقالة      → optionally deactivates the employee
// Everything (ledger rows, voucher, meta, status change) is written in ONE
// batch whose statements all re-check that the request is still pending and
// the target months are still open, so a double approval or a payroll that is
// approved concurrently can never leave half-posted data behind.

import type { APIRoute } from 'astro';
import type { D1PreparedStatement } from '@cloudflare/workers-types';
import {
  financeAuth,
  ok,
  fail,
  readJsonObject,
  str,
  optStr,
  canApproveFinance,
  getBranchName,
  newId,
  clientIp,
} from '@/lib/finance/http';
import {
  ADJUSTMENT_CATEGORIES,
  PAYMENT_METHODS,
  currentPeriod,
  parsePeriod,
  periodLabelAr,
  todayIso,
  toPeriod,
  type AdjustmentCategory,
  type PaymentMethod,
} from '@/lib/finance/catalog';
import { formatMoney, fromMinor, parseNonNegativeAmount, parsePositiveAmount, toMinor } from '@/lib/finance/money';
import {
  adjustmentInsertStatement,
  findLockedPeriod,
  firstOpenPeriod,
  getBranchEmployee,
  planInstallments,
  type NewAdjustment,
  type SqlGuard,
} from '@/lib/finance/ledger';
import { normalizePaymentSplit, voucherInsertStatements, type NewVoucher } from '@/lib/finance/vouchers';
import { getTableColumns } from '@/lib/finance/schema';
import { normalizeArabicName } from '@/lib/finance/payroll-data';
import { notifyByPermission, notifyUsers } from '@/lib/finance/notify';
import { canAccessBranch, logAudit } from '@/lib/permissions';
import { triggerEmployeeRequestResponded } from '@/lib/email-triggers';
import {
  PENDING_GUARD_SQL,
  describeFinancial,
  emailEnv,
  employeeDailyRate,
  findEmployeeUserIds,
  getOrgCurrency,
  getRequestColumns,
  loadRequest,
  runSideEffect,
  shortRequestNo,
  type FinancialAdjustmentRecord,
  type NormalizedRequest,
  type RequestFinancial,
} from './_lib';

type Employee = NonNullable<Awaited<ReturnType<typeof getBranchEmployee>>>;

const STATUS_LABELS: Record<string, string> = {
  approved: 'تمت الموافقة عليه',
  rejected: 'تم رفضه',
  cancelled: 'سحبه مقدمه',
};

const handler: APIRoute = async context => {
  const auth = await financeAuth(context, ['canApproveRequests']);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات غير صالحة');

  const id = str(body.id, 100);
  if (!id) return fail('رقم الطلب مطلوب');
  const decision = body.status;
  if (decision !== 'approved' && decision !== 'rejected') return fail('القرار يجب أن يكون موافقة أو رفضاً');
  const responseText = typeof body.adminResponse === 'string' ? body.adminResponse.trim() : '';
  if (responseText.length > 500) return fail('الرد يجب ألا يتجاوز 500 حرف');
  if (decision === 'rejected' && !responseText) return fail('يرجى كتابة سبب الرفض');
  const financialInput = body.financial ?? {};
  if (typeof financialInput !== 'object' || Array.isArray(financialInput)) return fail('بيانات الترحيل المالي غير صالحة');
  const fin = financialInput as Record<string, unknown>;

  try {
    const request = await loadRequest(db, id);
    if (!request) return fail('الطلب غير موجود', 404);
    if (!canAccessBranch(session, request.branchId)) return fail('لا يمكنك الوصول إلى طلبات هذا الفرع', 403);
    if (request.status !== 'pending') {
      return fail(`لا يمكن الرد على هذا الطلب — ${STATUS_LABELS[request.status] ?? 'تمت معالجته'} مسبقاً`, 409);
    }

    // Segregation of duties: a supervisor's own request is decided by the manager.
    const isOwnRequest =
      request.userId === actor.id && normalizeArabicName(request.employeeName) === normalizeArabicName(actor.displayName);
    if (isOwnRequest && !canApproveFinance(session)) {
      return fail('لا يمكنك اعتماد أو رفض طلبك الشخصي — يعتمده المدير', 403);
    }

    // ---- employee link -------------------------------------------------------
    const explicitEmployeeId = str(fin.employeeId, 100);
    const employeeId = explicitEmployeeId || request.meta.employeeId || '';
    let employee: Employee | null = null;
    if (employeeId) {
      const row = await getBranchEmployee(db, employeeId);
      if (row && row.branchId === request.branchId && row.isActive) employee = row;
      else if (explicitEmployeeId) return fail('الموظف المختار غير موجود في فرع الطلب أو غير نشط');
    }

    // ---- build the posting plan ----------------------------------------------
    let plan: Plan = emptyPlan();
    if (decision === 'approved') {
      const built = await buildPlan(db, request, fin, employee, actor, canApproveFinance(session));
      if (built instanceof Response) return built;
      plan = built;
    }

    const periods = [...new Set(plan.adjustments.map(a => a.period))];
    if (periods.length > 0) {
      const locked = await findLockedPeriod(db, request.branchId, periods);
      if (locked) return fail(lockedMessage(locked), 409);
    }

    // Every statement re-checks: still pending AND every target month still open.
    const lockSql = periods.length
      ? ` AND NOT EXISTS (SELECT 1 FROM payroll_runs WHERE branch_id = ? AND status IN ('approved', 'paid') AND period IN (${periods.map(() => '?').join(', ')}))`
      : '';
    const lockParams = periods.length ? [request.branchId, ...periods] : [];
    const guard: SqlGuard = { sql: PENDING_GUARD_SQL + lockSql, params: [id, ...lockParams] };

    const statements: D1PreparedStatement[] = [];
    for (const adjustment of plan.adjustments) statements.push(adjustmentInsertStatement(db, adjustment, guard));
    if (plan.voucher) statements.push(...voucherInsertStatements(db, plan.voucher, guard));
    if (plan.deactivate && employee) {
      const employeeColumns = await getTableColumns(db, 'employees');
      const touch = employeeColumns.has('updated_at') ? `, updated_at = datetime('now')` : '';
      statements.push(
        db
          .prepare(`UPDATE employees SET is_active = 0${touch} WHERE id = ? AND branch_id = ? AND ${guard.sql}`)
          .bind(employee.id, request.branchId, ...guard.params),
      );
    }

    const financial: RequestFinancial | null =
      plan.adjustments.length > 0 || plan.voucher || plan.deactivate
        ? {
            employeeId: employee?.id ?? null,
            employeeName: employee?.name ?? null,
            total: fromMinor(plan.adjustments.reduce((sum, a) => sum + toMinor(a.amount), 0)),
            adjustments: plan.adjustments.map(
              (a): FinancialAdjustmentRecord => ({
                id: a.id!,
                period: a.period,
                category: a.category,
                kind: ADJUSTMENT_CATEGORIES[a.category].kind,
                amount: a.amount,
                installmentNo: a.installmentNo ?? null,
                installmentCount: a.installmentCount ?? null,
                quantity: a.quantity ?? null,
                rate: a.rate ?? null,
              }),
            ),
            voucher: plan.voucher
              ? { id: plan.voucher.id!, amount: plan.voucher.amount, paymentMethod: plan.voucher.paymentMethod, status: plan.voucher.status }
              : null,
            deactivatedEmployee: plan.deactivate,
            unpaidDays: plan.unpaidDays,
            dailyRate: plan.dailyRate,
            postedAt: new Date().toISOString(),
            postedBy: actor.id,
            postedByName: actor.displayName,
          }
        : null;

    statements.push(
      db
        .prepare(
          `INSERT INTO employee_request_meta (request_id, employee_id, financial_json, responded_by, responded_by_name, updated_at)
           SELECT ?, ?, ?, ?, ?, datetime('now') WHERE ${guard.sql}
           ON CONFLICT(request_id) DO UPDATE SET
             employee_id = COALESCE(excluded.employee_id, employee_request_meta.employee_id),
             financial_json = excluded.financial_json,
             responded_by = excluded.responded_by,
             responded_by_name = excluded.responded_by_name,
             updated_at = excluded.updated_at`,
        )
        .bind(id, employee?.id ?? null, financial ? JSON.stringify(financial) : null, actor.id, actor.displayName, ...guard.params),
    );

    // The status change goes last: it changes 0 rows exactly when every guarded
    // statement above was skipped.
    const cols = await getRequestColumns(db);
    const storedResponse = responseText || (decision === 'approved' ? 'تمت الموافقة' : '');
    const sets = ['status = ?'];
    const setParams: unknown[] = [decision];
    for (const column of cols.responseText) {
      sets.push(`${column} = ?`);
      setParams.push(storedResponse);
    }
    for (const column of cols.responseTime) sets.push(`${column} = datetime('now')`);
    if (cols.hasRespondedBy) {
      sets.push('responded_by = ?');
      setParams.push(actor.id);
    }
    statements.push(
      db
        .prepare(`UPDATE employee_requests SET ${sets.join(', ')} WHERE id = ? AND status = 'pending'${lockSql}`)
        .bind(...setParams, id, ...lockParams),
    );

    const results = await db.batch(statements);
    const changed = Number(results[results.length - 1]?.meta?.changes ?? 0);
    if (changed === 0) {
      const current = await db.prepare('SELECT status FROM employee_requests WHERE id = ?').bind(id).first<{ status: string }>();
      if (current?.status === 'pending' && periods.length > 0) {
        const locked = await findLockedPeriod(db, request.branchId, periods);
        if (locked) return fail(lockedMessage(locked), 409);
      }
      return fail(
        current?.status && current.status !== 'pending'
          ? `لا يمكن الرد على هذا الطلب — ${STATUS_LABELS[current.status] ?? 'تمت معالجته'} مسبقاً`
          : 'تعذر حفظ القرار — يرجى المحاولة مرة أخرى',
        409,
      );
    }

    // ---- committed: side effects must not turn this into an error --------------
    try {
      return await afterCommit(context, { db, session, actor, request, decision, storedResponse, financial, plan });
    } catch (error) {
      console.error('Post-commit handling of request response failed:', error);
      return ok({ message: decision === 'approved' ? 'تم اعتماد الطلب' : 'تم رفض الطلب', request: null, financial, effects: [] });
    }
  } catch (error) {
    console.error('Respond to request error:', error);
    return fail('حدث خطأ أثناء الرد على الطلب', 500);
  }
};

export const POST = handler;
export const PUT = handler;

// ---------------------------------------------------------------------------

interface Plan {
  adjustments: NewAdjustment[];
  voucher: NewVoucher | null;
  deactivate: boolean;
  unpaidDays: number | null;
  dailyRate: number | null;
}

function emptyPlan(): Plan {
  return { adjustments: [], voucher: null, deactivate: false, unpaidDays: null, dailyRate: null };
}

function lockedMessage(period: string): string {
  return `مسير رواتب ${periodLabelAr(period)} معتمد أو مدفوع ولا يقبل حركات جديدة — اختر شهراً آخر للترحيل`;
}

const NEEDS_EMPLOYEE = 'يجب ربط الطلب بموظف نشط في نفس الفرع قبل ترحيله إلى مسير الرواتب — اختر الموظف';

/** undefined = not given; null = invalid. */
function optionalAmount(value: unknown): number | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  return parseNonNegativeAmount(value);
}

function optionalPeriod(value: unknown): string | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  return parsePeriod(value) ? String(value).trim() : null;
}

async function buildPlan(
  db: Parameters<typeof firstOpenPeriod>[0],
  request: NormalizedRequest,
  fin: Record<string, unknown>,
  employee: Employee | null,
  actor: { id: string; displayName: string },
  approverIsManager: boolean,
): Promise<Plan | Response> {
  const plan = emptyPlan();
  const branchId = request.branchId;
  const ref = shortRequestNo(request.id);

  const explicitAmount = optionalAmount(fin.amount);
  if (explicitAmount === null) return fail('المبلغ غير صحيح — أدخل رقماً موجباً بحد أقصى منزلتين عشريتين');
  const startInput = optionalPeriod(fin.startPeriod);
  if (startInput === null) return fail('شهر الترحيل غير صحيح');
  const defaultStart = async () => startInput ?? (await firstOpenPeriod(db, branchId, currentPeriod()));

  const adjustment = (category: AdjustmentCategory, period: string, amount: number, description: string, extra: Partial<NewAdjustment> = {}): NewAdjustment => ({
    id: newId('adj'),
    branchId,
    employeeId: employee!.id,
    employeeName: employee!.name,
    period,
    category,
    amount,
    description,
    sourceType: 'request',
    sourceId: request.id,
    createdBy: actor.id,
    createdByName: actor.displayName,
    ...extra,
  });

  switch (request.requestType) {
    case 'سلفة': {
      const amount = parsePositiveAmount(explicitAmount ?? request.advanceAmount ?? '');
      if (amount === null) return fail('مبلغ السلفة غير صحيح');
      const rawCount = fin.installments ?? request.meta.requestedInstallments ?? 1;
      const count = Number(rawCount);
      if (!Number.isInteger(count) || count < 1 || count > 24) return fail('عدد الأقساط يجب أن يكون بين 1 و 24');
      if (!employee) return fail(NEEDS_EMPLOYEE);
      const start = await defaultStart();
      for (const entry of planInstallments(amount, count, start)) {
        plan.adjustments.push(
          adjustment('advance', entry.period, entry.amount, `سلفة — طلب رقم ${ref}`, {
            installmentNo: entry.installmentNo,
            installmentCount: entry.installmentCount,
          }),
        );
      }
      if (fin.createVoucher !== false) {
        const method = (fin.paymentMethod === undefined || fin.paymentMethod === null || fin.paymentMethod === '' ? 'cash' : fin.paymentMethod) as PaymentMethod;
        if (typeof method !== 'string' || !Object.prototype.hasOwnProperty.call(PAYMENT_METHODS, method)) {
          return fail('طريقة الدفع غير صحيحة');
        }
        const voucher: NewVoucher = {
          id: newId('vch'),
          branchId,
          branchName: await getBranchName(db, branchId),
          type: 'payment',
          date: todayIso(),
          partyType: 'employee',
          partyName: employee.name,
          employeeId: employee.id,
          partyIdNumber: employee.nationalId,
          amount,
          currency: await getOrgCurrency(db),
          purpose: 'سلفة على الراتب',
          paymentMethod: method,
          cashAmount: numberOrUndefined(fin.cashAmount),
          bankAmount: numberOrUndefined(fin.bankAmount),
          chequeAmount: numberOrUndefined(fin.chequeAmount),
          cardAmount: numberOrUndefined(fin.cardAmount),
          chequeNumber: optStr(fin.chequeNumber, 50),
          chequeDate: optStr(fin.chequeDate, 10),
          bankName: optStr(fin.bankName, 100),
          transactionRef: optStr(fin.transactionRef, 100),
          notes: `طلب رقم ${ref} — تُسترد على ${count === 1 ? 'دفعة واحدة' : `${count} أقساط`} ابتداءً من راتب ${periodLabelAr(start)}`,
          status: approverIsManager ? 'approved' : 'pending',
          sourceType: 'request',
          sourceId: request.id,
          createdBy: actor.id,
          createdByName: actor.displayName,
          approvedBy: approverIsManager ? actor.id : null,
          approvedByName: approverIsManager ? actor.displayName : null,
        };
        const splitError = normalizePaymentSplit(voucher);
        if (splitError) return fail(splitError);
        plan.voucher = voucher;
      }
      return plan;
    }

    case 'مخالفة': {
      if (!explicitAmount) return plan; // warning only
      if (!employee) return fail(NEEDS_EMPLOYEE);
      const period = await defaultStart();
      plan.adjustments.push(
        adjustment('violation', period, explicitAmount, `جزاء مخالفة${request.violationDate ? ` بتاريخ ${request.violationDate}` : ''} — طلب رقم ${ref}`),
      );
      return plan;
    }

    case 'إجازة': {
      let unpaidDays: number;
      if (fin.unpaidDays === undefined || fin.unpaidDays === null || fin.unpaidDays === '') {
        unpaidDays = request.meta.leaveType === 'unpaid' ? request.meta.leaveDays ?? 0 : 0;
      } else {
        const days = Number(fin.unpaidDays);
        if (!Number.isFinite(days) || days < 0 || Math.round(days * 2) !== days * 2) {
          return fail('عدد أيام الإجازة بدون راتب غير صحيح (يُقبل نصف يوم)');
        }
        const max = request.meta.leaveDays ?? 31;
        if (days > max) return fail(`أيام الخصم لا يمكن أن تتجاوز مدة الإجازة (${max} يوم)`);
        unpaidDays = days;
      }
      if (unpaidDays <= 0 && !explicitAmount) return plan; // paid leave: nothing to post
      if (!employee) return fail(NEEDS_EMPLOYEE);

      const rate = employeeDailyRate(employee);
      const amount = explicitAmount || fromMinor(Math.round(unpaidDays * toMinor(rate)));
      if (toMinor(amount) <= 0) return fail('تعذر حساب مبلغ الخصم — لا يوجد راتب مسجل للموظف؛ أدخل المبلغ يدوياً');
      const leaveStart = request.meta.leaveStart;
      const period = startInput ?? (leaveStart ? toPeriod(Number(leaveStart.slice(0, 4)), Number(leaveStart.slice(5, 7))) : await defaultStart());
      plan.unpaidDays = unpaidDays > 0 ? unpaidDays : null;
      plan.dailyRate = explicitAmount ? null : rate;
      const range = request.meta.leaveStart && request.meta.leaveEnd ? ` (${request.meta.leaveStart} – ${request.meta.leaveEnd})` : '';
      plan.adjustments.push(
        adjustment(
          'unpaid_leave',
          period,
          amount,
          `إجازة بدون راتب${unpaidDays > 0 ? ` ${unpaidDays} يوم` : ''}${range} — طلب رقم ${ref}`,
          explicitAmount ? {} : { quantity: unpaidDays, rate },
        ),
      );
      return plan;
    }

    case 'صرف متأخرات': {
      const amount = parsePositiveAmount(explicitAmount ?? request.duesAmount ?? '');
      if (amount === null) return fail('مبلغ المتأخرات غير صحيح');
      if (!employee) return fail(NEEDS_EMPLOYEE);
      const period = await defaultStart();
      plan.adjustments.push(adjustment('dues', period, amount, `صرف متأخرات — طلب رقم ${ref}`));
      return plan;
    }

    case 'استئذان': {
      if (!explicitAmount) return plan;
      if (!employee) return fail(NEEDS_EMPLOYEE);
      const period = await defaultStart();
      const hours = request.meta.permissionHours ? ` ${request.meta.permissionHours} ساعة` : '';
      plan.adjustments.push(adjustment('late', period, explicitAmount, `خصم استئذان${hours} — طلب رقم ${ref}`));
      return plan;
    }

    case 'استقالة': {
      if (fin.deactivateEmployee === true) {
        if (!employee) return fail('اختر سجل الموظف المراد إيقافه');
        plan.deactivate = true;
      }
      return plan;
    }

    default:
      return plan;
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

interface CommitInfo {
  db: Parameters<typeof notifyUsers>[0];
  session: Parameters<typeof logAudit>[1];
  actor: { id: string; displayName: string };
  request: NormalizedRequest;
  decision: 'approved' | 'rejected';
  storedResponse: string;
  financial: RequestFinancial | null;
  plan: Plan;
}

async function afterCommit(context: Parameters<APIRoute>[0], info: CommitInfo): Promise<Response> {
  const { db, session, actor, request, decision, storedResponse, financial } = info;
  const approved = decision === 'approved';

  let updated: NormalizedRequest | null = null;
  try {
    updated = await loadRequest(db, request.id);
  } catch (error) {
    console.error('Reloading responded request failed:', error);
  }
  const liveFinancial = updated?.meta.financial ?? financial;
  const currency = await getOrgCurrency(db).catch(() => 'SAR' as const);
  const effects = describeFinancial(liveFinancial, currency);

  const message = [
    `طلب ${request.requestType} — ${approved ? 'تمت الموافقة عليه' : 'تم رفضه'}`,
    storedResponse ? `الرد: ${storedResponse}` : '',
    ...effects,
  ]
    .filter(Boolean)
    .join('\n');

  // The requester, plus the employee's own account when a supervisor filed on their behalf.
  const recipients = new Set<string>();
  if (request.userId) recipients.add(request.userId);
  for (const userId of await findEmployeeUserIds(db, request.branchId, liveFinancial?.employeeName ?? request.employeeName)) {
    recipients.add(userId);
  }
  recipients.delete(actor.id);
  if (recipients.size > 0) {
    await notifyUsers(db, [...recipients], {
      type: 'request_responded',
      title: approved ? 'تمت الموافقة على طلبك' : 'تم رفض طلبك',
      message,
      severity: approved ? 'success' : 'warning',
      link: '/my-requests',
      relatedEntity: request.id,
      branchId: request.branchId,
    });
  }

  const voucher = liveFinancial?.voucher;
  if (voucher && voucher.status === 'pending') {
    await notifyByPermission(
      db,
      request.branchId,
      'can_manage_settings',
      {
        type: 'voucher_pending',
        title: 'سند صرف بانتظار الاعتماد',
        message: `سند صرف${voucher.number ? ` ${voucher.number}` : ''} — سلفة للموظف ${liveFinancial?.employeeName ?? request.employeeName} بمبلغ ${formatMoney(voucher.amount, currency)}`,
        severity: 'info',
        link: `/vouchers/print/${voucher.id}`,
        relatedEntity: voucher.id,
      },
      { excludeUserId: actor.id },
    );
  }

  await runSideEffect(context, async () => {
    let employeeEmail: string | undefined;
    if (request.userId) {
      const row = await db.prepare('SELECT email FROM users_new WHERE id = ?').bind(request.userId).first<{ email: string | null }>();
      employeeEmail = row?.email?.trim() || undefined;
    }
    await triggerEmployeeRequestResponded(emailEnv(context), {
      requestId: request.id,
      employeeName: request.employeeName,
      employeeEmail,
      requestType: request.requestType,
      status: decision,
      adminResponse: [storedResponse, ...effects].filter(Boolean).join(' — '),
      responseDate: todayIso(),
      userId: request.userId ?? undefined,
    });
  });

  await logAudit(
    db,
    session,
    'update',
    'employee_request',
    request.id,
    {
      status: decision,
      adminResponse: storedResponse,
      employeeId: liveFinancial?.employeeId ?? null,
      adjustments: liveFinancial?.adjustments.map(a => ({ id: a.id, period: a.period, category: a.category, amount: a.amount })) ?? [],
      voucherId: liveFinancial?.voucher?.id ?? null,
      deactivatedEmployee: liveFinancial?.deactivatedEmployee ?? false,
    },
    clientIp(context.request),
    context.request.headers.get('User-Agent') || undefined,
  );

  return ok({
    message: approved
      ? effects.length
        ? 'تم اعتماد الطلب وترحيله إلى مسير الرواتب'
        : 'تم اعتماد الطلب'
      : 'تم رفض الطلب',
    request: updated,
    financial: liveFinancial,
    effects,
  });
}
