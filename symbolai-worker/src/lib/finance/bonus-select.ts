// Which weekly bonus_records rows payroll pays.
//
// The old bonus page inserted a new row on every save, and on the 008 schema
// the same week can exist under several month spellings ('سبتمبر', '9', '09'),
// so one week may have several approved rows. Payroll must pay each week once:
// the row with the most recent approval (approved_at, falling back to
// created_at; the larger id breaks ties). The bonus page and payroll both use
// this selector so they always show and pay the same amount.
//
// Pure and browser-safe: depends on catalog.ts only.

import { parseMonth } from './catalog';

/** A raw bonus_records row (008 or legacy schema), or anything shaped like one. */
export type BonusRecordRow = Record<string, unknown>;

/**
 * "Approved and not yet paid out elsewhere": status 'approved', or no decisive
 * status (legacy rows have none; 008 drafts) with an approver set.
 */
export function isPayableBonusRow(row: BonusRecordRow): boolean {
  const status = typeof row.status === 'string' ? row.status : null;
  if (status === 'approved') return true;
  if (status === 'paid' || status === 'rejected' || status === 'cancelled') return false;
  return row.approved_by !== null && row.approved_by !== undefined && row.approved_by !== '';
}

/** Sort key of an approval: approved_at, else created_at (SQLite text dates compare as strings). */
export function bonusApprovalRecency(row: BonusRecordRow): string {
  return String(row.approved_at ?? row.created_at ?? '');
}

/** True when `a` is the more recent approval of the two (larger id breaks ties). */
export function isLaterBonusApproval(a: BonusRecordRow, b: BonusRecordRow): boolean {
  const ra = bonusApprovalRecency(a);
  const rb = bonusApprovalRecency(b);
  if (ra !== rb) return ra > rb;
  return String(a.id ?? '') > String(b.id ?? '');
}

/** branch + year + month (any spelling) + week; rows without a week number stand alone. */
export function bonusWeekKey(row: BonusRecordRow): string {
  const month = parseMonth(row.month);
  const week = row.week_number === null || row.week_number === undefined || row.week_number === '' ? null : String(row.week_number);
  return [
    String(row.branch_id ?? ''),
    String(row.year ?? ''),
    month === null ? String(row.month ?? '') : String(month),
    week === null ? `id:${String(row.id ?? '')}` : week,
  ].join('|');
}

/**
 * The rows payroll pays: approved rows only (isPayableBonusRow), one per
 * branch/year/month/week — the latest approval. Returned in input order.
 */
export function pickPayableBonusRows<T extends BonusRecordRow>(rows: readonly T[]): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    if (!isPayableBonusRow(row)) continue;
    const key = bonusWeekKey(row);
    const current = best.get(key);
    if (!current || isLaterBonusApproval(row, current)) best.set(key, row);
  }
  const chosen = new Set<T>(best.values());
  return rows.filter(row => chosen.has(row));
}
