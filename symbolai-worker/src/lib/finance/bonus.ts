// Weekly revenue bonus (البونص الأسبوعي).
//
// - Tiers: set by the manager, stored in organization_settings['bonus_tiers'].
// - Weeks: days 1-7, 8-14, 15-21, 22-28 and 29-end of month (no week 5 in a
//   28-day February).
// - Revenue: read from the `revenues` rows the cashier integration writes
//   (revenues.employees JSON, in whatever shape it comes) and, when present,
//   the revenue_employee_contributions table of migration 008.
// - Persistence: bonus_records, whose columns differ between the 008 and the
//   legacy schema; every statement here adapts to the live columns.
//
// The pure helpers (tiers, weeks, parsing) are browser-safe: this module must
// not import server-only code (http.ts, notify.ts, permissions).

import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { MONTH_NAMES_AR, daysInPeriod, monthVariants, parseMonth, parsePeriod, periodLabelAr, toPeriod, todayIso } from './catalog';
import { formatAmount, fromMinor, parsePositiveAmount, toMinor } from './money';
import { isPeriodLocked, normalizeArabicName } from './payroll-data';
import { buildAdaptiveInsert, getTableColumns } from './schema';
import { isLaterBonusApproval, isPayableBonusRow, pickPayableBonusRows, type BonusRecordRow } from './bonus-select';
// Type-only: ledger.ts is server-only and must not be bundled into pages that use this module.
import type { NewAdjustment, SqlGuard } from './ledger';

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------

export interface BonusTier {
  /** Weekly revenue (SAR) the employee must reach. */
  minRevenue: number;
  /** Bonus (SAR) paid for reaching it. */
  amount: number;
}

/** The rules that were hardcoded before the manager could edit them. */
export const DEFAULT_BONUS_TIERS: readonly BonusTier[] = Object.freeze([
  Object.freeze({ minRevenue: 1300, amount: 50 }),
  Object.freeze({ minRevenue: 1800, amount: 100 }),
  Object.freeze({ minRevenue: 2400, amount: 175 }),
]);

export const BONUS_TIERS_SETTING_KEY = 'bonus_tiers';
export const MAX_BONUS_TIERS = 10;

export type TierValidation =
  | { ok: true; tiers: BonusTier[]; error?: undefined; index?: undefined }
  | { ok: false; error: string; /** 0-based index of the offending input row, if any */ index?: number; tiers?: undefined };

function sar(value: number): string {
  return `${formatAmount(value)} ر.س`;
}

/**
 * Validates tiers typed by the manager: 1-10 rows, positive amounts with at
 * most 2 decimals, distinct revenue thresholds, and a bonus that never drops
 * as revenue rises. Returns them sorted by threshold.
 */
export function validateTiers(input: unknown): TierValidation {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: 'أضف شريحة واحدة على الأقل' };
  if (input.length > MAX_BONUS_TIERS) return { ok: false, error: `الحد الأقصى ${MAX_BONUS_TIERS} شرائح` };

  const rows: Array<BonusTier & { index: number }> = [];
  for (let i = 0; i < input.length; i++) {
    const row = input[i];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, error: `الشريحة ${i + 1}: بيانات غير صالحة`, index: i };
    }
    const record = row as Record<string, unknown>;
    const minRevenue = parsePositiveAmount(record.minRevenue);
    if (minRevenue === null) {
      return {
        ok: false,
        error: `الشريحة ${i + 1}: حد الإيراد يجب أن يكون رقماً أكبر من صفر (بحد أقصى خانتين عشريتين)`,
        index: i,
      };
    }
    const amount = parsePositiveAmount(record.amount);
    if (amount === null) {
      return {
        ok: false,
        error: `الشريحة ${i + 1}: مبلغ البونص يجب أن يكون رقماً أكبر من صفر (بحد أقصى خانتين عشريتين)`,
        index: i,
      };
    }
    rows.push({ minRevenue, amount, index: i });
  }

  rows.sort((a, b) => toMinor(a.minRevenue) - toMinor(b.minRevenue) || a.index - b.index);
  for (let k = 1; k < rows.length; k++) {
    const prev = rows[k - 1];
    const cur = rows[k];
    if (toMinor(cur.minRevenue) === toMinor(prev.minRevenue)) {
      return { ok: false, error: `حد الإيراد ${sar(cur.minRevenue)} مكرر في أكثر من شريحة`, index: cur.index };
    }
    if (toMinor(cur.amount) < toMinor(prev.amount)) {
      return {
        ok: false,
        error: `بونص شريحة ${sar(cur.minRevenue)} (${sar(cur.amount)}) يجب ألا يقل عن بونص الشريحة الأدنى ${sar(prev.minRevenue)} (${sar(prev.amount)})`,
        index: cur.index,
      };
    }
  }
  return { ok: true, tiers: rows.map(({ minRevenue, amount }) => ({ minRevenue, amount })) };
}

export interface TierEvaluation {
  /** Bonus earned (0 when no tier is reached). */
  amount: number;
  tier: BonusTier | null;
  nextTier: BonusTier | null;
  /** Revenue still missing to reach the next tier; null at the top tier. */
  remainingToNext: number | null;
  /** 0..1 progress from zero revenue toward the next tier (1 at the top tier). */
  progressToNext: number;
}

/** The highest tier `revenue` reaches. Compared in halalas, so 1299.999 never rounds into 1300. */
export function evaluateTier(revenue: number, tiers: readonly BonusTier[]): TierEvaluation {
  const sorted = [...tiers].sort((a, b) => toMinor(a.minRevenue) - toMinor(b.minRevenue));
  const rev = toMinor(revenue);
  let tier: BonusTier | null = null;
  let nextTier: BonusTier | null = null;
  for (const t of sorted) {
    if (toMinor(t.minRevenue) <= rev) tier = t;
    else {
      nextTier = t;
      break;
    }
  }
  const nextMinor = nextTier ? toMinor(nextTier.minRevenue) : 0;
  return {
    amount: tier ? tier.amount : 0,
    tier,
    nextTier,
    remainingToNext: nextTier ? fromMinor(nextMinor - rev) : null,
    progressToNext: nextTier ? Math.max(0, Math.min(1, rev / nextMinor)) : 1,
  };
}

export interface StoredBonusTiers {
  tiers: BonusTier[];
  isDefault: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  /** True when a stored value exists but could not be used (defaults applied). */
  invalidStored: boolean;
}

function defaultTiers(): BonusTier[] {
  return DEFAULT_BONUS_TIERS.map(t => ({ minRevenue: t.minRevenue, amount: t.amount }));
}

/** The manager's tiers, or the defaults when none were saved. DB errors propagate. */
export async function getBonusTiers(db: D1Database): Promise<StoredBonusTiers> {
  const row = await db
    .prepare('SELECT value, updated_by, updated_at FROM organization_settings WHERE key = ?')
    .bind(BONUS_TIERS_SETTING_KEY)
    .first<{ value: string | null; updated_by: string | null; updated_at: string | null }>();
  if (row?.value) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(row.value);
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) parsed = (parsed as Record<string, unknown>).tiers;
    const result = validateTiers(parsed);
    if (result.ok) {
      return { tiers: result.tiers, isDefault: false, updatedAt: row.updated_at, updatedBy: row.updated_by, invalidStored: false };
    }
    console.error('Stored bonus tiers are invalid, using defaults:', result.error);
    return { tiers: defaultTiers(), isDefault: true, updatedAt: row.updated_at, updatedBy: row.updated_by, invalidStored: true };
  }
  return { tiers: defaultTiers(), isDefault: true, updatedAt: null, updatedBy: null, invalidStored: false };
}

/** Validates and stores the tiers. Throws with the Arabic validation message on bad input. */
export async function saveBonusTiers(db: D1Database, tiers: unknown, userId: string): Promise<BonusTier[]> {
  const result = validateTiers(tiers);
  if (!result.ok) throw new Error(result.error);
  await db
    .prepare(
      `INSERT INTO organization_settings (key, value, updated_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    )
    .bind(BONUS_TIERS_SETTING_KEY, JSON.stringify(result.tiers), userId)
    .run();
  return result.tiers;
}

/** Forgets the manager's tiers so the defaults apply again. */
export async function resetBonusTiers(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM organization_settings WHERE key = ?').bind(BONUS_TIERS_SETTING_KEY).run();
}

// ---------------------------------------------------------------------------
// Weeks
// ---------------------------------------------------------------------------

export const BONUS_WEEKS = [1, 2, 3, 4, 5] as const;

export interface WeekRange {
  week: number;
  /** ISO dates, inclusive. */
  start: string;
  end: string;
  startDay: number;
  endDay: number;
  days: number;
}

/** Week `week` (1-5) of a 'YYYY-MM' period, or null if it does not exist (e.g. week 5 of a 28-day month). */
export function weekRange(period: string, week: number): WeekRange | null {
  const p = parsePeriod(period);
  if (!p || !Number.isInteger(week) || week < 1 || week > 5) return null;
  const monthDays = daysInPeriod(period);
  const startDay = (week - 1) * 7 + 1;
  if (startDay > monthDays) return null;
  const endDay = week === 5 ? monthDays : startDay + 6;
  const prefix = toPeriod(p.year, p.month);
  const day = (d: number) => `${prefix}-${String(d).padStart(2, '0')}`;
  return { week, start: day(startDay), end: day(endDay), startDay, endDay, days: endDay - startDay + 1 };
}

export function weeksOfPeriod(period: string): WeekRange[] {
  return BONUS_WEEKS.map(w => weekRange(period, w)).filter((r): r is WeekRange => r !== null);
}

/**
 * A week is complete once its last day is over in Riyadh, i.e. the cashier
 * has closed every day of it.
 */
export function isWeekComplete(range: Pick<WeekRange, 'end'>, today: string = todayIso()): boolean {
  return range.end < today;
}

/** "1 – 7 أكتوبر" */
export function weekLabelAr(period: string, range: Pick<WeekRange, 'startDay' | 'endDay'>): string {
  const p = parsePeriod(period);
  const month = p ? MONTH_NAMES_AR[p.month - 1] : '';
  return range.startDay === range.endDay ? `${range.startDay} ${month}` : `${range.startDay} – ${range.endDay} ${month}`;
}

export function parseWeekNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\s*\d\s*$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Revenue parsing (revenues.employees as written by the cashier / legacy UI)
// ---------------------------------------------------------------------------

export interface RevenueShare {
  name: string | null;
  employeeId: string | null;
  /** Halalas, never 0. Negative = a refund/correction line, netted against the employee's sales. */
  amountMinor: number;
}

const NAME_KEYS = ['name', 'employeeName', 'employee_name', 'employee', 'cashierName', 'cashier_name', 'cashier', 'fullName', 'full_name'];
const AMOUNT_KEYS = ['revenue', 'amount', 'total', 'sales', 'value', 'totalRevenue', 'total_revenue', 'totalSales', 'total_sales'];
const ID_KEYS = ['employeeId', 'employee_id', 'employeeID', 'empId', 'emp_id', 'id'];
const WRAPPER_KEYS = ['employees', 'items', 'data', 'staff', 'breakdown', 'contributions'];
/** Keys of a revenue-row-like object that are never employee names in the {"name": amount} map form. */
const MAP_SKIP_KEYS = new Set([
  ...AMOUNT_KEYS, ...ID_KEYS, 'date', 'branch', 'branchId', 'branch_id', 'cash', 'network', 'budget', 'card', 'count',
  'notes', 'note', 'currency', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'source',
]);

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

/** Number or numeric string ("1,300.50", "١٣٠٠", "1300 ر.س"); null for anything else. */
export function parseLooseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  let text = value.replace(/[٠-٩۰-۹]/g, d => ARABIC_DIGITS[d] ?? d);
  text = text
    .replace(/ر\.?\s?س\.?|ريال|SAR|SR/gi, '')
    .replace(/[,٬\s]/g, '')
    .replace(/٫/g, '.');
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim().slice(0, 120);
  return text ? text : null;
}

function cleanId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, 120);
  return text ? text : null;
}

function firstAmount(obj: Record<string, unknown>): number | null {
  for (const key of AMOUNT_KEYS) {
    if (key in obj) {
      const n = parseLooseAmount(obj[key]);
      if (n !== null) return n;
    }
  }
  return null;
}

function shareFromObject(obj: Record<string, unknown>): RevenueShare | null {
  let name: string | null = null;
  let employeeId: string | null = null;
  for (const key of NAME_KEYS) {
    const v = obj[key];
    if (isPlainObject(v)) {
      // {"employee": {"id": "emp_1", "name": "أحمد"}}
      name = name ?? cleanName(v.name ?? v.employeeName ?? v.employee_name ?? v.fullName ?? v.full_name);
      employeeId = employeeId ?? cleanId(v.id ?? v.employeeId ?? v.employee_id);
    } else if (!name) {
      name = cleanName(v);
    }
  }
  for (const key of ID_KEYS) {
    if (employeeId) break;
    employeeId = cleanId(obj[key]);
  }
  const amount = firstAmount(obj);
  if ((!name && !employeeId) || amount === null) return null;
  const amountMinor = toMinor(amount);
  return amountMinor !== 0 ? { name, employeeId, amountMinor } : null;
}

function looksLikeEntry(obj: Record<string, unknown>): boolean {
  const hasWho = [...NAME_KEYS, ...ID_KEYS].some(k => k in obj && !Array.isArray(obj[k]));
  return hasWho && firstAmount(obj) !== null;
}

function collectShares(value: unknown, depth: number): RevenueShare[] {
  if (depth > 4 || value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    const out: RevenueShare[] = [];
    for (const item of value) {
      if (isPlainObject(item)) {
        if (looksLikeEntry(item)) {
          const share = shareFromObject(item);
          if (share) out.push(share);
        } else {
          out.push(...collectShares(item, depth + 1));
        }
      } else if (Array.isArray(item) && item.length >= 2 && typeof item[0] === 'string') {
        // ["أحمد", 1500]
        const name = cleanName(item[0]);
        const amount = parseLooseAmount(item[1]);
        const amountMinor = amount === null ? 0 : toMinor(amount);
        if (name && amountMinor !== 0) out.push({ name, employeeId: null, amountMinor });
      }
    }
    return out;
  }
  if (!isPlainObject(value)) return [];
  const wrapperKey = WRAPPER_KEYS.find(k => Array.isArray(value[k]) || isPlainObject(value[k]));
  const hasName = NAME_KEYS.some(k => typeof value[k] === 'string' && (value[k] as string).trim() !== '');
  // {"date": "...", "total": 900, "employees": [...]} is a wrapper, not an entry.
  if (wrapperKey && !hasName) return collectShares(value[wrapperKey], depth + 1);
  if (looksLikeEntry(value)) {
    const share = shareFromObject(value);
    return share ? [share] : [];
  }
  if (wrapperKey) return collectShares(value[wrapperKey], depth + 1);

  // Map form: {"أحمد علي": 1500, "محمد": {"revenue": 900}}
  const out: RevenueShare[] = [];
  for (const [key, v] of Object.entries(value)) {
    if (MAP_SKIP_KEYS.has(key)) continue;
    if (isPlainObject(v) && looksLikeEntry(v)) {
      const share = shareFromObject(v);
      if (share) out.push(share);
      continue;
    }
    const name = cleanName(key);
    if (!name) continue;
    let amount = parseLooseAmount(v);
    let employeeId: string | null = null;
    if (amount === null && isPlainObject(v)) {
      amount = firstAmount(v);
      employeeId = cleanId(v.employeeId ?? v.employee_id ?? v.id);
    }
    const amountMinor = amount === null ? 0 : toMinor(amount);
    if (amountMinor !== 0) out.push({ name, employeeId, amountMinor });
  }
  return out;
}

/**
 * Per-employee revenue shares from a revenues.employees value. Accepts JSON text
 * (also double-encoded), arrays of objects with any of the usual key spellings,
 * [name, amount] pairs, wrapper objects and {"name": amount} maps. Garbage → [].
 * Negative lines (refunds) are kept: attributeRevenue nets them per employee.
 */
export function parseRevenueEmployees(raw: unknown): RevenueShare[] {
  let value: unknown = raw;
  for (let i = 0; i < 3 && typeof value === 'string'; i++) {
    const text = value.trim();
    if (!text) return [];
    try {
      value = JSON.parse(text);
    } catch {
      return [];
    }
  }
  try {
    return collectShares(value, 0);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Weekly computation
// ---------------------------------------------------------------------------

export interface BranchEmployeeRef {
  id: string;
  name: string;
  active: boolean;
}

export type UnmatchedReason = 'unknown' | 'inactive' | 'ambiguous' | 'other_branch';

export interface UnmatchedRevenue {
  name: string;
  totalRevenue: number;
  reason: UnmatchedReason;
}

export interface AttributionResult {
  /** employee id → halalas, net of refunds and never negative (active branch employees only) */
  byEmployee: Map<string, number>;
  unmatched: UnmatchedRevenue[];
  attributedMinor: number;
}

/**
 * Credits shares to branch employees: by id first, then by normalized Arabic
 * name. A share whose id belongs to a known employee is settled by that id
 * alone — an employee of another branch (`otherBranch`: id → name) or an
 * inactive one is reported as unmatched and never credited to a namesake.
 * Name matching is only for shares without an id or with an unknown id.
 * Every employee's lines (sales and refunds) are netted, and the net is
 * clamped at zero.
 */
export function attributeRevenue(
  shares: RevenueShare[],
  employees: BranchEmployeeRef[],
  otherBranch: ReadonlyMap<string, string> = new Map(),
): AttributionResult {
  const byId = new Map(employees.map(e => [e.id, e]));
  const byName = new Map<string, BranchEmployeeRef[]>();
  for (const e of employees) {
    const key = normalizeArabicName(e.name);
    if (!key) continue;
    byName.set(key, [...(byName.get(key) ?? []), e]);
  }

  const credited = new Map<string, number>();
  const unmatched = new Map<string, { name: string; minor: number; reason: UnmatchedReason }>();

  const addUnmatched = (name: string, minor: number, reason: UnmatchedReason) => {
    const key = `${reason}:${normalizeArabicName(name)}`;
    const entry = unmatched.get(key) ?? { name, minor: 0, reason };
    entry.minor += minor;
    unmatched.set(key, entry);
  };

  for (const share of shares) {
    if (!share.amountMinor) continue;
    let employee: BranchEmployeeRef | null = null;
    let reason: UnmatchedReason = 'unknown';
    if (share.employeeId && byId.has(share.employeeId)) {
      employee = byId.get(share.employeeId)!;
    } else if (share.employeeId && otherBranch.has(share.employeeId)) {
      const known = otherBranch.get(share.employeeId);
      addUnmatched(share.name ?? (known || share.employeeId), share.amountMinor, 'other_branch');
      continue;
    } else if (share.name) {
      const candidates = byName.get(normalizeArabicName(share.name)) ?? [];
      const active = candidates.filter(c => c.active);
      if (active.length === 1) employee = active[0];
      else if (active.length > 1) reason = 'ambiguous';
      else if (candidates.length === 1) employee = candidates[0];
      else if (candidates.length > 1) reason = 'ambiguous';
    }
    if (employee && !employee.active) {
      addUnmatched(employee.name, share.amountMinor, 'inactive');
      continue;
    }
    if (!employee) {
      addUnmatched(share.name ?? share.employeeId ?? '—', share.amountMinor, reason);
      continue;
    }
    credited.set(employee.id, (credited.get(employee.id) ?? 0) + share.amountMinor);
  }

  // Refunds lower an employee's revenue but never below zero.
  const byEmployee = new Map<string, number>();
  let attributedMinor = 0;
  for (const [id, minor] of credited) {
    if (minor <= 0) continue;
    byEmployee.set(id, minor);
    attributedMinor += minor;
  }

  return {
    byEmployee,
    unmatched: [...unmatched.values()]
      .filter(u => u.minor > 0)
      .map(u => ({ name: u.name, totalRevenue: fromMinor(u.minor), reason: u.reason }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue),
    attributedMinor,
  };
}

/** One employee's line; also the shape stored in bonus_records.employee_bonuses (payroll reads it). */
export interface BonusEntry {
  employeeId: string;
  employeeName: string;
  totalRevenue: number;
  bonusAmount: number;
  tierMinRevenue: number | null;
  nextTierMinRevenue: number | null;
  nextTierAmount: number | null;
  remainingToNext: number | null;
  progressToNext: number;
}

export interface WeekBonusComputation {
  branchId: string;
  period: string;
  week: number;
  range: WeekRange;
  complete: boolean;
  revenueRowCount: number;
  daysWithRevenue: number;
  /** Sum of revenues.total in the week. */
  branchRevenue: number;
  /** Revenue credited to active branch employees. */
  attributedRevenue: number;
  /** Revenue rows that carry no per-employee breakdown (they cannot earn a bonus). */
  rowsWithoutBreakdown: number;
  employees: BonusEntry[];
  unmatched: UnmatchedRevenue[];
  totalBonus: number;
  eligibleCount: number;
  tiers: BonusTier[];
}

async function loadBranchEmployees(db: D1Database, branchId: string): Promise<BranchEmployeeRef[]> {
  const columns = await getTableColumns(db, 'employees');
  if (columns.size === 0) return [];
  const activeExpr = columns.has('is_active') ? 'is_active' : '1';
  const result = await db
    .prepare(`SELECT id, employee_name, ${activeExpr} AS is_active FROM employees WHERE branch_id = ?`)
    .bind(branchId)
    .all<Record<string, unknown>>();
  return (result.results ?? []).map(row => ({
    id: String(row.id),
    name: String(row.employee_name ?? ''),
    active: row.is_active === null || row.is_active === undefined ? true : Number(row.is_active) === 1,
  }));
}

/**
 * Computes the bonus of every active employee of the branch for one week,
 * straight from the revenue rows. Returns null if the week does not exist.
 */
export async function computeWeekBonus(
  db: D1Database,
  branchId: string,
  period: string,
  week: number,
  tiers: readonly BonusTier[],
  today: string = todayIso(),
): Promise<WeekBonusComputation | null> {
  const range = weekRange(period, week);
  if (!range) return null;

  const [revenueColumns, contributionColumns, employees] = await Promise.all([
    getTableColumns(db, 'revenues'),
    getTableColumns(db, 'revenue_employee_contributions'),
    loadBranchEmployees(db, branchId),
  ]);

  // Dates may carry a time part ('2026-10-07 14:00:00'), hence the half-open range.
  const endExclusive = nextDay(range.end);
  let revenueRows: Array<Record<string, unknown>> = [];
  if (revenueColumns.has('branch_id') && revenueColumns.has('date')) {
    const totalExpr = revenueColumns.has('total') ? 'total' : '0';
    const employeesExpr = revenueColumns.has('employees') ? 'employees' : 'NULL';
    const result = await db
      .prepare(
        `SELECT id, date, ${totalExpr} AS total, ${employeesExpr} AS employees
         FROM revenues WHERE branch_id = ? AND date >= ? AND date < ?`,
      )
      .bind(branchId, range.start, endExclusive)
      .all<Record<string, unknown>>();
    revenueRows = result.results ?? [];
  }

  // revenue_employee_contributions (migration 008) wins over the JSON of the same revenue row.
  const contributionsByRevenue = new Map<string, RevenueShare[]>();
  if (contributionColumns.has('revenue_id') && contributionColumns.has('employee_id') && contributionColumns.has('amount')) {
    const result = await db
      .prepare(
        `SELECT c.revenue_id, c.employee_id, c.amount
         FROM revenue_employee_contributions c
         JOIN revenues r ON r.id = c.revenue_id
         WHERE r.branch_id = ? AND r.date >= ? AND r.date < ?`,
      )
      .bind(branchId, range.start, endExclusive)
      .all<Record<string, unknown>>();
    for (const row of result.results ?? []) {
      const amountMinor = toMinor(parseLooseAmount(row.amount) ?? 0);
      const employeeId = cleanId(row.employee_id);
      const revenueId = String(row.revenue_id);
      if (!employeeId) continue;
      const list = contributionsByRevenue.get(revenueId) ?? [];
      if (amountMinor !== 0) list.push({ name: null, employeeId, amountMinor });
      contributionsByRevenue.set(revenueId, list);
    }
  }

  const shares: RevenueShare[] = [];
  const days = new Set<string>();
  let branchRevenueMinor = 0;
  let rowsWithoutBreakdown = 0;
  for (const row of revenueRows) {
    days.add(String(row.date ?? '').slice(0, 10));
    branchRevenueMinor += toMinor(parseLooseAmount(row.total) ?? 0);
    const id = String(row.id);
    const rowShares = contributionsByRevenue.has(id) ? contributionsByRevenue.get(id)! : parseRevenueEmployees(row.employees);
    if (rowShares.length === 0) rowsWithoutBreakdown++;
    shares.push(...rowShares);
  }

  // Ids that are not employees of this branch: if they are employees of another
  // branch, their revenue must not be credited to a namesake here (and we can
  // show their name when the line has none).
  const knownIds = new Set(employees.map(e => e.id));
  const strangers = [...new Set(shares.filter(s => s.employeeId && !knownIds.has(s.employeeId)).map(s => s.employeeId!))];
  const otherBranch = new Map<string, string>();
  for (let i = 0; i < strangers.length; i += 90) {
    const chunk = strangers.slice(i, i + 90);
    try {
      const result = await db
        .prepare(`SELECT id, employee_name FROM employees WHERE id IN (${chunk.map(() => '?').join(', ')})`)
        .bind(...chunk)
        .all<Record<string, unknown>>();
      for (const row of result.results ?? []) otherBranch.set(String(row.id), String(row.employee_name ?? ''));
    } catch (error) {
      console.error('Bonus: employee lookup failed:', error);
    }
  }
  for (const share of shares) {
    if (!share.name && share.employeeId && otherBranch.get(share.employeeId)) share.name = otherBranch.get(share.employeeId)!;
  }

  const attribution = attributeRevenue(shares, employees, otherBranch);
  const sortedTiers = [...tiers].sort((a, b) => toMinor(a.minRevenue) - toMinor(b.minRevenue));
  const lines: BonusEntry[] = employees
    .filter(e => e.active)
    .map(e => {
      const revenueMinor = attribution.byEmployee.get(e.id) ?? 0;
      const evaluation = evaluateTier(fromMinor(revenueMinor), sortedTiers);
      return {
        employeeId: e.id,
        employeeName: e.name,
        totalRevenue: fromMinor(revenueMinor),
        bonusAmount: evaluation.amount,
        tierMinRevenue: evaluation.tier?.minRevenue ?? null,
        nextTierMinRevenue: evaluation.nextTier?.minRevenue ?? null,
        nextTierAmount: evaluation.nextTier?.amount ?? null,
        remainingToNext: evaluation.remainingToNext,
        progressToNext: Math.round(evaluation.progressToNext * 1000) / 1000,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue || a.employeeName.localeCompare(b.employeeName, 'ar'));

  const totalBonusMinor = lines.reduce((sum, l) => sum + toMinor(l.bonusAmount), 0);
  return {
    branchId,
    period,
    week,
    range,
    complete: isWeekComplete(range, today),
    revenueRowCount: revenueRows.length,
    daysWithRevenue: [...days].filter(Boolean).length,
    branchRevenue: fromMinor(branchRevenueMinor),
    attributedRevenue: fromMinor(attribution.attributedMinor),
    rowsWithoutBreakdown,
    employees: lines,
    unmatched: attribution.unmatched,
    totalBonus: fromMinor(totalBonusMinor),
    eligibleCount: lines.filter(l => toMinor(l.bonusAmount) > 0).length,
    tiers: sortedTiers,
  };
}

/** Order-insensitive signature of who gets how much; used to detect stale submissions. */
export function bonusFingerprint(entries: ReadonlyArray<{ employeeId?: unknown; employeeName?: unknown; bonusAmount?: unknown }>): string {
  return entries
    .map(e => ({ key: String(e.employeeId ?? e.employeeName ?? ''), minor: toMinor(e.bonusAmount) }))
    .filter(e => e.minor > 0)
    .map(e => `${e.key}:${e.minor}`)
    .sort()
    .join('|');
}

// ---------------------------------------------------------------------------
// bonus_records persistence (008 and legacy schemas)
// ---------------------------------------------------------------------------

export type BonusRecordStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface BonusSchema {
  columns: Set<string>;
  hasStatus: boolean;
}

export async function getBonusSchema(db: D1Database): Promise<BonusSchema> {
  const columns = await getTableColumns(db, 'bonus_records');
  if (columns.size === 0) throw new Error('bonus_records table is missing');
  return { columns, hasStatus: columns.has('status') };
}

export interface BonusRecordView {
  id: string;
  branchId: string;
  year: number;
  month: number | null;
  period: string | null;
  week: number;
  status: BonusRecordStatus;
  total: number;
  entries: BonusEntry[];
  employeeCount: number;
  eligibleCount: number;
  submittedBy: string | null;
  submittedByName: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  /** Rejection reason (008 schema) or other note. */
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  /**
   * Set when the bonus was approved after its month's payroll was closed and
   * was therefore added to a later payroll ('YYYY-MM') as ledger entries.
   * Filled by attachRolloverPeriods.
   */
  rolloverPeriod: string | null;
}

export function bonusRecordStatus(row: Record<string, unknown>): BonusRecordStatus {
  const status = typeof row.status === 'string' ? row.status : null;
  if (status === 'rejected' || status === 'cancelled') return 'rejected';
  if (status === 'paid') return 'paid';
  return isPayableBonusRow(row) ? 'approved' : 'pending';
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function num(value: unknown): number {
  const n = parseLooseAmount(value);
  return n === null ? 0 : n;
}

function optNum(value: unknown): number | null {
  return value === null || value === undefined ? null : parseLooseAmount(value);
}

/** Tolerant reader for employee_bonuses JSON (one bad row must never break a page). */
export function parseStoredEntries(value: unknown): BonusEntry[] {
  const parsed = typeof value === 'string' ? parseJson(value) : value;
  if (!Array.isArray(parsed)) return [];
  const out: BonusEntry[] = [];
  for (const item of parsed) {
    if (!isPlainObject(item)) continue;
    const employeeId = cleanId(item.employeeId) ?? '';
    const employeeName = cleanName(item.employeeName) ?? employeeId;
    if (!employeeId && !employeeName) continue;
    out.push({
      employeeId,
      employeeName,
      totalRevenue: num(item.totalRevenue),
      bonusAmount: num(item.bonusAmount),
      tierMinRevenue: optNum(item.tierMinRevenue ?? item.threshold),
      nextTierMinRevenue: optNum(item.nextTierMinRevenue),
      nextTierAmount: optNum(item.nextTierAmount),
      remainingToNext: optNum(item.remainingToNext),
      progressToNext: Math.max(0, Math.min(1, num(item.progressToNext))),
    });
  }
  return out;
}

/** Turns a raw bonus_records row (either schema) into a view. Never throws. */
export function readBonusRecord(row: Record<string, unknown>): BonusRecordView {
  const entries = parseStoredEntries(row.employee_bonuses);
  const month = parseMonth(row.month);
  const year = Number(row.year) || 0;
  const snapshot = parseJson(row.revenue_snapshot);
  const meta = isPlainObject(snapshot) ? snapshot : {};
  const storedTotal = row.total_paid ?? row.total_bonus_paid;
  const total =
    storedTotal === null || storedTotal === undefined
      ? fromMinor(entries.reduce((s, e) => s + Math.max(0, toMinor(e.bonusAmount)), 0))
      : num(storedTotal);
  const submittedBy = cleanId(row.created_by) ?? cleanId(meta.submittedBy);
  return {
    id: String(row.id),
    branchId: String(row.branch_id ?? ''),
    year,
    month,
    period: month && year >= 2000 && year <= 2100 ? toPeriod(year, month) : null,
    week: Number(row.week_number) || 0,
    status: bonusRecordStatus(row),
    total,
    entries,
    employeeCount: entries.length,
    eligibleCount: entries.filter(e => toMinor(e.bonusAmount) > 0).length,
    submittedBy,
    submittedByName: cleanName(meta.submittedByName),
    submittedAt: typeof row.created_at === 'string' ? row.created_at : null,
    approvedBy: cleanId(row.approved_by),
    approvedByName: null,
    approvedAt: typeof row.approved_at === 'string' ? row.approved_at : null,
    notes: typeof row.notes === 'string' && row.notes.trim() ? row.notes : null,
    startDate: typeof row.start_date === 'string' ? row.start_date : null,
    endDate: typeof row.end_date === 'string' ? row.end_date : null,
    rolloverPeriod: null,
  };
}

/** Fills submittedByName / approvedByName from users_new (legacy rows may hold a username or free text). */
export async function attachUserNames(db: D1Database, records: BonusRecordView[]): Promise<void> {
  const ids = [...new Set(records.flatMap(r => [r.submittedBy, r.approvedBy]).filter((v): v is string => !!v))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    try {
      const marks = ids.map(() => '?').join(', ');
      const result = await db
        .prepare(`SELECT id, username, full_name FROM users_new WHERE id IN (${marks}) OR username IN (${marks})`)
        .bind(...ids, ...ids)
        .all<Record<string, unknown>>();
      for (const row of result.results ?? []) {
        const name = cleanName(row.full_name) ?? cleanName(row.username) ?? String(row.id);
        names.set(String(row.id), name);
        if (row.username) names.set(String(row.username), name);
      }
    } catch (error) {
      console.error('Bonus: user name lookup failed:', error);
    }
  }
  for (const r of records) {
    if (r.submittedBy) r.submittedByName = names.get(r.submittedBy) ?? r.submittedByName ?? r.submittedBy;
    if (r.approvedBy) r.approvedByName = names.get(r.approvedBy) ?? r.approvedBy;
  }
}

/** Every bonus_records row of a branch-month (all month spellings), newest first. */
export async function loadPeriodRecords(db: D1Database, branchId: string, period: string): Promise<BonusRecordView[]> {
  const p = parsePeriod(period);
  if (!p) return [];
  const columns = await getTableColumns(db, 'bonus_records');
  if (columns.size === 0) return [];
  const variants = monthVariants(p.month);
  const order = columns.has('created_at') ? 'ORDER BY created_at DESC' : '';
  const result = await db
    .prepare(
      `SELECT * FROM bonus_records
       WHERE branch_id = ? AND year = ? AND month IN (${variants.map(() => '?').join(', ')}) ${order}`,
    )
    .bind(branchId, p.year, ...variants)
    .all<Record<string, unknown>>();
  const records: BonusRecordView[] = [];
  for (const row of result.results ?? []) {
    try {
      records.push(readBonusRecord(row));
    } catch (error) {
      console.error('Bonus: unreadable bonus record skipped:', row?.id, error);
    }
  }
  return records;
}

export async function getBonusRecordById(db: D1Database, id: string): Promise<BonusRecordView | null> {
  const row = await db.prepare('SELECT * FROM bonus_records WHERE id = ?').bind(id).first<Record<string, unknown>>();
  return row ? readBonusRecord(row) : null;
}

/** A view in the shape of a raw bonus_records row, for the selector shared with payroll. */
function viewAsRow(r: BonusRecordView): BonusRecordRow & { view: BonusRecordView } {
  return {
    id: r.id,
    branch_id: r.branchId,
    year: r.year,
    month: r.month,
    week_number: r.week,
    status: r.status,
    approved_by: r.approvedBy,
    approved_at: r.approvedAt,
    created_at: r.submittedAt,
    view: r,
  };
}

/**
 * The approved records payroll pays (bonus-select's pickPayableBonusRows):
 * one per week — the latest approval — even when a week has several
 * approved rows (legacy duplicates, mixed month spellings).
 */
export function payableRecords(records: BonusRecordView[]): BonusRecordView[] {
  return pickPayableBonusRows(records.map(viewAsRow)).map(r => r.view);
}

function byLatestApproval(a: BonusRecordView, b: BonusRecordView): number {
  const ra = viewAsRow(a);
  const rb = viewAsRow(b);
  return isLaterBonusApproval(ra, rb) ? -1 : isLaterBonusApproval(rb, ra) ? 1 : 0;
}

function byNewestSubmission(a: BonusRecordView, b: BonusRecordView): number {
  const sa = String(a.submittedAt ?? '');
  const sb = String(b.submittedAt ?? '');
  if (sa !== sb) return sa > sb ? -1 : 1;
  return a.id === b.id ? 0 : a.id > b.id ? -1 : 1;
}

/**
 * The record that represents a week: the approved row payroll pays (latest
 * approval), else a paid row, else the newest pending, else the newest rejected.
 */
export function pickPrimaryRecord(records: BonusRecordView[]): BonusRecordView | null {
  if (records.length === 0) return null;
  const payable = payableRecords(records).sort(byLatestApproval);
  if (payable.length > 0) return payable[0];
  const paid = records.filter(r => r.status === 'paid').sort(byLatestApproval);
  if (paid.length > 0) return paid[0];
  const pending = records.filter(r => r.status === 'pending').sort(byNewestSubmission);
  if (pending.length > 0) return pending[0];
  return [...records].sort(byNewestSubmission)[0];
}

export function isFinalStatus(status: BonusRecordStatus): boolean {
  return status === 'approved' || status === 'paid';
}

/**
 * SQL for "this row is approved/paid" — mirrors isPayableBonusRow plus 'paid'.
 * NULL status is read as '' so a NULL-status draft is never "unknown" (a NULL
 * here would make `NOT finalCondition` NULL too and hide the row from deletes).
 */
function finalCondition(schema: BonusSchema, alias = ''): string {
  const col = (name: string) => `${alias}${name}`;
  const approvedBy = `COALESCE(${col('approved_by')}, '') != ''`;
  if (!schema.hasStatus) return `(${approvedBy})`;
  const status = `COALESCE(${col('status')}, '')`;
  return `(${status} IN ('approved', 'paid') OR (${status} NOT IN ('rejected', 'cancelled') AND ${approvedBy}))`;
}

/** SQL for "this row awaits the manager". */
function pendingCondition(schema: BonusSchema, alias = ''): string {
  const col = (name: string) => `${alias}${name}`;
  const notApproved = `COALESCE(${col('approved_by')}, '') = ''`;
  if (!schema.hasStatus) return `(${notApproved})`;
  return `(COALESCE(${col('status')}, 'pending') IN ('pending', 'draft') AND ${notApproved})`;
}

const LOCKED_RUN_SQL = `EXISTS (SELECT 1 FROM payroll_runs WHERE branch_id = ? AND period = ? AND status IN ('approved', 'paid'))`;

/** "No other approved/paid row exists for this branch/year/week under any spelling of the month." */
function noOtherFinalRowGuard(
  schema: BonusSchema,
  record: Pick<BonusRecordView, 'id' | 'branchId' | 'period' | 'week'>,
): SqlGuard {
  const p = parsePeriod(record.period ?? '');
  if (!p) throw new Error(`Invalid bonus period: ${record.period}`);
  const variants = monthVariants(p.month);
  return {
    sql: `NOT EXISTS (SELECT 1 FROM bonus_records o
            WHERE o.branch_id = ? AND o.year = ? AND o.week_number = ? AND o.month IN (${variants.map(() => '?').join(', ')})
              AND o.id != ? AND ${finalCondition(schema, 'o.')})`,
    params: [record.branchId, p.year, record.week, ...variants, record.id],
  };
}

function sqliteNow(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export interface SubmissionInput {
  id: string;
  computation: WeekBonusComputation;
  actorId: string;
  actorName: string;
  /** Admin "submit and approve" in one step. */
  approve: boolean;
  /**
   * Approve only: the payroll month the bonus goes to — the week's own month,
   * or (rollover) the first open month after it when that payroll is closed.
   * The batch is a no-op if this payroll gets approved/paid meanwhile.
   */
  payrollPeriod?: string | null;
  /**
   * Approve + rollover only: builds the ledger inserts (adjustmentInsertStatement)
   * with the submission's guard, so the approval and its ledger entries land
   * together or not at all.
   */
  rollover?: (guard: SqlGuard) => D1PreparedStatement[];
}

/**
 * Statements (run them in one db.batch) that replace the week's unapproved
 * rows with a fresh submission. All of them are no-ops when the week already
 * has an approved row — or, when approving, when the target payroll is
 * closed; check `results[insertIndex].meta.changes`. A pending submission is
 * accepted even if the week's own payroll is already approved: approving it
 * later rolls it over to the next open payroll.
 */
export function submissionStatements(
  db: D1Database,
  schema: BonusSchema,
  input: SubmissionInput,
): { statements: D1PreparedStatement[]; insertIndex: number } {
  const c = input.computation;
  const p = parsePeriod(c.period);
  if (!p) throw new Error(`Invalid period: ${c.period}`);
  const variants = monthVariants(p.month);
  const monthIn = `month IN (${variants.map(() => '?').join(', ')})`;
  const weekWhere = `branch_id = ? AND year = ? AND week_number = ? AND ${monthIn}`;
  const weekParams = [c.branchId, p.year, c.week, ...variants];
  let guard = `NOT EXISTS (SELECT 1 FROM bonus_records WHERE ${weekWhere} AND ${finalCondition(schema)})`;
  const guardParams: unknown[] = [...weekParams];
  if (input.approve) {
    guard += ` AND NOT ${LOCKED_RUN_SQL}`;
    guardParams.push(c.branchId, input.payrollPeriod ?? c.period);
  }

  const deleteStmt = db
    .prepare(`DELETE FROM bonus_records WHERE ${weekWhere} AND NOT ${finalCondition(schema)} AND ${guard}`)
    .bind(...weekParams, ...guardParams);

  const rolloverStmts = input.approve && input.rollover ? input.rollover({ sql: guard, params: guardParams }) : [];

  const now = sqliteNow();
  const entries = c.employees.map(e => ({ ...e }));
  const snapshot = {
    submittedBy: input.actorId,
    submittedByName: input.actorName,
    computedAt: now,
    range: { start: c.range.start, end: c.range.end },
    revenueRowCount: c.revenueRowCount,
    daysWithRevenue: c.daysWithRevenue,
    branchRevenue: c.branchRevenue,
    attributedRevenue: c.attributedRevenue,
    unmatched: c.unmatched,
    tiers: c.tiers,
    ...(input.approve && input.payrollPeriod && input.payrollPeriod !== c.period ? { rolledOverTo: input.payrollPeriod } : {}),
  };
  const values: Record<string, unknown> = {
    id: input.id,
    branch_id: c.branchId,
    month: String(p.month),
    year: p.year,
    week_number: c.week,
    start_date: c.range.start,
    end_date: c.range.end,
    employee_bonuses: JSON.stringify(entries),
    total_paid: c.totalBonus,
    total_bonus_paid: c.totalBonus,
    status: schema.hasStatus ? (input.approve ? 'approved' : 'pending') : undefined,
    notes: null,
    created_by: input.actorId,
    created_at: now,
    approved_by: input.approve ? input.actorId : null,
    approved_at: input.approve ? now : null,
    revenue_snapshot: JSON.stringify(snapshot),
  };
  const insert = buildAdaptiveInsert('bonus_records', schema.columns, values);
  const insertSql = insert.sql.replace(/\)\s*VALUES\s*\((.*)\)\s*$/s, `) SELECT $1 WHERE ${guard}`);
  const insertStmt = db.prepare(insertSql).bind(...insert.params, ...guardParams);
  const statements = [deleteStmt, ...rolloverStmts, insertStmt];
  return { statements, insertIndex: statements.length - 1 };
}

/**
 * Marks a pending record approved. No-op (→ 409) when it is no longer
 * pending, when another approved/paid row already exists for the same
 * branch/year/week (any month spelling), or when the payroll it goes to —
 * `payrollPeriod`, default the record's own month — is approved/paid.
 */
export function approveStatement(
  db: D1Database,
  schema: BonusSchema,
  record: Pick<BonusRecordView, 'id' | 'branchId' | 'period' | 'week'>,
  actorId: string,
  payrollPeriod?: string | null,
): D1PreparedStatement {
  const sets = [schema.hasStatus ? `status = 'approved'` : null, 'approved_by = ?', schema.columns.has('approved_at') ? 'approved_at = ?' : null]
    .filter(Boolean)
    .join(', ');
  const params: unknown[] = [actorId];
  if (schema.columns.has('approved_at')) params.push(sqliteNow());
  const noDuplicate = noOtherFinalRowGuard(schema, record);
  return db
    .prepare(
      `UPDATE bonus_records SET ${sets}
       WHERE id = ? AND ${pendingCondition(schema)} AND ${noDuplicate.sql} AND NOT ${LOCKED_RUN_SQL}`,
    )
    .bind(...params, record.id, ...noDuplicate.params, record.branchId, payrollPeriod ?? record.period ?? '');
}

/**
 * Guard for the rollover ledger inserts that accompany approveStatement in the
 * same batch (placed BEFORE it): the same conditions, evaluated on the same
 * state, so either the approval and all its entries land or nothing does. The
 * target payroll's lock is checked by adjustmentInsertStatement itself.
 */
export function approvalInsertGuard(
  schema: BonusSchema,
  record: Pick<BonusRecordView, 'id' | 'branchId' | 'period' | 'week'>,
): SqlGuard {
  const noDuplicate = noOtherFinalRowGuard(schema, record);
  return {
    sql: `EXISTS (SELECT 1 FROM bonus_records b WHERE b.id = ? AND ${pendingCondition(schema, 'b.')}) AND ${noDuplicate.sql}`,
    params: [record.id, ...noDuplicate.params],
  };
}

// ---------------------------------------------------------------------------
// Rollover: a week approved after its month's payroll was closed
// ---------------------------------------------------------------------------
//
// The bonus goes to the first open payroll month as 'bonus' ledger entries
// (payroll_adjustments), one per employee with a bonus:
//   source_type = 'bonus_record', source_id = `${recordId}:${employeeId}`.
// Payroll must not also pay such a record from bonus_records directly (e.g.
// if the old month is reopened): any ledger row whose source_id starts with
// `${recordId}:` marks the record as rolled over.

export const BONUS_ROLLOVER_SOURCE_TYPE = 'bonus_record' as const;

export function bonusRolloverSourceId(recordId: string, employeeId: string): string {
  return `${recordId}:${employeeId}`;
}

/** "بونص الأسبوع 5 من أكتوبر 2026 (مرحّل)" */
export function bonusRolloverDescription(week: number, period: string): string {
  return `بونص الأسبوع ${week} من ${periodLabelAr(period)} (مرحّل)`;
}

export interface RolloverInput {
  recordId: string;
  branchId: string;
  /** The week's own month. */
  period: string;
  week: number;
  /** The open payroll month that receives the bonus. */
  payrollPeriod: string;
  entries: ReadonlyArray<Pick<BonusEntry, 'employeeId' | 'employeeName' | 'bonusAmount'>>;
  actorId: string;
  actorName: string;
}

/** One ledger entry per employee with a bonus > 0 (pass each to adjustmentInsertStatement). */
export function bonusRolloverAdjustments(input: RolloverInput): NewAdjustment[] {
  const out: NewAdjustment[] = [];
  for (const entry of input.entries) {
    const minor = toMinor(entry.bonusAmount);
    if (minor <= 0) continue;
    const employeeId = String(entry.employeeId ?? '').trim();
    // Payroll skips a rolled-over record entirely, so a line without an id would be lost.
    if (!employeeId) throw new Error(`Bonus ${input.recordId}: entry without employee id cannot be rolled over`);
    out.push({
      branchId: input.branchId,
      employeeId,
      employeeName: entry.employeeName || employeeId,
      period: input.payrollPeriod,
      category: 'bonus',
      amount: fromMinor(minor),
      description: bonusRolloverDescription(input.week, input.period),
      sourceType: BONUS_ROLLOVER_SOURCE_TYPE,
      sourceId: bonusRolloverSourceId(input.recordId, employeeId),
      createdBy: input.actorId,
      createdByName: input.actorName,
    });
  }
  return out;
}

/** Fills rolloverPeriod on approved/paid records that were rolled over to a later payroll. */
export async function attachRolloverPeriods(db: D1Database, records: BonusRecordView[]): Promise<void> {
  const finals = records.filter(r => isFinalStatus(r.status));
  if (finals.length === 0) return;
  const branchIds = [...new Set(finals.map(r => r.branchId))];
  try {
    for (const branchId of branchIds) {
      const result = await db
        .prepare(
          `SELECT source_id, period, status FROM payroll_adjustments
           WHERE branch_id = ? AND source_type = ? AND source_id IS NOT NULL
           ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, period`,
        )
        .bind(branchId, BONUS_ROLLOVER_SOURCE_TYPE)
        .all<{ source_id: string; period: string; status: string }>();
      const rows = result.results ?? [];
      for (const record of finals) {
        if (record.branchId !== branchId) continue;
        const prefix = `${record.id}:`;
        const hit = rows.find(row => String(row.source_id).startsWith(prefix));
        if (hit) record.rolloverPeriod = String(hit.period);
      }
    }
  } catch (error) {
    // payroll_adjustments may not exist on a fresh database; nothing was rolled over then.
    console.error('Bonus: rollover lookup failed:', error);
  }
}

/**
 * Rejects a pending record: status 'rejected' + reason on the 008 schema; the
 * legacy schema has no status column, so the row is deleted (callers audit-log it).
 */
export function rejectStatement(db: D1Database, schema: BonusSchema, recordId: string, reason: string): D1PreparedStatement {
  if (!schema.hasStatus) {
    return db.prepare(`DELETE FROM bonus_records WHERE id = ? AND ${pendingCondition(schema)}`).bind(recordId);
  }
  const notes = schema.columns.has('notes') ? ', notes = ?' : '';
  const params: unknown[] = schema.columns.has('notes') ? [reason] : [];
  return db
    .prepare(`UPDATE bonus_records SET status = 'rejected'${notes} WHERE id = ? AND ${pendingCondition(schema)}`)
    .bind(...params, recordId);
}

export interface WeekOverview {
  week: number;
  start: string;
  end: string;
  startDay: number;
  endDay: number;
  days: number;
  label: string;
  complete: boolean;
  /** The approved row payroll pays when there is one (see pickPrimaryRecord). */
  record: BonusRecordView | null;
  /** Other rows stored for the same week (legacy duplicates). */
  duplicateCount: number;
  /** More than one approved row (legacy duplicates): only the latest approval is paid. */
  multipleApproved: boolean;
}

export interface PeriodOverview {
  weeks: WeekOverview[];
  /**
   * Approved bonus of the month as payroll pays it: one approved row per week
   * (the latest approval). Includes weeks rolled over to a later payroll.
   */
  approvedTotal: number;
  /** Part of approvedTotal paid in a later payroll because this month's was already closed. */
  rolledOverTotal: number;
  pendingCount: number;
  locked: boolean;
  /** Approved bonus per employee for the month. */
  employees: Array<{ employeeId: string; employeeName: string; approvedBonus: number; weeks: number[] }>;
}

export async function loadPeriodOverview(
  db: D1Database,
  branchId: string,
  period: string,
  today: string = todayIso(),
): Promise<PeriodOverview> {
  const [records, locked] = await Promise.all([loadPeriodRecords(db, branchId, period), isPeriodLocked(db, branchId, period)]);
  await Promise.all([attachUserNames(db, records), attachRolloverPeriods(db, records)]);

  const weeks: WeekOverview[] = weeksOfPeriod(period).map(range => {
    const own = records.filter(r => r.week === range.week);
    const primary = pickPrimaryRecord(own);
    return {
      ...range,
      label: weekLabelAr(period, range),
      complete: isWeekComplete(range, today),
      record: primary,
      duplicateCount: Math.max(0, own.length - 1),
      multipleApproved: own.filter(r => r.status === 'approved').length > 1,
    };
  });

  // Same choice as payroll (pickPayableBonusRows): one approved row per week, its positive lines.
  let approvedMinor = 0;
  let rolledOverMinor = 0;
  const perEmployee = new Map<string, { employeeId: string; employeeName: string; minor: number; weeks: number[] }>();
  for (const r of payableRecords(records)) {
    for (const e of r.entries) {
      const minor = toMinor(e.bonusAmount);
      if (minor <= 0) continue;
      approvedMinor += minor;
      if (r.rolloverPeriod) rolledOverMinor += minor;
      const key = e.employeeId || normalizeArabicName(e.employeeName);
      const item = perEmployee.get(key) ?? { employeeId: e.employeeId, employeeName: e.employeeName, minor: 0, weeks: [] };
      item.minor += minor;
      if (!item.weeks.includes(r.week)) item.weeks.push(r.week);
      perEmployee.set(key, item);
    }
  }

  return {
    weeks,
    approvedTotal: fromMinor(approvedMinor),
    rolledOverTotal: fromMinor(rolledOverMinor),
    pendingCount: weeks.filter(w => w.record?.status === 'pending').length,
    locked,
    employees: [...perEmployee.values()]
      .map(e => ({ employeeId: e.employeeId, employeeName: e.employeeName, approvedBonus: fromMinor(e.minor), weeks: e.weeks.sort() }))
      .sort((a, b) => b.approvedBonus - a.approvedBonus || a.employeeName.localeCompare(b.employeeName, 'ar')),
  };
}

/** Week records (all rows) for one week of a period. */
export async function findWeekRecords(db: D1Database, branchId: string, period: string, week: number): Promise<BonusRecordView[]> {
  const records = (await loadPeriodRecords(db, branchId, period)).filter(r => r.week === week);
  await Promise.all([attachUserNames(db, records), attachRolloverPeriods(db, records)]);
  return records;
}

// ---------------------------------------------------------------------------
// Notification texts and links
// ---------------------------------------------------------------------------

/** Deep link to a week on the bonus page (notification targets). */
export function bonusPageLink(branchId: string, period: string, week: number): string {
  const q = new URLSearchParams({ branchId, period, week: String(week) });
  return `/bonus?${q.toString()}`;
}

export function bonusNotificationText(
  kind: 'submitted' | 'approved' | 'rejected',
  info: {
    week: number;
    period: string;
    branchName: string;
    total: number;
    reason?: string | null;
    /** Approved: the payroll month that pays it, when it differs from the week's month (rollover). */
    payrollPeriod?: string | null;
  },
): { title: string; message: string } {
  const month = periodLabelAr(info.period);
  const head = `بونص الأسبوع ${info.week} من ${month} — ${info.branchName}: ${sar(info.total)}`;
  if (kind === 'submitted') return { title: 'طلب اعتماد بونص', message: head };
  if (kind === 'approved') {
    if (info.payrollPeriod && info.payrollPeriod !== info.period) {
      return {
        title: 'تم اعتماد البونص',
        message: `${head} — مسير رواتب ${month} معتمد مسبقاً، لذلك يُضاف تلقائياً إلى مسير رواتب ${periodLabelAr(info.payrollPeriod)}`,
      };
    }
    return { title: 'تم اعتماد البونص', message: `${head} — يُضاف تلقائياً إلى مسير رواتب ${month}` };
  }
  return { title: 'تم رفض طلب البونص', message: `${head} — السبب: ${info.reason ?? '—'}` };
}
