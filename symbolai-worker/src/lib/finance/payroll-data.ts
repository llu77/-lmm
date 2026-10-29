// Loads everything a branch's payroll for one period depends on and runs the
// pure engine over it. Server-only.

import type { D1Database } from '@cloudflare/workers-types';
import { isAdjustmentCategory, monthVariants, parsePeriod, type AdjustmentCategory } from './catalog';
import { toMinor } from './money';
import {
  computePayroll,
  type PayrollAdjustmentInput,
  type PayrollEmployeeInput,
  type PayrollResult,
} from './payroll-engine';
import { getTableColumns } from './schema';

export type PayrollRunStatus = 'draft' | 'approved' | 'paid' | 'cancelled';

export interface PayrollRunRow {
  id: string;
  branch_id: string;
  branch_name: string | null;
  period: string;
  status: PayrollRunStatus;
  employee_count: number;
  total_earnings: number;
  total_deductions: number;
  total_net: number;
  totals_json: string;
  active_columns_json: string;
  fingerprint: string;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  paid_by: string | null;
  paid_by_name: string | null;
  paid_at: string | null;
  cancelled_by: string | null;
  cancelled_by_name: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

export async function loadActiveEmployees(db: D1Database, branchId: string): Promise<PayrollEmployeeInput[]> {
  const result = await db
    .prepare(
      `SELECT id, employee_name, national_id, base_salary, supervisor_allowance, incentives
       FROM employees WHERE branch_id = ? AND is_active = 1`,
    )
    .bind(branchId)
    .all<Record<string, unknown>>();
  return (result.results ?? []).map(row => ({
    id: String(row.id),
    name: String(row.employee_name ?? ''),
    nationalId: row.national_id ? String(row.national_id) : null,
    baseSalary: Number(row.base_salary) || 0,
    supervisorAllowance: Number(row.supervisor_allowance) || 0,
    incentives: Number(row.incentives) || 0,
  }));
}

/** The one non-cancelled run for a branch+period, if any. */
export async function getOpenRun(db: D1Database, branchId: string, period: string): Promise<PayrollRunRow | null> {
  return db
    .prepare(`SELECT * FROM payroll_runs WHERE branch_id = ? AND period = ? AND status != 'cancelled' LIMIT 1`)
    .bind(branchId, period)
    .first<PayrollRunRow>();
}

/** A period is locked once its payroll is approved or paid; adjustments may no longer change. */
export async function isPeriodLocked(db: D1Database, branchId: string, period: string): Promise<boolean> {
  const run = await getOpenRun(db, branchId, period);
  return run !== null && (run.status === 'approved' || run.status === 'paid');
}

/** Ledger entries (overtime, advances, penalties, ...) for the period. */
export async function loadLedgerAdjustments(
  db: D1Database,
  branchId: string,
  period: string,
): Promise<PayrollAdjustmentInput[]> {
  const result = await db
    .prepare(
      `SELECT id, employee_id, category, amount, quantity, rate, description, source_type, source_id,
              installment_no, installment_count
       FROM payroll_adjustments
       WHERE branch_id = ? AND period = ? AND status = 'active'`,
    )
    .bind(branchId, period)
    .all<Record<string, unknown>>();

  const out: PayrollAdjustmentInput[] = [];
  for (const row of result.results ?? []) {
    const category = row.category;
    if (!isAdjustmentCategory(category)) continue;
    let description = row.description ? String(row.description) : null;
    if (row.installment_count && Number(row.installment_count) > 1) {
      const suffix = `قسط ${row.installment_no}/${row.installment_count}`;
      description = description ? `${description} — ${suffix}` : suffix;
    }
    out.push({
      id: String(row.id),
      employeeId: String(row.employee_id),
      category,
      amount: Number(row.amount) || 0,
      quantity: row.quantity === null || row.quantity === undefined ? null : Number(row.quantity),
      rate: row.rate === null || row.rate === undefined ? null : Number(row.rate),
      description,
      sourceType: row.source_type === 'request' ? 'request' : 'manual',
      sourceId: row.source_id ? String(row.source_id) : null,
    });
  }
  return out;
}

interface BonusEntry {
  employeeId?: unknown;
  employeeName?: unknown;
  bonusAmount?: unknown;
  totalRevenue?: unknown;
}

export function isBonusRecordApproved(row: Record<string, unknown>): boolean {
  const status = typeof row.status === 'string' ? row.status : null;
  if (status === 'approved') return true;
  if (status === 'paid' || status === 'rejected' || status === 'cancelled') return false;
  return row.approved_by !== null && row.approved_by !== undefined && row.approved_by !== '';
}

/**
 * Approved weekly bonus records of the month, turned into one 'bonus' line per
 * employee per week. Matched by employee id, falling back to the exact name.
 */
export async function loadApprovedBonuses(
  db: D1Database,
  branchId: string,
  period: string,
  employees: PayrollEmployeeInput[],
): Promise<PayrollAdjustmentInput[]> {
  const p = parsePeriod(period);
  if (!p) return [];
  const columns = await getTableColumns(db, 'bonus_records');
  if (columns.size === 0) return [];

  const variants = monthVariants(p.month);
  const result = await db
    .prepare(
      `SELECT * FROM bonus_records
       WHERE branch_id = ? AND year = ? AND month IN (${variants.map(() => '?').join(', ')})`,
    )
    .bind(branchId, p.year, ...variants)
    .all<Record<string, unknown>>();

  const byId = new Map(employees.map(e => [e.id, e]));
  const byName = new Map(employees.map(e => [normalizeName(e.name), e]));
  const out: PayrollAdjustmentInput[] = [];

  for (const row of result.results ?? []) {
    if (!isBonusRecordApproved(row)) continue;
    let entries: BonusEntry[] = [];
    try {
      const parsed = JSON.parse(String(row.employee_bonuses ?? '[]'));
      entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      continue;
    }
    for (const entry of entries) {
      const amount = Number(entry.bonusAmount) || 0;
      if (toMinor(amount) <= 0) continue;
      const employee =
        (typeof entry.employeeId === 'string' && byId.get(entry.employeeId)) ||
        (typeof entry.employeeName === 'string' && byName.get(normalizeName(entry.employeeName))) ||
        null;
      out.push({
        id: `bonus:${row.id}:${employee?.id ?? String(entry.employeeId ?? entry.employeeName ?? '')}`,
        employeeId: employee?.id ?? String(entry.employeeId ?? ''),
        category: 'bonus',
        amount,
        description: `بونص الأسبوع ${row.week_number ?? ''}`.trim(),
        sourceType: 'bonus_record',
        sourceId: String(row.id),
      });
    }
  }
  return out;
}

/**
 * Rows in the legacy `advances` / `deductions` tables (written by the old
 * advances page). Read-only: new entries go to payroll_adjustments.
 */
export async function loadLegacyAdvancesAndDeductions(
  db: D1Database,
  branchId: string,
  period: string,
): Promise<PayrollAdjustmentInput[]> {
  const p = parsePeriod(period);
  if (!p) return [];
  const out: PayrollAdjustmentInput[] = [];
  const variants = monthVariants(p.month);

  const sources: Array<{ table: 'advances' | 'deductions'; sourceType: 'legacy_advance' | 'legacy_deduction' }> = [
    { table: 'advances', sourceType: 'legacy_advance' },
    { table: 'deductions', sourceType: 'legacy_deduction' },
  ];

  for (const { table, sourceType } of sources) {
    const columns = await getTableColumns(db, table);
    if (!columns.has('employee_id') || !columns.has('amount') || !columns.has('month')) continue;
    const statusFilter = columns.has('status') ? `AND status = 'approved'` : '';
    const result = await db
      .prepare(
        `SELECT * FROM ${table}
         WHERE year = ? AND month IN (${variants.map(() => '?').join(', ')}) ${statusFilter}
           AND employee_id IN (SELECT id FROM employees WHERE branch_id = ?)`,
      )
      .bind(p.year, ...variants, branchId)
      .all<Record<string, unknown>>();

    for (const row of result.results ?? []) {
      const amount = Number(row.amount) || 0;
      if (toMinor(amount) <= 0) continue;
      let category: AdjustmentCategory = table === 'advances' ? 'advance' : 'other_deduction';
      const type = typeof row.deduction_type === 'string' ? row.deduction_type : '';
      if (table === 'deductions' && (type === 'absence' || type === 'violation')) category = type;
      const text = row.description ?? row.reason ?? null;
      out.push({
        id: `${table}:${row.id}`,
        employeeId: String(row.employee_id),
        category,
        amount,
        description: text ? String(text) : null,
        sourceType,
        sourceId: String(row.id),
      });
    }
  }
  return out;
}

export interface PayrollComputation extends PayrollResult {
  branchId: string;
  period: string;
  employees: PayrollEmployeeInput[];
}

/** Computes the payroll a branch would get for `period` right now. */
export async function computeBranchPayroll(
  db: D1Database,
  branchId: string,
  period: string,
): Promise<PayrollComputation> {
  const employees = await loadActiveEmployees(db, branchId);
  const [ledger, bonuses, legacy] = await Promise.all([
    loadLedgerAdjustments(db, branchId, period),
    loadApprovedBonuses(db, branchId, period, employees),
    loadLegacyAdvancesAndDeductions(db, branchId, period),
  ]);
  const result = computePayroll(employees, [...ledger, ...bonuses, ...legacy]);
  return { ...result, branchId, period, employees };
}

function normalizeName(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/[ً-ْـ]/g, '') // tashkeel + tatweel
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

export { normalizeName as normalizeArabicName };
