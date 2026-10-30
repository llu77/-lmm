// Shared server helpers for the employee-request endpoints (create, respond,
// all, my, employees, cancel). The leading underscore keeps Astro from
// routing this file.
//
// employee_requests is a LEGACY table whose response columns differ between
// deployments (schema.sql: admin_response/response_date; migration 008:
// response_notes/responded_at/responded_by), so every read is normalized to
// one camelCase shape and every write names only columns that exist. Data the
// legacy table cannot hold (employee link, reason, leave details, what was
// posted to payroll) lives in employee_request_meta.

import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import type { Env as EmailEnv } from '@/lib/email';
import { getTableColumns } from '@/lib/finance/schema';
import { ADJUSTMENT_CATEGORIES, isAdjustmentCategory, periodLabelAr, type AdjustmentCategory, type AdjustmentKind } from '@/lib/finance/catalog';
import { formatMoney, isCurrencyCode, type CurrencyCode } from '@/lib/finance/money';
import { normalizeArabicName } from '@/lib/finance/payroll-data';
import { dailyRate } from '@/lib/finance/payroll-engine';

export const LEAVE_TYPES = {
  annual: 'سنوية',
  sick: 'مرضية',
  unpaid: 'بدون راتب',
  emergency: 'اضطرارية',
} as const;
export type LeaveType = keyof typeof LEAVE_TYPES;

export function isLeaveType(value: unknown): value is LeaveType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEAVE_TYPES, value);
}

export const REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const PENDING_GUARD_SQL = `EXISTS (SELECT 1 FROM employee_requests WHERE id = ? AND status = 'pending')`;

// ---------------------------------------------------------------------------
// Column introspection
// ---------------------------------------------------------------------------

export interface RequestColumns {
  all: Set<string>;
  /** Every response-text column present (written together so any reader finds the text). */
  responseText: string[];
  /** Every response-time column present. */
  responseTime: string[];
  /** 008 only; FK to users_new(id), so only a user id may be stored. */
  hasRespondedBy: boolean;
  hasCreatedAt: boolean;
}

export async function getRequestColumns(db: D1Database): Promise<RequestColumns> {
  const all = await getTableColumns(db, 'employee_requests');
  return {
    all,
    responseText: ['admin_response', 'response_notes'].filter(c => all.has(c)),
    responseTime: ['response_date', 'responded_at'].filter(c => all.has(c)),
    hasRespondedBy: all.has('responded_by'),
    hasCreatedAt: all.has('created_at'),
  };
}

// ---------------------------------------------------------------------------
// Financial effect recorded on approval (employee_request_meta.financial_json)
// ---------------------------------------------------------------------------

export interface FinancialAdjustmentRecord {
  id: string;
  period: string;
  category: AdjustmentCategory;
  kind: AdjustmentKind;
  amount: number;
  installmentNo: number | null;
  installmentCount: number | null;
  quantity: number | null;
  rate: number | null;
  /** Filled on read from the ledger: 'active' | 'cancelled' | 'missing'. */
  status?: string;
  payrollRunId?: string | null;
}

export interface FinancialVoucherRecord {
  id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  /** Filled on read (the number is assigned inside the insert statement). */
  number?: string | null;
}

export interface RequestFinancial {
  employeeId: string | null;
  employeeName: string | null;
  total: number;
  adjustments: FinancialAdjustmentRecord[];
  voucher: FinancialVoucherRecord | null;
  deactivatedEmployee: boolean;
  unpaidDays: number | null;
  dailyRate: number | null;
  postedAt: string;
  postedBy: string;
  postedByName: string;
}

// ---------------------------------------------------------------------------
// Normalized read model
// ---------------------------------------------------------------------------

export interface RequestMeta {
  employeeId: string | null;
  reason: string | null;
  leaveType: string | null;
  leaveStart: string | null;
  leaveEnd: string | null;
  leaveDays: number | null;
  permissionHours: number | null;
  requestedInstallments: number | null;
  financial: RequestFinancial | null;
  respondedByName: string | null;
}

export interface NormalizedRequest {
  id: string;
  branchId: string;
  employeeName: string;
  nationalId: string | null;
  requestType: string;
  requestDate: string | null;
  status: string;
  advanceAmount: number | null;
  vacationDate: string | null;
  duesAmount: number | null;
  permissionDate: string | null;
  violationDate: string | null;
  violationDescription: string | null;
  resignationDate: string | null;
  resignationReason: string | null;
  adminResponse: string | null;
  respondedAt: string | null;
  userId: string | null;
  requesterName: string | null;
  createdAt: string | null;
  meta: RequestMeta;
}

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value);
  return s === '' ? null : s;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseFinancial(value: unknown): RequestFinancial | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const f = parsed as Partial<RequestFinancial>;
    return {
      employeeId: f.employeeId ?? null,
      employeeName: f.employeeName ?? null,
      total: Number(f.total) || 0,
      adjustments: Array.isArray(f.adjustments) ? f.adjustments.filter(a => a && isAdjustmentCategory(a.category)) : [],
      voucher: f.voucher && typeof f.voucher === 'object' ? f.voucher : null,
      deactivatedEmployee: f.deactivatedEmployee === true,
      unpaidDays: f.unpaidDays ?? null,
      dailyRate: f.dailyRate ?? null,
      postedAt: String(f.postedAt ?? ''),
      postedBy: String(f.postedBy ?? ''),
      postedByName: String(f.postedByName ?? ''),
    };
  } catch {
    return null;
  }
}

export function normalizeRequestRow(row: Row): NormalizedRequest {
  return {
    id: String(row.id),
    branchId: String(row.branch_id ?? ''),
    employeeName: String(row.employee_name ?? ''),
    nationalId: text(row.national_id),
    requestType: String(row.request_type ?? ''),
    requestDate: text(row.request_date),
    status: String(row.status ?? 'pending'),
    advanceAmount: num(row.advance_amount),
    vacationDate: text(row.vacation_date),
    duesAmount: num(row.dues_amount),
    permissionDate: text(row.permission_date),
    violationDate: text(row.violation_date),
    violationDescription: text(row.violation_description),
    resignationDate: text(row.resignation_date),
    resignationReason: text(row.resignation_reason),
    adminResponse: text(row.admin_response) ?? text(row.response_notes),
    respondedAt: text(row.response_date) ?? text(row.responded_at),
    userId: text(row.user_id),
    requesterName: text(row.requester_full_name) ?? text(row.requester_username),
    createdAt: text(row.created_at),
    meta: {
      employeeId: text(row.meta_employee_id),
      reason: text(row.meta_reason),
      leaveType: text(row.meta_leave_type),
      leaveStart: text(row.meta_leave_start),
      leaveEnd: text(row.meta_leave_end),
      leaveDays: num(row.meta_leave_days),
      permissionHours: num(row.meta_permission_hours),
      requestedInstallments: num(row.meta_requested_installments),
      financial: parseFinancial(row.meta_financial_json),
      respondedByName: text(row.meta_responded_by_name),
    },
  };
}

/**
 * Loads requests (joined with their meta row and requester) matching `where`
 * (SQL over alias `r`), newest first, and refreshes the live state of any
 * ledger entries / vouchers they posted.
 */
export async function loadRequests(
  db: D1Database,
  where: string,
  params: unknown[],
  limit = 500,
): Promise<NormalizedRequest[]> {
  const cols = await getRequestColumns(db);
  const order = [cols.hasCreatedAt ? 'r.created_at DESC' : null, 'r.request_date DESC', 'r.rowid DESC'].filter(Boolean).join(', ');
  const result = await db
    .prepare(
      `SELECT r.*,
              m.employee_id AS meta_employee_id, m.reason AS meta_reason, m.leave_type AS meta_leave_type,
              m.leave_start AS meta_leave_start, m.leave_end AS meta_leave_end, m.leave_days AS meta_leave_days,
              m.permission_hours AS meta_permission_hours, m.requested_installments AS meta_requested_installments,
              m.financial_json AS meta_financial_json, m.responded_by_name AS meta_responded_by_name,
              u.full_name AS requester_full_name, u.username AS requester_username
       FROM employee_requests r
       LEFT JOIN employee_request_meta m ON m.request_id = r.id
       LEFT JOIN users_new u ON u.id = r.user_id
       WHERE ${where}
       ORDER BY ${order}
       LIMIT ?`,
    )
    .bind(...params, Math.max(1, Math.min(limit, 2000)))
    .all<Row>();
  const requests = (result.results ?? []).map(normalizeRequestRow);
  await refreshFinancialState(db, requests);
  return requests;
}

export async function loadRequest(db: D1Database, id: string): Promise<NormalizedRequest | null> {
  const [request] = await loadRequests(db, 'r.id = ?', [id], 1);
  return request ?? null;
}

/** Marks posted ledger entries as active/cancelled and fills voucher numbers/status. */
async function refreshFinancialState(db: D1Database, requests: NormalizedRequest[]): Promise<void> {
  const adjustmentIds: string[] = [];
  const voucherIds: string[] = [];
  for (const r of requests) {
    const f = r.meta.financial;
    if (!f) continue;
    for (const a of f.adjustments) adjustmentIds.push(String(a.id));
    if (f.voucher?.id) voucherIds.push(String(f.voucher.id));
  }
  if (adjustmentIds.length === 0 && voucherIds.length === 0) return;

  const adjustments = new Map<string, Row>();
  const vouchers = new Map<string, Row>();
  try {
    for (const chunk of chunks(adjustmentIds, 90)) {
      const res = await db
        .prepare(`SELECT id, status, payroll_run_id FROM payroll_adjustments WHERE id IN (${chunk.map(() => '?').join(', ')})`)
        .bind(...chunk)
        .all<Row>();
      for (const row of res.results ?? []) adjustments.set(String(row.id), row);
    }
    for (const chunk of chunks(voucherIds, 90)) {
      const res = await db
        .prepare(`SELECT id, voucher_number, status FROM financial_vouchers WHERE id IN (${chunk.map(() => '?').join(', ')})`)
        .bind(...chunk)
        .all<Row>();
      for (const row of res.results ?? []) vouchers.set(String(row.id), row);
    }
  } catch (error) {
    console.error('refreshFinancialState failed:', error);
    return;
  }

  for (const r of requests) {
    const f = r.meta.financial;
    if (!f) continue;
    for (const a of f.adjustments) {
      const live = adjustments.get(String(a.id));
      a.status = live ? String(live.status) : 'missing';
      a.payrollRunId = live?.payroll_run_id ? String(live.payroll_run_id) : null;
    }
    if (f.voucher?.id) {
      const live = vouchers.get(String(f.voucher.id));
      if (live) {
        f.voucher.number = text(live.voucher_number);
        f.voucher.status = String(live.status);
      } else {
        f.voucher.status = 'missing';
        f.voucher.number = null;
      }
    }
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

export interface BranchEmployee {
  id: string;
  name: string;
  nationalId: string | null;
  baseSalary: number;
  supervisorAllowance: number;
  incentives: number;
}

export async function loadBranchEmployees(db: D1Database, branchId: string): Promise<BranchEmployee[]> {
  const result = await db
    .prepare(
      `SELECT id, employee_name, national_id, base_salary, supervisor_allowance, incentives
       FROM employees WHERE branch_id = ? AND is_active = 1 ORDER BY employee_name`,
    )
    .bind(branchId)
    .all<Row>();
  return (result.results ?? []).map(row => ({
    id: String(row.id),
    name: String(row.employee_name ?? ''),
    nationalId: text(row.national_id),
    baseSalary: Number(row.base_salary) || 0,
    supervisorAllowance: Number(row.supervisor_allowance) || 0,
    incentives: Number(row.incentives) || 0,
  }));
}

/**
 * Finds the employee a request is about: by normalized full name (first name
 * that matches exactly one employee wins), then by national id. Ambiguous
 * names (two employees with the same name) do not match.
 */
export function matchEmployee(
  employees: BranchEmployee[],
  names: Array<string | null | undefined>,
  nationalId?: string | null,
): BranchEmployee | null {
  for (const name of names) {
    const wanted = name ? normalizeArabicName(name) : '';
    if (!wanted) continue;
    const hits = employees.filter(e => normalizeArabicName(e.name) === wanted);
    if (hits.length === 1) return hits[0];
  }
  const nid = nationalId?.trim();
  if (nid) {
    const hits = employees.filter(e => e.nationalId?.trim() === nid);
    if (hits.length === 1) return hits[0];
  }
  return null;
}

/**
 * Active user accounts of the branch whose full name matches the employee's
 * name — so an employee also sees (and is notified about) requests a
 * supervisor filed on their behalf.
 */
export async function findEmployeeUserIds(db: D1Database, branchId: string, employeeName: string): Promise<string[]> {
  const wanted = normalizeArabicName(employeeName);
  if (!wanted) return [];
  try {
    const result = await db
      .prepare('SELECT id, full_name FROM users_new WHERE branch_id = ? AND is_active = 1 AND full_name IS NOT NULL')
      .bind(branchId)
      .all<{ id: string; full_name: string | null }>();
    return (result.results ?? []).filter(u => u.full_name && normalizeArabicName(u.full_name) === wanted).map(u => u.id);
  } catch (error) {
    console.error('findEmployeeUserIds failed:', error);
    return [];
  }
}

export function employeeDailyRate(e: Pick<BranchEmployee, 'baseSalary' | 'supervisorAllowance' | 'incentives'>): number {
  return dailyRate(e);
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** Organization currency without loading logo/stamp images. */
export async function getOrgCurrency(db: D1Database): Promise<CurrencyCode> {
  try {
    const row = await db.prepare(`SELECT value FROM organization_settings WHERE key = 'currency'`).first<{ value: string | null }>();
    return isCurrencyCode(row?.value) ? row!.value as CurrencyCode : 'SAR';
  } catch {
    return 'SAR';
  }
}

/** Inclusive number of calendar days between two ISO dates. */
export function inclusiveDays(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Human-readable lines describing what an approval posted (for notifications and audit). */
export function describeFinancial(f: RequestFinancial | null, currency: CurrencyCode = 'SAR'): string[] {
  if (!f) return [];
  const lines: string[] = [];
  for (const a of f.adjustments) {
    const info = ADJUSTMENT_CATEGORIES[a.category];
    const amount = formatMoney(a.amount, currency);
    const month = periodLabelAr(a.period);
    const installment = a.installmentCount && a.installmentCount > 1 ? ` (قسط ${a.installmentNo} من ${a.installmentCount})` : '';
    lines.push(
      info.kind === 'deduction'
        ? `يُخصم ${amount} (${info.labelAr}) من راتب ${month}${installment}`
        : `يُضاف ${amount} (${info.labelAr}) إلى راتب ${month}${installment}`,
    );
  }
  if (f.voucher) lines.push(`سند صرف بمبلغ ${formatMoney(f.voucher.amount, currency)}${f.voucher.status === 'pending' ? ' بانتظار اعتماد المدير' : ''}`);
  if (f.deactivatedEmployee) lines.push('تم إيقاف الموظف في سجل الموظفين');
  return lines;
}

const EMAIL_HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Makes user-supplied text safe to pass to the e-mail triggers: src/lib/email.ts
 * splices template variables into HTML verbatim, through String.replace with a
 * string replacement (where `$&`, `$'`, `$1`, ... are special). So the text is
 * HTML-escaped and every `$` becomes the `&#36;` entity.
 */
export function emailSafe(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[&<>"']/g, ch => EMAIL_HTML_ESCAPES[ch])
    .replace(/\$/g, '&#36;');
}

export function shortRequestNo(id: string): string {
  return id.replace(/^req_/, '').slice(-8).toUpperCase();
}

/** The runtime env as the email triggers expect it. */
export function emailEnv(context: Pick<APIContext, 'locals'>): EmailEnv {
  return (context.locals as { runtime: { env: unknown } }).runtime.env as EmailEnv;
}

/**
 * Runs a best-effort side effect (e-mail) after the main write committed:
 * errors are logged, never propagated. Uses waitUntil when the Workers
 * runtime offers it so the response is not held up by the mail provider.
 */
export async function runSideEffect(context: Pick<APIContext, 'locals'>, task: () => Promise<void>): Promise<void> {
  let guarded: Promise<void>;
  try {
    guarded = task().catch(error => console.error('Request side effect failed:', error));
  } catch (error) {
    console.error('Request side effect failed:', error);
    return;
  }
  const ctx = (context.locals as { runtime?: { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } }).runtime?.ctx;
  if (typeof ctx?.waitUntil === 'function') {
    ctx.waitUntil(guarded);
    return;
  }
  await guarded;
}
