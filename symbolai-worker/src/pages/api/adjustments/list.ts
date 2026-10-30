// GET /api/adjustments/list?branchId&period=YYYY-MM[&employeeId][&category][&kind][&status=active|cancelled|all]
// Ledger entries of one branch and month, the read-only rows still sitting in
// the legacy advances/deductions tables (they flow into payroll too), whether
// the month is locked, and an exact (halala) summary of what payroll will pick up.

import type { APIRoute } from 'astro';
import { ADJUSTMENT_CATEGORIES, isAdjustmentCategory, parsePeriod, toPeriod } from '@/lib/finance/catalog';
import { fromMinor, round2, toMinor } from '@/lib/finance/money';
import { getOpenRun, loadLegacyAdvancesAndDeductions } from '@/lib/finance/payroll-data';
import { fail, financeAuth, ok, resolveBranchId } from '@/lib/finance/http';
import { canViewAdjustments, mapAdjustmentRow } from './create';

type StatusFilter = 'active' | 'cancelled' | 'all';

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;
  if (!canViewAdjustments(session)) return fail('صلاحيات غير كافية لعرض بيانات الرواتب', 403);

  const url = new URL(context.request.url);
  const q = (name: string) => (url.searchParams.get(name) ?? '').trim();

  const branchId = resolveBranchId(session, q('branchId'));
  if (branchId instanceof Response) return branchId;

  const p = parsePeriod(q('period'));
  if (!p) return fail('يرجى تحديد الشهر بصيغة YYYY-MM', 400);
  const period = toPeriod(p.year, p.month);

  const employeeId = q('employeeId');
  const category = q('category');
  if (category && !isAdjustmentCategory(category)) return fail('نوع البند غير معروف', 400);
  const kind = q('kind');
  if (kind && kind !== 'earning' && kind !== 'deduction') return fail('نوع الحركة غير صالح', 400);
  const statusParam = q('status') || 'active';
  if (statusParam !== 'active' && statusParam !== 'cancelled' && statusParam !== 'all') {
    return fail('حالة البند غير صالحة', 400);
  }
  const status = statusParam as StatusFilter;

  try {
    const where = ['branch_id = ?', 'period = ?'];
    const params: unknown[] = [branchId, period];
    if (employeeId) {
      where.push('employee_id = ?');
      params.push(employeeId);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (kind) {
      where.push('kind = ?');
      params.push(kind);
    }
    const result = await db
      .prepare(`SELECT * FROM payroll_adjustments WHERE ${where.join(' AND ')} ORDER BY created_at DESC, rowid DESC`)
      .bind(...params)
      .all<Record<string, unknown>>();
    const run = await getOpenRun(db, branchId, period);
    const locked = run !== null && (run.status === 'approved' || run.status === 'paid');
    // Once the month is approved, only employees on the sheet were paid. An
    // open entry of anyone else (left off as inactive or transferred) was never
    // paid or deducted: it stays cancellable and is not in the summary.
    let onSheet: Set<string> | null = null;
    if (locked && run) {
      const items = await db
        .prepare('SELECT employee_id FROM payroll_run_items WHERE run_id = ?')
        .bind(run.id)
        .all<{ employee_id: string }>();
      onSheet = new Set((items.results ?? []).map(r => String(r.employee_id)));
    }
    const all = (result.results ?? []).map(row => {
      const a = mapAdjustmentRow(row);
      const open = a.status === 'active' && !a.payrollRunId;
      const offSheet = open && onSheet !== null && !onSheet.has(a.employeeId);
      return { ...a, offSheet, cancellable: open && (onSheet === null || offSheet) };
    });
    const adjustments = status === 'all' ? all : all.filter(a => a.status === status);

    // Legacy rows are always deductions, cannot be cancelled and always count
    // toward payroll: they feed the summary whatever the status filter, and are
    // listed for every filter except "cancelled".
    const legacyRows =
      kind === 'earning'
        ? []
        : (await loadLegacyAdvancesAndDeductions(db, branchId, period)).filter(
            row => (!employeeId || row.employeeId === employeeId) && (!category || row.category === category),
          );
    let legacy: Array<{
      id: string;
      employeeId: string;
      employeeName: string;
      category: string;
      categoryLabel: string;
      amount: number;
      description: string | null;
      table: 'advances' | 'deductions';
    }> = [];
    if (status !== 'cancelled' && legacyRows.length > 0) {
      const names = await db
        .prepare('SELECT id, employee_name FROM employees WHERE branch_id = ?')
        .bind(branchId)
        .all<{ id: string; employee_name: string }>();
      const nameById = new Map((names.results ?? []).map(r => [String(r.id), String(r.employee_name ?? '')]));
      legacy = legacyRows.map(row => ({
        id: row.id,
        employeeId: row.employeeId,
        employeeName: nameById.get(row.employeeId) ?? '',
        category: row.category,
        categoryLabel: ADJUSTMENT_CATEGORIES[row.category]?.labelAr ?? row.category,
        amount: round2(row.amount),
        description: row.description ?? null,
        table: row.sourceType === 'legacy_advance' ? 'advances' : 'deductions',
      }));
    }

    // Summary of what payroll will pick up for the employee/category/kind
    // filters (active ledger + legacy), in halalas. Independent of the status
    // filter: it always describes what payroll will deduct, not what is listed.
    let earningsMinor = 0;
    let deductionsMinor = 0;
    let count = 0;
    const byCategoryMinor: Record<string, number> = {};
    const add = (cat: string, isEarning: boolean, amount: number) => {
      const minor = Math.abs(toMinor(amount));
      if (isEarning) earningsMinor += minor;
      else deductionsMinor += minor;
      byCategoryMinor[cat] = (byCategoryMinor[cat] ?? 0) + minor;
      count++;
    };
    for (const a of all) if (a.status === 'active' && !a.offSheet) add(a.category, a.kind === 'earning', a.amount);
    for (const l of legacyRows) add(l.category, false, l.amount);

    return ok({
      branchId,
      period,
      adjustments,
      legacy,
      locked,
      payrollRun: run ? { id: run.id, status: run.status } : null,
      summary: {
        earnings: fromMinor(earningsMinor),
        deductions: fromMinor(deductionsMinor),
        net: fromMinor(earningsMinor - deductionsMinor),
        count,
        byCategory: Object.fromEntries(Object.entries(byCategoryMinor).map(([k, v]) => [k, fromMinor(v)])),
      },
    });
  } catch (error) {
    console.error('List payroll adjustments error:', error);
    return fail('حدث خطأ أثناء تحميل البنود', 500);
  }
};
