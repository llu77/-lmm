// Pure payroll computation. No I/O: the API layer loads employees and
// adjustments, this module turns them into a payroll sheet.
// All arithmetic is done in integer halalas to avoid floating-point drift.

import {
  ADJUSTMENT_CATEGORIES,
  type AdjustmentCategory,
  type AdjustmentKind,
  type PayrollColumn,
} from './catalog';
import { fromMinor, toMinor } from './money';

export interface PayrollEmployeeInput {
  id: string;
  name: string;
  nationalId?: string | null;
  baseSalary: number;
  supervisorAllowance: number;
  incentives: number;
}

/** Where an adjustment line came from, so prints and audits can trace it. */
export type AdjustmentSource =
  | 'manual'
  | 'request'
  | 'bonus_record'
  | 'legacy_advance'
  | 'legacy_deduction';

export interface PayrollAdjustmentInput {
  id: string;
  employeeId: string;
  category: AdjustmentCategory;
  amount: number;
  quantity?: number | null;
  rate?: number | null;
  description?: string | null;
  sourceType: AdjustmentSource;
  sourceId?: string | null;
}

export interface PayrollLine {
  adjustmentId: string;
  category: AdjustmentCategory;
  kind: AdjustmentKind;
  labelAr: string;
  labelEn: string;
  amount: number;
  quantity: number | null;
  rate: number | null;
  description: string | null;
  sourceType: AdjustmentSource;
  sourceId: string | null;
}

export interface PayrollItem {
  employeeId: string;
  employeeName: string;
  nationalId: string | null;
  baseSalary: number;
  supervisorAllowance: number;
  incentives: number;
  /** base + supervisor allowance + incentives (fixed monthly wage) */
  fixedSalary: number;
  overtime: number;
  bonus: number;
  otherEarnings: number;
  totalEarnings: number;
  advances: number;
  penalties: number;
  absenceDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  lines: PayrollLine[];
  warnings: string[];
}

export type PayrollTotals = Omit<PayrollItem, 'employeeId' | 'employeeName' | 'nationalId' | 'lines' | 'warnings'>;

export interface PayrollResult {
  items: PayrollItem[];
  totals: PayrollTotals;
  employeeCount: number;
  /** Optional columns that are non-zero for at least one employee (prints hide the empty ones). */
  activeColumns: PayrollColumn[];
  /** Adjustments that reference an employee who is not on this sheet. */
  orphanAdjustments: PayrollAdjustmentInput[];
  /** Stable hash of the inputs; a draft whose fingerprint no longer matches is stale. */
  fingerprint: string;
}

const NUMERIC_FIELDS = [
  'baseSalary', 'supervisorAllowance', 'incentives', 'fixedSalary',
  'overtime', 'bonus', 'otherEarnings', 'totalEarnings',
  'advances', 'penalties', 'absenceDeductions', 'otherDeductions',
  'totalDeductions', 'netSalary',
] as const satisfies readonly (keyof PayrollTotals)[];

const OPTIONAL_COLUMNS: PayrollColumn[] = [
  'overtime', 'bonus', 'otherEarnings', 'advances', 'penalties', 'absenceDeductions', 'otherDeductions',
];

function emptyTotalsMinor(): Record<keyof PayrollTotals, number> {
  return Object.fromEntries(NUMERIC_FIELDS.map(f => [f, 0])) as Record<keyof PayrollTotals, number>;
}

export function computePayroll(
  employees: PayrollEmployeeInput[],
  adjustments: PayrollAdjustmentInput[],
): PayrollResult {
  const byEmployee = new Map<string, PayrollAdjustmentInput[]>();
  const employeeIds = new Set(employees.map(e => e.id));
  const orphanAdjustments: PayrollAdjustmentInput[] = [];

  for (const adj of adjustments) {
    if (!ADJUSTMENT_CATEGORIES[adj.category]) continue;
    if (!employeeIds.has(adj.employeeId)) {
      orphanAdjustments.push(adj);
      continue;
    }
    const list = byEmployee.get(adj.employeeId) ?? [];
    list.push(adj);
    byEmployee.set(adj.employeeId, list);
  }

  const totalsMinor = emptyTotalsMinor();
  const items: PayrollItem[] = [];

  const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  for (const emp of sortedEmployees) {
    const m: Record<keyof PayrollTotals, number> = emptyTotalsMinor();
    m.baseSalary = toMinor(emp.baseSalary);
    m.supervisorAllowance = toMinor(emp.supervisorAllowance);
    m.incentives = toMinor(emp.incentives);
    m.fixedSalary = m.baseSalary + m.supervisorAllowance + m.incentives;

    const lines: PayrollLine[] = [];
    const empAdjustments = (byEmployee.get(emp.id) ?? []).slice().sort((a, b) =>
      a.category === b.category ? a.id.localeCompare(b.id) : a.category.localeCompare(b.category),
    );
    for (const adj of empAdjustments) {
      const info = ADJUSTMENT_CATEGORIES[adj.category];
      const amountMinor = Math.abs(toMinor(adj.amount));
      if (amountMinor === 0) continue;
      m[info.column] += amountMinor;
      lines.push({
        adjustmentId: adj.id,
        category: adj.category,
        kind: info.kind,
        labelAr: info.labelAr,
        labelEn: info.labelEn,
        amount: fromMinor(amountMinor),
        quantity: adj.quantity ?? null,
        rate: adj.rate ?? null,
        description: adj.description ?? null,
        sourceType: adj.sourceType,
        sourceId: adj.sourceId ?? null,
      });
    }

    m.totalEarnings = m.fixedSalary + m.overtime + m.bonus + m.otherEarnings;
    m.totalDeductions = m.advances + m.penalties + m.absenceDeductions + m.otherDeductions;
    m.netSalary = m.totalEarnings - m.totalDeductions;

    const warnings: string[] = [];
    if (m.netSalary < 0) warnings.push('الاستقطاعات تتجاوز المستحقات — صافي الراتب بالسالب');
    if (m.baseSalary === 0) warnings.push('لا يوجد راتب أساسي مسجل للموظف');

    for (const field of NUMERIC_FIELDS) totalsMinor[field] += m[field];

    items.push({
      employeeId: emp.id,
      employeeName: emp.name,
      nationalId: emp.nationalId ?? null,
      ...(Object.fromEntries(NUMERIC_FIELDS.map(f => [f, fromMinor(m[f])])) as PayrollTotals),
      lines,
      warnings,
    });
  }

  const totals = Object.fromEntries(NUMERIC_FIELDS.map(f => [f, fromMinor(totalsMinor[f])])) as PayrollTotals;
  const activeColumns = OPTIONAL_COLUMNS.filter(col => totalsMinor[col] !== 0);

  return {
    items,
    totals,
    employeeCount: items.length,
    activeColumns,
    orphanAdjustments,
    fingerprint: payrollFingerprint(employees, adjustments),
  };
}

/** Deterministic, order-independent digest of everything that affects the sheet. */
export function payrollFingerprint(
  employees: PayrollEmployeeInput[],
  adjustments: PayrollAdjustmentInput[],
): string {
  const emp = employees
    .map(e => [e.id, toMinor(e.baseSalary), toMinor(e.supervisorAllowance), toMinor(e.incentives)].join(':'))
    .sort();
  const adj = adjustments
    .map(a => [a.sourceType, a.id, a.employeeId, a.category, toMinor(a.amount)].join(':'))
    .sort();
  return fnv1a([...emp, '|', ...adj].join(';'));
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16).padStart(8, '0')}-${text.length.toString(16)}`;
}

/** Fixed monthly wage / 30 — the daily rate Saudi labour practice uses for absence deductions. */
export function dailyRate(emp: Pick<PayrollEmployeeInput, 'baseSalary' | 'supervisorAllowance' | 'incentives'>): number {
  const fixed = toMinor(emp.baseSalary) + toMinor(emp.supervisorAllowance) + toMinor(emp.incentives);
  return fromMinor(Math.round(fixed / 30));
}

/**
 * Suggested overtime hourly rate under Saudi Labour Law (Art. 107):
 * the hourly wage plus 50% of the basic hourly wage, on an 8-hour day.
 */
export function overtimeHourlyRate(
  emp: Pick<PayrollEmployeeInput, 'baseSalary' | 'supervisorAllowance' | 'incentives'>,
  hoursPerDay = 8,
): number {
  const fixed = toMinor(emp.baseSalary) + toMinor(emp.supervisorAllowance) + toMinor(emp.incentives);
  const hourly = fixed / 30 / hoursPerDay;
  const basicHourly = toMinor(emp.baseSalary) / 30 / hoursPerDay;
  return fromMinor(Math.round(hourly + basicHourly * 0.5));
}
