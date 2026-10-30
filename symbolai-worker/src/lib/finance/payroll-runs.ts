// Persistence helpers for payroll runs (payroll_runs + payroll_run_items):
// access checks, row (de)serialization, guarded statements for db.batch and
// the voucher links of a run. Server-only; used by /api/payroll/* and the
// print page.

import type { APIContext } from 'astro';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { canAccessBranch, type EnhancedSession } from '@/lib/permissions';
import {
  ADJUSTMENT_CATEGORIES,
  monthVariants,
  parseMonth,
  parsePeriod,
  periodLabelAr,
  periodLabelEn,
  toPeriod,
  todayIso,
  type PayrollColumn,
} from './catalog';
import { canApproveFinance, fail, financeAuth, newId, str, type FinanceContext } from './http';
import { getTableColumns } from './schema';
import type { PayrollRunRow, PayrollRunStatus } from './payroll-data';
import type {
  PayrollAdjustmentInput,
  PayrollItem,
  PayrollLine,
  PayrollResult,
  PayrollTotals,
} from './payroll-engine';

export const RUN_STATUS_LABELS: Record<PayrollRunStatus, { ar: string; en: string }> = {
  draft: { ar: 'مسودة', en: 'Draft' },
  approved: { ar: 'معتمد', en: 'Approved' },
  paid: { ar: 'مدفوع', en: 'Paid' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
};

export const OPTIONAL_PAYROLL_COLUMNS: PayrollColumn[] = [
  'overtime', 'bonus', 'otherEarnings', 'advances', 'penalties', 'absenceDeductions', 'otherDeductions',
];

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

/** Payroll figures are visible to payroll generators (branch supervisors) and the manager. Partners never see salaries. */
export function canUsePayroll(session: EnhancedSession): boolean {
  return session.permissions.canGeneratePayroll === true || canApproveFinance(session);
}

/**
 * financeAuth + the payroll permission check.
 * mode 'use': view / calculate / save / pay / cancel drafts; mode 'approve': manager-only actions.
 */
export async function payrollAuth(
  context: Pick<APIContext, 'request' | 'locals'>,
  mode: 'use' | 'approve' = 'use',
): Promise<FinanceContext | Response> {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  if (mode === 'approve') {
    if (!canApproveFinance(auth.session)) return fail('هذا الإجراء من صلاحيات المدير فقط', 403);
  } else if (!canUsePayroll(auth.session)) {
    return fail('صلاحيات غير كافية للوصول إلى الرواتب', 403);
  }
  return auth;
}

/** Loads a run by id and enforces branch scoping. */
export async function loadRunForUser(auth: FinanceContext, rawId: unknown): Promise<PayrollRunRow | Response> {
  const id = str(rawId, 100);
  if (!id) return fail('معرّف مسير الرواتب مطلوب', 400);
  const run = await loadRun(auth.db, id);
  if (!run) return fail('مسير الرواتب غير موجود', 404);
  if (!canAccessBranch(auth.session, run.branch_id)) return fail('لا يمكنك الوصول إلى بيانات هذا الفرع', 403);
  return run;
}

export function loadRun(db: D1Database, id: string): Promise<PayrollRunRow | null> {
  return db.prepare('SELECT * FROM payroll_runs WHERE id = ?').bind(id).first<PayrollRunRow>();
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/** 'YYYY-MM', or the legacy {month, year} pair. Returns null when invalid. */
export function readPeriodInput(period: unknown, month?: unknown, year?: unknown): string | null {
  const p = parsePeriod(period);
  if (p) return toPeriod(p.year, p.month);
  const m = parseMonth(month);
  const y = Number(year);
  if (m && Number.isInteger(y) && y >= 2000 && y <= 2100) return toPeriod(y, m);
  return null;
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

function parseJson<T>(text: unknown, fallback: T): T {
  if (typeof text !== 'string' || !text) return fallback;
  try {
    const value = JSON.parse(text);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function parseActiveColumns(text: unknown): PayrollColumn[] {
  const value = parseJson<unknown>(text, []);
  return Array.isArray(value) ? OPTIONAL_PAYROLL_COLUMNS.filter(c => value.includes(c)) : [];
}

/** Human reference printed on the sheet, e.g. PAY-202610-3F9A1C. */
export function runReference(run: Pick<PayrollRunRow, 'id' | 'period'>): string {
  return `PAY-${run.period.replace('-', '')}-${run.id.slice(-6).toUpperCase()}`;
}

export type SerializedRun = ReturnType<typeof serializeRun>;

export function serializeRun(run: PayrollRunRow & { voucher_count?: number | null }) {
  const status = run.status;
  return {
    id: run.id,
    reference: runReference(run),
    branchId: run.branch_id,
    branchName: run.branch_name,
    period: run.period,
    periodLabelAr: periodLabelAr(run.period),
    periodLabelEn: periodLabelEn(run.period),
    status,
    statusLabel: RUN_STATUS_LABELS[status]?.ar ?? status,
    employeeCount: num(run.employee_count),
    totalEarnings: num(run.total_earnings),
    totalDeductions: num(run.total_deductions),
    totalNet: num(run.total_net),
    totals: parseJson<Partial<PayrollTotals>>(run.totals_json, {}),
    activeColumns: parseActiveColumns(run.active_columns_json),
    fingerprint: run.fingerprint,
    notes: run.notes,
    createdBy: run.created_by,
    createdByName: run.created_by_name,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    approvedBy: run.approved_by,
    approvedByName: run.approved_by_name,
    approvedAt: run.approved_at,
    paidBy: run.paid_by,
    paidByName: run.paid_by_name,
    paidAt: run.paid_at,
    cancelledBy: run.cancelled_by,
    cancelledByName: run.cancelled_by_name,
    cancelledAt: run.cancelled_at,
    cancelReason: run.cancel_reason,
    voucherCount: run.voucher_count === undefined || run.voucher_count === null ? null : num(run.voucher_count),
  };
}

export interface StoredPayrollItem extends PayrollItem {
  sortOrder: number;
}

function rowToItem(row: Record<string, unknown>): StoredPayrollItem {
  const lines = parseJson<unknown>(row.lines_json, []);
  const warnings = parseJson<unknown>(row.warnings_json, []);
  return {
    employeeId: String(row.employee_id),
    employeeName: String(row.employee_name ?? ''),
    nationalId: row.national_id ? String(row.national_id) : null,
    baseSalary: num(row.base_salary),
    supervisorAllowance: num(row.supervisor_allowance),
    incentives: num(row.incentives),
    fixedSalary: num(row.fixed_salary),
    overtime: num(row.overtime),
    bonus: num(row.bonus),
    otherEarnings: num(row.other_earnings),
    totalEarnings: num(row.total_earnings),
    advances: num(row.advances),
    penalties: num(row.penalties),
    absenceDeductions: num(row.absence_deductions),
    otherDeductions: num(row.other_deductions),
    totalDeductions: num(row.total_deductions),
    netSalary: num(row.net_salary),
    lines: Array.isArray(lines) ? (lines as PayrollLine[]) : [],
    warnings: Array.isArray(warnings) ? warnings.map(String) : [],
    sortOrder: num(row.sort_order),
  };
}

export async function loadRunItems(db: D1Database, runId: string): Promise<StoredPayrollItem[]> {
  const result = await db
    .prepare('SELECT * FROM payroll_run_items WHERE run_id = ? ORDER BY sort_order, employee_name')
    .bind(runId)
    .all<Record<string, unknown>>();
  return (result.results ?? []).map(rowToItem);
}

// ---------------------------------------------------------------------------
// Guarded write statements (for db.batch)
// ---------------------------------------------------------------------------

/** Values the run header stores from a computation. */
export function runHeaderValues(result: PayrollResult) {
  return {
    employeeCount: result.employeeCount,
    totalEarnings: result.totals.totalEarnings,
    totalDeductions: result.totals.totalDeductions,
    totalNet: result.totals.netSalary,
    totalsJson: JSON.stringify(result.totals),
    activeColumnsJson: JSON.stringify(result.activeColumns),
    fingerprint: result.fingerprint,
  };
}

/** Inserts one sheet row; only fires while the run is still a draft (same transaction). */
export function itemInsertStatement(db: D1Database, runId: string, item: PayrollItem, sortOrder: number): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO payroll_run_items
         (id, run_id, employee_id, employee_name, national_id, sort_order,
          base_salary, supervisor_allowance, incentives, fixed_salary,
          overtime, bonus, other_earnings, total_earnings,
          advances, penalties, absence_deductions, other_deductions, total_deductions, net_salary,
          lines_json, warnings_json)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM payroll_runs WHERE id = ? AND status = 'draft')`,
    )
    .bind(
      newId('pri'),
      runId,
      item.employeeId,
      item.employeeName,
      item.nationalId ?? null,
      sortOrder,
      item.baseSalary,
      item.supervisorAllowance,
      item.incentives,
      item.fixedSalary,
      item.overtime,
      item.bonus,
      item.otherEarnings,
      item.totalEarnings,
      item.advances,
      item.penalties,
      item.absenceDeductions,
      item.otherDeductions,
      item.totalDeductions,
      item.netSalary,
      JSON.stringify(item.lines),
      JSON.stringify(item.warnings),
      runId,
    );
}

/**
 * Digest of the period's active ledger entries. Approval re-checks it inside
 * the approving UPDATE, so an entry added between the fingerprint check and
 * the approval makes the approval fail instead of approving a sheet without it.
 */
export const LEDGER_DIGEST_SQL = `(SELECT COUNT(*) || ':' || CAST(TOTAL(ROUND(amount * 100)) AS INTEGER) || ':' || IFNULL(MAX(rowid), 0)
   FROM payroll_adjustments WHERE branch_id = ? AND period = ? AND status = 'active')`;

export async function ledgerDigest(db: D1Database, branchId: string, period: string): Promise<string> {
  const row = await db.prepare(`SELECT ${LEDGER_DIGEST_SQL} AS digest`).bind(branchId, period).first<{ digest: unknown }>();
  return String(row?.digest ?? '');
}

/** A digest subquery, its parameters and the value read before computing. */
export interface DigestGuard {
  sql: string;
  params: unknown[];
  value: string;
}

/**
 * Digest of the month's approved weekly bonus records (same approval rule as
 * isBonusRecordApproved in payroll-data.ts). Approval reads it BEFORE
 * recomputing and re-checks it inside the approving UPDATE, like the ledger
 * digest, so a bonus approved mid-approval makes the approval fail instead of
 * approving a sheet without it. The SQL is built from the live columns: the
 * legacy bonus_records has no status column (approval = approved_by set).
 * Returns null when there is no usable bonus_records table (nothing to guard).
 */
export async function bonusDigest(db: D1Database, branchId: string, period: string): Promise<DigestGuard | null> {
  const p = parsePeriod(period);
  if (!p) return null;
  const columns = await getTableColumns(db, 'bonus_records');
  if (!columns.has('branch_id') || !columns.has('year') || !columns.has('month')) return null;

  const approvedBy = columns.has('approved_by') ? `COALESCE(approved_by, '') != ''` : '0';
  const approved = columns.has('status')
    ? `(status = 'approved' OR (COALESCE(status, '') NOT IN ('paid', 'rejected', 'cancelled') AND ${approvedBy}))`
    : `(${approvedBy})`;
  const parts = [
    'COUNT(*)',
    columns.has('approved_at') ? `IFNULL(MAX(approved_at), '')` : null,
    'IFNULL(MAX(rowid), 0)',
    columns.has('employee_bonuses') ? 'CAST(TOTAL(LENGTH(employee_bonuses)) AS INTEGER)' : null,
  ].filter((part): part is string => part !== null);
  const variants = monthVariants(p.month);
  const sql = `(SELECT ${parts.join(` || ':' || `)} FROM bonus_records
     WHERE branch_id = ? AND year = ? AND month IN (${variants.map(() => '?').join(', ')}) AND ${approved})`;
  const params: unknown[] = [branchId, p.year, ...variants];
  const row = await db.prepare(`SELECT ${sql} AS digest`).bind(...params).first<{ digest: unknown }>();
  return { sql, params, value: String(row?.digest ?? '') };
}

/**
 * Calendar day (YYYY-MM-DD) in Riyadh time (UTC+3) of a stored timestamp.
 * SQLite's datetime('now') is UTC without a zone ('YYYY-MM-DD HH:MM:SS'), so
 * slicing it would print the previous day for anything stamped after 21:00 UTC.
 * A plain date (no time part) is returned as is.
 */
export function riyadhDate(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const iso = text.replace(' ', 'T');
  const parsed = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(parsed.getTime()) ? text.slice(0, 10) : todayIso(parsed);
}

export function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed/i.test(message);
}

// ---------------------------------------------------------------------------
// Orphan adjustments (entries for employees who are not on the sheet)
// ---------------------------------------------------------------------------

const ORPHAN_REASONS = {
  missing: 'الموظف غير موجود في سجل الموظفين',
  other_branch: 'الموظف منقول إلى فرع آخر',
  inactive: 'الموظف غير نشط — لن يُصرف هذا البند',
  unknown: 'غير مدرج في المسير',
} as const;

export interface OrphanDetail {
  adjustmentId: string;
  employeeId: string;
  employeeName: string;
  category: string;
  categoryLabel: string;
  kind: 'earning' | 'deduction';
  amount: number;
  description: string | null;
  sourceType: string;
  reason: keyof typeof ORPHAN_REASONS;
  reasonAr: string;
}

export async function describeOrphans(
  db: D1Database,
  branchId: string,
  orphans: PayrollAdjustmentInput[],
): Promise<OrphanDetail[]> {
  if (orphans.length === 0) return [];
  const employeeIds = [...new Set(orphans.map(o => o.employeeId).filter(Boolean))].slice(0, 90);
  const employees = new Map<string, { name: string; branchId: string; active: boolean }>();
  if (employeeIds.length) {
    const rows = await db
      .prepare(`SELECT id, employee_name, branch_id, is_active FROM employees WHERE id IN (${employeeIds.map(() => '?').join(', ')})`)
      .bind(...employeeIds)
      .all<Record<string, unknown>>();
    for (const row of rows.results ?? []) {
      employees.set(String(row.id), {
        name: String(row.employee_name ?? ''),
        branchId: String(row.branch_id ?? ''),
        active: Number(row.is_active) === 1,
      });
    }
  }
  const ledgerIds = orphans.filter(o => o.sourceType === 'manual' || o.sourceType === 'request').map(o => o.id).slice(0, 90);
  const ledgerNames = new Map<string, string>();
  if (ledgerIds.length) {
    const rows = await db
      .prepare(`SELECT id, employee_name FROM payroll_adjustments WHERE id IN (${ledgerIds.map(() => '?').join(', ')})`)
      .bind(...ledgerIds)
      .all<{ id: string; employee_name: string }>();
    for (const row of rows.results ?? []) ledgerNames.set(String(row.id), String(row.employee_name ?? ''));
  }

  return orphans.map(o => {
    const emp = employees.get(o.employeeId);
    const fromBonusId = o.sourceType === 'bonus_record' ? o.id.split(':').slice(2).join(':') : '';
    const name = emp?.name || ledgerNames.get(o.id) || fromBonusId || o.employeeId || '—';
    const reason: OrphanDetail['reason'] = !emp
      ? 'missing'
      : emp.branchId !== branchId
        ? 'other_branch'
        : !emp.active
          ? 'inactive'
          : 'unknown';
    const info = ADJUSTMENT_CATEGORIES[o.category];
    return {
      adjustmentId: o.id,
      employeeId: o.employeeId,
      employeeName: name,
      category: o.category,
      categoryLabel: info?.labelAr ?? o.category,
      kind: info?.kind ?? 'earning',
      amount: o.amount,
      description: o.description ?? null,
      sourceType: o.sourceType,
      reason,
      reasonAr: ORPHAN_REASONS[reason],
    };
  });
}

// ---------------------------------------------------------------------------
// Vouchers of a run
// ---------------------------------------------------------------------------

export function payrollVoucherSourceId(runId: string, employeeId: string): string {
  return `${runId}:${employeeId}`;
}

/** SQL fragment (with two params: length+1, prefix) matching vouchers of a run by source id. */
export const RUN_VOUCHER_MATCH_SQL = `source_type = 'payroll' AND substr(source_id, 1, ?) = ?`;

export function runVoucherMatchParams(runId: string): [number, string] {
  return [runId.length + 1, `${runId}:`];
}

export interface RunVoucher {
  id: string;
  voucherNumber: string;
  employeeId: string | null;
  partyName: string;
  amount: number;
  status: string;
  paymentMethod: string;
  date: string;
}

export async function loadRunVouchers(db: D1Database, runId: string): Promise<RunVoucher[]> {
  const result = await db
    .prepare(
      `SELECT id, voucher_number, employee_id, party_name, amount, status, payment_method, voucher_date
       FROM financial_vouchers WHERE ${RUN_VOUCHER_MATCH_SQL}
       ORDER BY voucher_date, sequence_no`,
    )
    .bind(...runVoucherMatchParams(runId))
    .all<Record<string, unknown>>();
  return (result.results ?? []).map(row => ({
    id: String(row.id),
    voucherNumber: String(row.voucher_number),
    employeeId: row.employee_id ? String(row.employee_id) : null,
    partyName: String(row.party_name ?? ''),
    amount: num(row.amount),
    status: String(row.status),
    paymentMethod: String(row.payment_method),
    date: String(row.voucher_date),
  }));
}

/** Arabic explanation of why a run in `status` cannot take the requested action. */
export function statusMessage(status: PayrollRunStatus): string {
  switch (status) {
    case 'approved':
      return 'مسير الرواتب لهذه الفترة معتمد — لا يمكن تعديله إلا بعد إعادة فتحه من المدير';
    case 'paid':
      return 'مسير الرواتب لهذه الفترة تم صرفه — لا يمكن تعديله';
    case 'cancelled':
      return 'مسير الرواتب ملغي';
    default:
      return 'مسير الرواتب ما زال مسودة';
  }
}
