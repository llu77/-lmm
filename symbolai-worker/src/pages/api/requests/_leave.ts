// Unpaid-leave posting plan, shared by /api/requests/respond (what is posted)
// and manage-requests.astro (the approver's preview), so both always agree.
// Pure and browser-safe: imports nothing server-only. The leading underscore
// keeps Astro from routing this file.
//
// Rules:
// - The leave range is split into calendar months; each month gets its own
//   'unpaid_leave' entry in that month's payroll.
// - A month is deducted for at most 30 days (fixed salary ÷ 30 convention); a
//   leave covering a whole calendar month counts as 30 days, and no month's
//   deduction exceeds the fixed salary — so the net salary never goes negative
//   because of the leave alone.
// - When fewer unpaid days than leave days are approved (e.g. an annual leave
//   that exceeds the balance), the paid days are consumed first and the unpaid
//   days are taken from the END of the leave.
// - An explicit amount from the approver is distributed over the months
//   proportionally to their deducted days, halala-exact, remainder on the last.
// - `postingStart` moves the whole schedule: it is the payroll month that
//   receives the leave's first month (later months keep their offset).

import { addMonths, daysInPeriod, parsePeriod } from '@/lib/finance/catalog';
import { fromMinor, toMinor } from '@/lib/finance/money';

export const MAX_DEDUCTED_DAYS_PER_MONTH = 30;

export interface LeaveMonthSegment {
  /** Calendar month the days fall in (YYYY-MM). */
  leavePeriod: string;
  start: string;
  end: string;
  calendarDays: number;
  wholeMonth: boolean;
}

export interface UnpaidLeaveEntry {
  /** Payroll month the entry is posted to. */
  period: string;
  /** Calendar month the leave days fall in (differs from `period` only when shifted). */
  leavePeriod: string;
  start: string | null;
  end: string | null;
  /** Deducted days (≤ 30). */
  days: number;
  amount: number;
  /** True when the 30-day or the fixed-salary cap reduced this month's deduction. */
  capped: boolean;
}

export interface UnpaidLeaveInput {
  leaveStart: string | null;
  leaveEnd: string | null;
  /** Total unpaid days approved (half days allowed); 0 with an explicit amount = spread over the whole leave. */
  unpaidDays: number;
  dailyRate: number;
  fixedSalary: number;
  explicitAmount?: number | null;
  /** Payroll month for the leave's first month; required when the request has no leave dates. */
  postingStart?: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function monthIndex(period: string): number {
  const p = parsePeriod(period);
  if (!p) throw new Error(`Invalid period: ${period}`);
  return p.year * 12 + (p.month - 1);
}

/** Whole months from `from` to `to` (both YYYY-MM). */
export function monthsBetween(from: string, to: string): number {
  return monthIndex(to) - monthIndex(from);
}

/** Splits an inclusive ISO date range into calendar-month segments. */
export function splitLeaveByMonth(start: string, end: string): LeaveMonthSegment[] {
  if (!isValidIsoDate(start) || !isValidIsoDate(end) || end < start) return [];
  const segments: LeaveMonthSegment[] = [];
  let cursor = start;
  for (let guard = 0; guard < 120 && cursor <= end; guard++) {
    const leavePeriod = cursor.slice(0, 7);
    const lastDay = daysInPeriod(leavePeriod);
    const monthEnd = `${leavePeriod}-${String(lastDay).padStart(2, '0')}`;
    const segEnd = end < monthEnd ? end : monthEnd;
    const calendarDays = Number(segEnd.slice(8, 10)) - Number(cursor.slice(8, 10)) + 1;
    segments.push({ leavePeriod, start: cursor, end: segEnd, calendarDays, wholeMonth: cursor.endsWith('-01') && segEnd === monthEnd });
    cursor = `${addMonths(leavePeriod, 1)}-01`;
  }
  return segments;
}

/**
 * The 'unpaid_leave' entries to post. Entries with a zero amount are left out,
 * so an empty result means there is nothing to deduct (e.g. no salary on file
 * and no explicit amount).
 */
export function planUnpaidLeave(input: UnpaidLeaveInput): UnpaidLeaveEntry[] {
  const unpaidDays = Math.max(0, Number(input.unpaidDays) || 0);
  const explicitMinor = input.explicitAmount ? toMinor(input.explicitAmount) : 0;
  const rateMinor = Math.max(0, toMinor(input.dailyRate));
  const fixedMinor = Math.max(0, toMinor(input.fixedSalary));

  // ---- days per calendar month -------------------------------------------------
  interface Row { leavePeriod: string; start: string | null; end: string | null; allocated: number; days: number; dayCapped: boolean }
  let rows: Row[];
  const segments = input.leaveStart && input.leaveEnd ? splitLeaveByMonth(input.leaveStart, input.leaveEnd) : [];
  if (segments.length > 0) {
    // With only an explicit amount (0 unpaid days) the amount covers the whole leave.
    let remaining = unpaidDays > 0 ? unpaidDays : segments.reduce((sum, s) => sum + s.calendarDays, 0);
    const allocated = new Array<number>(segments.length).fill(0);
    for (let i = segments.length - 1; i >= 0 && remaining > 0; i--) {
      allocated[i] = Math.min(remaining, segments[i].calendarDays);
      remaining -= allocated[i];
    }
    rows = segments
      .map((s, i) => {
        const whole = s.wholeMonth && allocated[i] >= s.calendarDays;
        const days = whole ? MAX_DEDUCTED_DAYS_PER_MONTH : Math.min(allocated[i], MAX_DEDUCTED_DAYS_PER_MONTH);
        // Only the tail of the month is unpaid: report the sub-range actually deducted.
        const start = allocated[i] < s.calendarDays
          ? `${s.leavePeriod}-${String(Number(s.end.slice(8, 10)) - Math.ceil(allocated[i]) + 1).padStart(2, '0')}`
          : s.start;
        return { leavePeriod: s.leavePeriod, start, end: s.end, allocated: allocated[i], days, dayCapped: days < allocated[i] };
      })
      .filter(r => r.allocated > 0);
  } else {
    if (!input.postingStart || !parsePeriod(input.postingStart)) return [];
    const days = Math.min(unpaidDays, MAX_DEDUCTED_DAYS_PER_MONTH);
    rows = [{ leavePeriod: input.postingStart, start: null, end: null, allocated: unpaidDays, days, dayCapped: days < unpaidDays }];
  }
  if (rows.length === 0) return [];

  // ---- payroll month per row -------------------------------------------------------
  const anchor = segments.length > 0 ? segments[0].leavePeriod : rows[0].leavePeriod;
  const shift = input.postingStart && parsePeriod(input.postingStart) ? monthsBetween(anchor, input.postingStart) : 0;

  // ---- amounts ---------------------------------------------------------------------------
  let amountsMinor: number[];
  let capped: boolean[];
  if (explicitMinor > 0) {
    // Integer weights (half days ×2) so the split is exact.
    const weights = rows.map(r => Math.round(r.days * 2));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    amountsMinor = rows.map(() => 0);
    if (totalWeight <= 0) {
      amountsMinor[rows.length - 1] = explicitMinor;
    } else {
      let assigned = 0;
      for (let i = 0; i < rows.length - 1; i++) {
        amountsMinor[i] = Math.floor((explicitMinor * weights[i]) / totalWeight);
        assigned += amountsMinor[i];
      }
      amountsMinor[rows.length - 1] = explicitMinor - assigned;
    }
    capped = rows.map(() => false);
  } else {
    amountsMinor = [];
    capped = [];
    for (const r of rows) {
      const raw = Math.round(r.days * rateMinor);
      const amount = fixedMinor > 0 ? Math.min(raw, fixedMinor) : raw;
      amountsMinor.push(amount);
      capped.push(r.dayCapped || amount < raw);
    }
  }

  const entries: UnpaidLeaveEntry[] = [];
  rows.forEach((r, i) => {
    if (amountsMinor[i] <= 0) return;
    entries.push({
      period: shift ? addMonths(r.leavePeriod, shift) : r.leavePeriod,
      leavePeriod: r.leavePeriod,
      start: r.start,
      end: r.end,
      days: r.days,
      amount: fromMinor(amountsMinor[i]),
      capped: capped[i],
    });
  });
  return entries;
}
