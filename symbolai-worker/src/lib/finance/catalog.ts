// Shared finance vocabulary: payroll adjustment categories, periods and labels.
// Browser-safe (no server imports) so page scripts can use it too.

export type AdjustmentKind = 'earning' | 'deduction';

export type EarningCategory = 'overtime' | 'bonus' | 'allowance' | 'dues' | 'commission' | 'other_earning';
export type DeductionCategory = 'advance' | 'violation' | 'absence' | 'unpaid_leave' | 'late' | 'other_deduction';
export type AdjustmentCategory = EarningCategory | DeductionCategory;

/** Payroll-sheet column a category is summed into. */
export type PayrollColumn =
  | 'overtime'
  | 'bonus'
  | 'otherEarnings'
  | 'advances'
  | 'penalties'
  | 'absenceDeductions'
  | 'otherDeductions';

export interface CategoryInfo {
  kind: AdjustmentKind;
  labelAr: string;
  labelEn: string;
  column: PayrollColumn;
}

export const ADJUSTMENT_CATEGORIES: Record<AdjustmentCategory, CategoryInfo> = {
  overtime: { kind: 'earning', labelAr: 'ساعات إضافية', labelEn: 'Overtime', column: 'overtime' },
  bonus: { kind: 'earning', labelAr: 'مكافأة / بونص', labelEn: 'Bonus', column: 'bonus' },
  allowance: { kind: 'earning', labelAr: 'بدل', labelEn: 'Allowance', column: 'otherEarnings' },
  dues: { kind: 'earning', labelAr: 'صرف متأخرات', labelEn: 'Arrears', column: 'otherEarnings' },
  commission: { kind: 'earning', labelAr: 'عمولة', labelEn: 'Commission', column: 'otherEarnings' },
  other_earning: { kind: 'earning', labelAr: 'مستحقات أخرى', labelEn: 'Other earnings', column: 'otherEarnings' },
  advance: { kind: 'deduction', labelAr: 'سلفة', labelEn: 'Salary advance', column: 'advances' },
  violation: { kind: 'deduction', labelAr: 'جزاء / مخالفة', labelEn: 'Penalty', column: 'penalties' },
  absence: { kind: 'deduction', labelAr: 'غياب', labelEn: 'Absence', column: 'absenceDeductions' },
  unpaid_leave: { kind: 'deduction', labelAr: 'إجازة بدون راتب', labelEn: 'Unpaid leave', column: 'absenceDeductions' },
  late: { kind: 'deduction', labelAr: 'تأخير', labelEn: 'Lateness', column: 'absenceDeductions' },
  other_deduction: { kind: 'deduction', labelAr: 'استقطاعات أخرى', labelEn: 'Other deductions', column: 'otherDeductions' },
};

export const PAYROLL_COLUMN_LABELS: Record<PayrollColumn, { ar: string; en: string }> = {
  overtime: { ar: 'إضافي', en: 'Overtime' },
  bonus: { ar: 'مكافآت', en: 'Bonus' },
  otherEarnings: { ar: 'مستحقات أخرى', en: 'Other earnings' },
  advances: { ar: 'سلف', en: 'Advances' },
  penalties: { ar: 'جزاءات', en: 'Penalties' },
  absenceDeductions: { ar: 'غياب وإجازات', en: 'Absence & leave' },
  otherDeductions: { ar: 'استقطاعات أخرى', en: 'Other deductions' },
};

export function isAdjustmentCategory(value: unknown): value is AdjustmentCategory {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ADJUSTMENT_CATEGORIES, value);
}

export function categoryKind(category: AdjustmentCategory): AdjustmentKind {
  return ADJUSTMENT_CATEGORIES[category].kind;
}

export const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
] as const;

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** Payroll periods are stored as 'YYYY-MM'. */
export interface Period {
  year: number;
  month: number; // 1-12
}

export function toPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Parses 'YYYY-MM'. Returns null for anything else. */
export function parsePeriod(value: unknown): Period | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Accepts the many month spellings the legacy pages used ("10", "010", "أكتوبر", "October")
 * and returns 1-12, or null if it is not a month.
 */
export function parseMonth(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 && value <= 12 ? value : null;
  }
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (/^\d{1,2}$/.test(text)) {
    const n = Number(text);
    return n >= 1 && n <= 12 ? n : null;
  }
  const ar = MONTH_NAMES_AR.indexOf(text as (typeof MONTH_NAMES_AR)[number]);
  if (ar >= 0) return ar + 1;
  const en = MONTH_NAMES_EN.findIndex(m => m.toLowerCase() === text.toLowerCase());
  return en >= 0 ? en + 1 : null;
}

/** Every representation a legacy row might have stored for this month, for `month IN (...)` lookups. */
export function monthVariants(month: number): string[] {
  return [String(month), String(month).padStart(2, '0'), MONTH_NAMES_AR[month - 1]];
}

export function periodLabelAr(period: string): string {
  const p = parsePeriod(period);
  return p ? `${MONTH_NAMES_AR[p.month - 1]} ${p.year}` : period;
}

export function periodLabelEn(period: string): string {
  const p = parsePeriod(period);
  return p ? `${MONTH_NAMES_EN[p.month - 1]} ${p.year}` : period;
}

export function addMonths(period: string, count: number): string {
  const p = parsePeriod(period);
  if (!p) throw new Error(`Invalid period: ${period}`);
  const index = p.year * 12 + (p.month - 1) + count;
  return toPeriod(Math.floor(index / 12), (index % 12) + 1);
}

export function daysInPeriod(period: string): number {
  const p = parsePeriod(period);
  if (!p) throw new Error(`Invalid period: ${period}`);
  return new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
}

/** Current period in Saudi time (UTC+3), so late-night entries land in the right month. */
export function currentPeriod(now: Date = new Date()): string {
  const riyadh = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return toPeriod(riyadh.getUTCFullYear(), riyadh.getUTCMonth() + 1);
}

/** Today's date (YYYY-MM-DD) in Saudi time. */
export function todayIso(now: Date = new Date()): string {
  const riyadh = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return riyadh.toISOString().slice(0, 10);
}

export const REQUEST_TYPES = ['سلفة', 'إجازة', 'صرف متأخرات', 'استئذان', 'مخالفة', 'استقالة'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'mixed';

export const PAYMENT_METHODS: Record<PaymentMethod, { ar: string; en: string }> = {
  cash: { ar: 'نقداً', en: 'Cash' },
  bank_transfer: { ar: 'حوالة بنكية', en: 'Bank transfer' },
  cheque: { ar: 'شيك', en: 'Cheque' },
  card: { ar: 'شبكة / مدى', en: 'Card' },
  mixed: { ar: 'مختلط', en: 'Mixed' },
};

export type VoucherType = 'receipt' | 'payment';

export const VOUCHER_TYPES: Record<VoucherType, { ar: string; en: string; prefix: string; partyAr: string; partyEn: string }> = {
  receipt: { ar: 'سند قبض', en: 'Receipt Voucher', prefix: 'RV', partyAr: 'استلمنا من', partyEn: 'Received from' },
  payment: { ar: 'سند صرف', en: 'Payment Voucher', prefix: 'PV', partyAr: 'صرفنا إلى', partyEn: 'Paid to' },
};
