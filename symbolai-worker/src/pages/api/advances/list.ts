// GET /api/advances/list?branchId[&period=YYYY-MM | &month&year | &year][&employeeId]
// Backward-compatible listing: active 'advance' entries of the payroll
// adjustments ledger plus rows still in the legacy `advances` table, scoped to
// one branch. Defaults to the current month. New code should use
// /api/adjustments/list.

import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  ADJUSTMENT_CATEGORIES,
  currentPeriod,
  isAdjustmentCategory,
  parseMonth,
  parsePeriod,
  toPeriod,
} from '@/lib/finance/catalog';
import { fromMinor, round2, toMinor } from '@/lib/finance/money';
import { loadLegacyAdvancesAndDeductions } from '@/lib/finance/payroll-data';
import { fail, financeAuth, ok, resolveBranchId } from '@/lib/finance/http';
import { canViewAdjustments } from '../adjustments/create';

export interface CompatRow {
  id: string;
  employee_id: string;
  employee_name: string;
  branch_id: string;
  amount: number;
  month: string;
  year: number;
  period: string;
  description: string | null;
  category: string;
  category_label: string;
  source: 'ledger' | 'legacy';
  source_type: string;
  status: string;
  installment_no: number | null;
  installment_count: number | null;
  created_by_name: string | null;
  created_at: string | null;
}

/** Which periods a legacy-style query asks for. */
export function compatPeriods(url: URL): string[] | null {
  const period = url.searchParams.get('period');
  if (period) {
    const p = parsePeriod(period);
    return p ? [toPeriod(p.year, p.month)] : null;
  }
  const monthParam = url.searchParams.get('month');
  const yearParam = url.searchParams.get('year');
  const month = monthParam ? parseMonth(monthParam) : null;
  if (monthParam && !month) return null;
  const year = yearParam ? Number(yearParam) : null;
  if (yearParam && (!Number.isInteger(year) || year! < 2000 || year! > 2100)) return null;
  const current = parsePeriod(currentPeriod())!;
  if (month) return [toPeriod(year ?? current.year, month)];
  if (year) return Array.from({ length: 12 }, (_, i) => toPeriod(year, i + 1));
  return [currentPeriod()];
}

/** Ledger + legacy rows of one kind, as legacy-shaped snake_case rows. */
export async function loadCompatRows(
  db: D1Database,
  branchId: string,
  periods: string[],
  which: 'advances' | 'deductions',
  employeeId: string,
): Promise<CompatRow[]> {
  const where = [
    'branch_id = ?',
    `period IN (${periods.map(() => '?').join(', ')})`,
    "status = 'active'",
    which === 'advances' ? "category = 'advance'" : "kind = 'deduction' AND category != 'advance'",
  ];
  const params: unknown[] = [branchId, ...periods];
  if (employeeId) {
    where.push('employee_id = ?');
    params.push(employeeId);
  }
  const ledger = await db
    .prepare(`SELECT * FROM payroll_adjustments WHERE ${where.join(' AND ')} ORDER BY period DESC, created_at DESC, rowid DESC`)
    .bind(...params)
    .all<Record<string, unknown>>();

  const rows: CompatRow[] = (ledger.results ?? []).map(row => {
    const period = String(row.period);
    const p = parsePeriod(period);
    const category = String(row.category);
    return {
      id: String(row.id),
      employee_id: String(row.employee_id),
      employee_name: String(row.employee_name ?? ''),
      branch_id: String(row.branch_id),
      amount: round2(row.amount),
      month: p ? String(p.month) : '',
      year: p ? p.year : 0,
      period,
      description: row.description ? String(row.description) : null,
      category,
      category_label: isAdjustmentCategory(category) ? ADJUSTMENT_CATEGORIES[category].labelAr : category,
      source: 'ledger',
      source_type: String(row.source_type ?? 'manual'),
      status: String(row.status ?? 'active'),
      installment_no: row.installment_no === null || row.installment_no === undefined ? null : Number(row.installment_no),
      installment_count: row.installment_count === null || row.installment_count === undefined ? null : Number(row.installment_count),
      created_by_name: row.created_by_name ? String(row.created_by_name) : null,
      created_at: row.created_at ? String(row.created_at) : null,
    };
  });

  const wantedSource = which === 'advances' ? 'legacy_advance' : 'legacy_deduction';
  let names: Map<string, string> | null = null;
  for (const period of [...periods].sort().reverse()) {
    const legacy = (await loadLegacyAdvancesAndDeductions(db, branchId, period)).filter(
      row => row.sourceType === wantedSource && (!employeeId || row.employeeId === employeeId),
    );
    if (legacy.length === 0) continue;
    if (!names) {
      const result = await db
        .prepare('SELECT id, employee_name FROM employees WHERE branch_id = ?')
        .bind(branchId)
        .all<{ id: string; employee_name: string }>();
      names = new Map((result.results ?? []).map(r => [String(r.id), String(r.employee_name ?? '')]));
    }
    const p = parsePeriod(period)!;
    for (const row of legacy) {
      rows.push({
        id: row.id,
        employee_id: row.employeeId,
        employee_name: names.get(row.employeeId) ?? '',
        branch_id: branchId,
        amount: round2(row.amount),
        month: String(p.month),
        year: p.year,
        period,
        description: row.description ?? null,
        category: row.category,
        category_label: ADJUSTMENT_CATEGORIES[row.category]?.labelAr ?? row.category,
        source: 'legacy',
        source_type: row.sourceType,
        status: 'active',
        installment_no: null,
        installment_count: null,
        created_by_name: null,
        created_at: null,
      });
    }
  }
  return rows;
}

export function sumAmounts(rows: Array<{ amount: number }>): number {
  return fromMinor(rows.reduce((sum, r) => sum + toMinor(r.amount), 0));
}

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;
  if (!canViewAdjustments(session)) return fail('صلاحيات غير كافية لعرض بيانات الرواتب', 403);

  const url = new URL(context.request.url);
  const branchId = resolveBranchId(session, url.searchParams.get('branchId'));
  if (branchId instanceof Response) return branchId;
  const periods = compatPeriods(url);
  if (!periods) return fail('الشهر أو السنة غير صالحة', 400);

  try {
    const advances = await loadCompatRows(db, branchId, periods, 'advances', (url.searchParams.get('employeeId') ?? '').trim());
    return ok({ advances, count: advances.length, total: sumAmounts(advances) });
  } catch (error) {
    console.error('List advances error:', error);
    return fail('حدث خطأ أثناء تحميل السلف', 500);
  }
};
