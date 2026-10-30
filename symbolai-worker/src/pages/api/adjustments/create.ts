// POST /api/adjustments/create — adds one entry (overtime, advance, penalty,
// absence, ...) to the payroll adjustments ledger. Entries flow automatically
// into the payroll of their period; a period whose payroll is approved/paid is
// locked and refuses new entries (checked up front and again atomically inside
// the INSERT, so a concurrent approval cannot slip an entry in).
//
// Also exports the shared pieces used by list/cancel and by the backward
// compatible /api/advances/create and /api/deductions/create wrappers.

import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { logAudit, type EnhancedSession } from '@/lib/permissions';
import {
  ADJUSTMENT_CATEGORIES,
  isAdjustmentCategory,
  parsePeriod,
  periodLabelAr,
  toPeriod,
  type AdjustmentCategory,
} from '@/lib/finance/catalog';
import { formatMoney, fromMinor, parsePositiveAmount, round2, toMinor } from '@/lib/finance/money';
import { adjustmentInsertStatement, getBranchEmployee } from '@/lib/finance/ledger';
import { isPeriodLocked, loadLegacyAdvancesAndDeductions } from '@/lib/finance/payroll-data';
import {
  canApproveFinance,
  clientIp,
  fail,
  financeAuth,
  newId,
  ok,
  readJsonObject,
  resolveBranchId,
  str,
  type FinanceContext,
} from '@/lib/finance/http';

/** Upper bound for a quantity (hours or days): 31 days × 24 hours. */
export const MAX_ADJUSTMENT_QUANTITY = 744;
export const MAX_DESCRIPTION_LENGTH = 300;

export const LOCKED_PERIOD_MESSAGE = 'مسير رواتب هذا الشهر معتمد — لا يمكن إضافة بنود';

/** An explicit amount that quantity × rate does not explain: the amount is kept, the breakdown dropped. */
export const AMOUNT_MISMATCH_WARNING = 'المبلغ المُدخل يختلف عن الكمية × السعر — حُفظ المبلغ دون الكمية والسعر';

/** Salary data is visible to payroll/HR roles and the manager — never to partners. */
export function canViewAdjustments(session: EnhancedSession): boolean {
  const p = session.permissions;
  return p.canGeneratePayroll === true || p.canManageEmployees === true || canApproveFinance(session);
}

export function canEditAdjustments(session: EnhancedSession): boolean {
  const p = session.permissions;
  return p.canGeneratePayroll === true || p.canManageEmployees === true;
}

export interface AdjustmentDto {
  id: string;
  branchId: string;
  employeeId: string;
  employeeName: string;
  period: string;
  kind: 'earning' | 'deduction';
  category: string;
  categoryLabel: string;
  categoryLabelEn: string;
  amount: number;
  quantity: number | null;
  rate: number | null;
  description: string | null;
  sourceType: string;
  sourceId: string | null;
  installmentNo: number | null;
  installmentCount: number | null;
  status: 'active' | 'cancelled';
  payrollRunId: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value);
  return s ? s : null;
}

/** payroll_adjustments row → API shape (camelCase, Arabic label). */
export function mapAdjustmentRow(row: Record<string, unknown>): AdjustmentDto {
  const category = String(row.category ?? '');
  const info = isAdjustmentCategory(category) ? ADJUSTMENT_CATEGORIES[category] : null;
  return {
    id: String(row.id),
    branchId: String(row.branch_id ?? ''),
    employeeId: String(row.employee_id ?? ''),
    employeeName: String(row.employee_name ?? ''),
    period: String(row.period ?? ''),
    kind: row.kind === 'earning' ? 'earning' : 'deduction',
    category,
    categoryLabel: info?.labelAr ?? category,
    categoryLabelEn: info?.labelEn ?? category,
    amount: round2(row.amount),
    quantity: nullableNumber(row.quantity),
    rate: nullableNumber(row.rate),
    description: nullableString(row.description),
    sourceType: String(row.source_type ?? 'manual'),
    sourceId: nullableString(row.source_id),
    installmentNo: nullableNumber(row.installment_no),
    installmentCount: nullableNumber(row.installment_count),
    status: row.status === 'cancelled' ? 'cancelled' : 'active',
    payrollRunId: nullableString(row.payroll_run_id),
    createdBy: nullableString(row.created_by),
    createdByName: nullableString(row.created_by_name),
    createdAt: String(row.created_at ?? ''),
    cancelledByName: nullableString(row.cancelled_by_name),
    cancelledAt: nullableString(row.cancelled_at),
    cancelReason: nullableString(row.cancel_reason),
  };
}

export async function loadAdjustment(db: D1Database, id: string): Promise<Record<string, unknown> | null> {
  return db.prepare('SELECT * FROM payroll_adjustments WHERE id = ?').bind(id).first<Record<string, unknown>>();
}

function provided(value: unknown): boolean {
  return value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');
}

/** Hours or days: > 0, ≤ 744, at most 2 decimals. */
export function parseQuantity(value: unknown): number | null {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const n = Number(text);
  return n > 0 && n <= MAX_ADJUSTMENT_QUANTITY ? n : null;
}

/** quantity × rate, rounded to the halala. */
export function multiplyToAmount(quantity: number, rate: number): number {
  return fromMinor(Math.round((toMinor(quantity) * toMinor(rate)) / 100));
}

export interface CreateAdjustmentInput {
  branchId?: unknown;
  employeeId?: unknown;
  period?: unknown;
  category?: unknown;
  amount?: unknown;
  quantity?: unknown;
  rate?: unknown;
  description?: unknown;
}

export type CreateAdjustmentResult =
  | {
      ok: true;
      adjustment: AdjustmentDto;
      warnings: string[];
      employee: { id: string; name: string; branchId: string };
    }
  | { ok: false; response: Response };

/**
 * Total active deductions (ledger + legacy tables) of one employee in a period,
 * in halalas — what payroll will subtract from the wage.
 */
async function employeeDeductionsMinor(db: D1Database, branchId: string, period: string, employeeId: string): Promise<number> {
  const ledger = await db
    .prepare(
      `SELECT amount FROM payroll_adjustments
       WHERE branch_id = ? AND period = ? AND employee_id = ? AND status = 'active' AND kind = 'deduction'`,
    )
    .bind(branchId, period, employeeId)
    .all<{ amount: number }>();
  let total = 0;
  for (const row of ledger.results ?? []) total += Math.abs(toMinor(row.amount));
  const legacy = await loadLegacyAdvancesAndDeductions(db, branchId, period);
  for (const adj of legacy) {
    if (adj.employeeId === employeeId) total += Math.abs(toMinor(adj.amount));
  }
  return total;
}

/**
 * Validates and inserts one ledger entry. Callers must have authenticated with
 * canGeneratePayroll or canManageEmployees. Never throws for bad input.
 */
export async function createAdjustment(
  auth: FinanceContext,
  request: Request,
  input: CreateAdjustmentInput,
  origin = 'adjustments',
): Promise<CreateAdjustmentResult> {
  const { session, db, actor } = auth;
  const reject = (error: string, status = 400): CreateAdjustmentResult => ({ ok: false, response: fail(error, status) });

  const branchId = resolveBranchId(session, input.branchId);
  if (branchId instanceof Response) return { ok: false, response: branchId };

  const period = parsePeriod(input.period);
  if (!period) return reject('يرجى تحديد شهر صحيح للبند (YYYY-MM)');
  const periodKey = toPeriod(period.year, period.month);

  if (!isAdjustmentCategory(input.category)) return reject('نوع البند غير معروف');
  const category: AdjustmentCategory = input.category;
  const info = ADJUSTMENT_CATEGORIES[category];

  const employeeId = str(input.employeeId, 100);
  if (!employeeId) return reject('يرجى اختيار الموظف');
  const employee = await getBranchEmployee(db, employeeId);
  // Same answer for "missing" and "another branch": do not reveal other branches' staff.
  if (!employee || employee.branchId !== branchId) return reject('الموظف غير موجود في هذا الفرع', 404);
  if (!employee.isActive) return reject('الموظف غير نشط — لا يمكن إضافة بنود له');

  // Amount: given directly, or quantity × rate computed in halalas.
  const hasAmount = provided(input.amount);
  const hasQuantity = provided(input.quantity);
  const hasRate = provided(input.rate);
  let quantity: number | null = null;
  let rate: number | null = null;
  if (hasQuantity) {
    quantity = parseQuantity(input.quantity);
    if (quantity === null) return reject(`الكمية يجب أن تكون رقماً أكبر من صفر ولا تتجاوز ${MAX_ADJUSTMENT_QUANTITY} (منزلتان عشريتان كحد أقصى)`);
  }
  if (hasRate) {
    rate = parsePositiveAmount(input.rate);
    if (rate === null) return reject('السعر يجب أن يكون مبلغاً أكبر من صفر (منزلتان عشريتان كحد أقصى)');
  }

  const warnings: string[] = [];
  let amount: number;
  if (hasAmount) {
    const parsed = parsePositiveAmount(input.amount);
    if (parsed === null) return reject('المبلغ يجب أن يكون رقماً أكبر من صفر (منزلتان عشريتان كحد أقصى)');
    amount = parsed;
    // The stored quantity and rate must explain the amount, or the printed
    // sheet would show e.g. "2 ساعة × 50.00" next to 5,000.00. The amount the
    // user typed wins; the breakdown that contradicts it is not stored.
    if (quantity !== null && rate !== null && toMinor(multiplyToAmount(quantity, rate)) !== toMinor(amount)) {
      quantity = null;
      rate = null;
      warnings.push(AMOUNT_MISMATCH_WARNING);
    }
  } else if (quantity !== null && rate !== null) {
    amount = multiplyToAmount(quantity, rate);
    if (toMinor(amount) <= 0) return reject('ناتج الكمية × السعر يساوي صفراً');
    if (amount >= 1e10) return reject('المبلغ كبير جداً');
  } else if (hasQuantity || hasRate) {
    return reject('يرجى إدخال الكمية والسعر معاً أو إدخال المبلغ مباشرة');
  } else {
    return reject('يرجى إدخال المبلغ أو الكمية والسعر');
  }

  let description: string | null = null;
  if (provided(input.description)) {
    if (typeof input.description !== 'string' && typeof input.description !== 'number') return reject('الوصف غير صالح');
    const text = String(input.description).trim();
    if (text.length > MAX_DESCRIPTION_LENGTH) return reject(`الوصف طويل جداً (${MAX_DESCRIPTION_LENGTH} حرف كحد أقصى)`);
    description = text || null;
  }

  if (await isPeriodLocked(db, branchId, periodKey)) return reject(LOCKED_PERIOD_MESSAGE, 409);

  const id = newId('adj');
  const [result] = await db.batch([
    adjustmentInsertStatement(db, {
      id,
      branchId,
      employeeId: employee.id,
      employeeName: employee.name,
      period: periodKey,
      category,
      amount,
      quantity,
      rate,
      description,
      sourceType: 'manual',
      createdBy: actor.id,
      createdByName: actor.displayName,
    }),
  ]);
  // The payroll was approved between the check above and the insert.
  if (!result || Number(result.meta?.changes ?? 0) === 0) return reject(LOCKED_PERIOD_MESSAGE, 409);

  // The entry is committed. Nothing below may turn this into an error: a 500
  // now would make the user retry and record the entry (and deduct) twice. A
  // failing step falls back to the in-memory row and adds no warnings.
  let adjustment = mapAdjustmentRow({
    id, branch_id: branchId, employee_id: employee.id, employee_name: employee.name, period: periodKey,
    kind: info.kind, category, amount, quantity, rate, description, source_type: 'manual', status: 'active',
    created_by: actor.id, created_by_name: actor.displayName, created_at: new Date().toISOString(),
  });
  const afterCommit = async (step: string, task: () => Promise<void>): Promise<void> => {
    try {
      await task();
    } catch (error) {
      console.error(`Payroll adjustment ${id} saved, but "${step}" failed:`, error);
    }
  };

  await afterCommit('reload', async () => {
    const row = await loadAdjustment(db, id);
    if (row) adjustment = mapAdjustmentRow(row);
  });

  // Saudi Labour Law art. 92/93: deductions may not exceed half of the wage. Warn, don't block.
  if (info.kind === 'deduction') {
    await afterCommit('deduction warnings', async () => {
      const fixedMinor = toMinor(employee.baseSalary) + toMinor(employee.supervisorAllowance) + toMinor(employee.incentives);
      const deductionsMinor = await employeeDeductionsMinor(db, branchId, periodKey, employee.id);
      const found: string[] = [];
      if (fixedMinor > 0 && deductionsMinor * 2 > fixedMinor) {
        found.push(
          `تنبيه: إجمالي استقطاعات ${employee.name} في ${periodLabelAr(periodKey)} (${formatMoney(fromMinor(deductionsMinor))}) ` +
            `يتجاوز 50% من راتبه الثابت (${formatMoney(fromMinor(fixedMinor))}) — المادتان 92 و93 من نظام العمل`,
        );
      }
      if (deductionsMinor > fixedMinor) {
        found.push('الاستقطاعات تتجاوز الراتب الثابت — سيظهر صافي الراتب بالسالب ما لم تُضف مستحقات');
      }
      warnings.push(...found);
    });
  }

  await afterCommit('audit log', () =>
    logAudit(
      db,
      session,
      'create',
      'payroll_adjustment',
      id,
      {
        origin,
        branchId,
        employeeId: employee.id,
        period: periodKey,
        category,
        amount,
        quantity,
        rate,
      },
      clientIp(request),
      request.headers.get('User-Agent') || undefined,
    ),
  );

  return { ok: true, adjustment, warnings, employee: { id: employee.id, name: employee.name, branchId } };
}

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, ['canGeneratePayroll', 'canManageEmployees']);
  if (auth instanceof Response) return auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);

  try {
    const result = await createAdjustment(auth, context.request, body);
    if (!result.ok) return result.response;
    return ok({ adjustment: result.adjustment, warnings: result.warnings }, 201);
  } catch (error) {
    console.error('Create payroll adjustment error:', error);
    return fail('حدث خطأ أثناء إضافة البند', 500);
  }
};
