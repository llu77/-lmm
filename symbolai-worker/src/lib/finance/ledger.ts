// Writes to the payroll adjustments ledger (payroll_adjustments): overtime,
// advances, penalties, unpaid leave, arrears, ... Every insert refuses to land
// in a period whose payroll is already approved or paid, inside the same
// statement, so a concurrent approval cannot slip an entry into a closed month.
// Server-only.

import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { ADJUSTMENT_CATEGORIES, addMonths, type AdjustmentCategory } from './catalog';
import { splitInstallments } from './money';
import { newId } from './http';

export interface NewAdjustment {
  id?: string;
  branchId: string;
  employeeId: string;
  employeeName: string;
  period: string;
  category: AdjustmentCategory;
  amount: number;
  quantity?: number | null;
  rate?: number | null;
  description?: string | null;
  sourceType: 'manual' | 'request';
  sourceId?: string | null;
  installmentNo?: number | null;
  installmentCount?: number | null;
  createdBy: string;
  createdByName: string;
}

/** Extra condition (SQL + params) that must hold for the insert to happen. */
export interface SqlGuard {
  sql: string;
  params: unknown[];
}

export const OPEN_PERIOD_GUARD_SQL = `NOT EXISTS (
  SELECT 1 FROM payroll_runs pr
  WHERE pr.branch_id = ? AND pr.period = ? AND pr.status IN ('approved', 'paid'))`;

/**
 * INSERT ... SELECT that only fires when the period is open (and `guard`, if
 * given, holds). Entries with a sourceId are idempotent (INSERT OR IGNORE on
 * the unique source index).
 */
export function adjustmentInsertStatement(db: D1Database, adj: NewAdjustment, guard?: SqlGuard): D1PreparedStatement {
  const kind = ADJUSTMENT_CATEGORIES[adj.category].kind;
  const verb = adj.sourceId ? 'INSERT OR IGNORE' : 'INSERT';
  const where = [OPEN_PERIOD_GUARD_SQL, ...(guard ? [`(${guard.sql})`] : [])].join(' AND ');
  return db
    .prepare(
      `${verb} INTO payroll_adjustments
         (id, branch_id, employee_id, employee_name, period, kind, category, amount, quantity, rate, description,
          source_type, source_id, installment_no, installment_count, created_by, created_by_name)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE ${where}`,
    )
    .bind(
      adj.id ?? newId('adj'),
      adj.branchId,
      adj.employeeId,
      adj.employeeName,
      adj.period,
      kind,
      adj.category,
      adj.amount,
      adj.quantity ?? null,
      adj.rate ?? null,
      adj.description ?? null,
      adj.sourceType,
      adj.sourceId ?? null,
      adj.installmentNo ?? null,
      adj.installmentCount ?? null,
      adj.createdBy,
      adj.createdByName,
      adj.branchId,
      adj.period,
      ...(guard?.params ?? []),
    );
}

export interface InstallmentPlanEntry {
  period: string;
  amount: number;
  installmentNo: number;
  installmentCount: number;
}

/** Spreads `total` over `count` consecutive months starting at `startPeriod`. */
export function planInstallments(total: number, count: number, startPeriod: string): InstallmentPlanEntry[] {
  const n = Math.min(Math.max(1, Math.floor(count)), 24);
  return splitInstallments(total, n).map((amount, i) => ({
    period: addMonths(startPeriod, i),
    amount,
    installmentNo: i + 1,
    installmentCount: n,
  }));
}

/** Returns the first of `periods` whose payroll is approved/paid for the branch, or null. */
export async function findLockedPeriod(db: D1Database, branchId: string, periods: string[]): Promise<string | null> {
  const unique = [...new Set(periods)];
  if (unique.length === 0) return null;
  const row = await db
    .prepare(
      `SELECT period FROM payroll_runs
       WHERE branch_id = ? AND status IN ('approved', 'paid') AND period IN (${unique.map(() => '?').join(', ')})
       ORDER BY period LIMIT 1`,
    )
    .bind(branchId, ...unique)
    .first<{ period: string }>();
  return row?.period ?? null;
}

/** First period at or after `from` whose payroll for the branch is still open. */
export async function firstOpenPeriod(db: D1Database, branchId: string, from: string): Promise<string> {
  const result = await db
    .prepare(`SELECT period FROM payroll_runs WHERE branch_id = ? AND status IN ('approved', 'paid') AND period >= ?`)
    .bind(branchId, from)
    .all<{ period: string }>();
  const locked = new Set((result.results ?? []).map(r => r.period));
  let period = from;
  for (let i = 0; i < 36 && locked.has(period); i++) period = addMonths(period, 1);
  return period;
}

/** Employee row scoped to a branch (null if missing or in another branch). */
export async function getBranchEmployee(
  db: D1Database,
  employeeId: string,
): Promise<{ id: string; name: string; branchId: string; nationalId: string | null; isActive: boolean; baseSalary: number; supervisorAllowance: number; incentives: number } | null> {
  const row = await db
    .prepare('SELECT id, employee_name, branch_id, national_id, is_active, base_salary, supervisor_allowance, incentives FROM employees WHERE id = ?')
    .bind(employeeId)
    .first<Record<string, unknown>>();
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.employee_name ?? ''),
    branchId: String(row.branch_id ?? ''),
    nationalId: row.national_id ? String(row.national_id) : null,
    isActive: Number(row.is_active) === 1,
    baseSalary: Number(row.base_salary) || 0,
    supervisorAllowance: Number(row.supervisor_allowance) || 0,
    incentives: Number(row.incentives) || 0,
  };
}
