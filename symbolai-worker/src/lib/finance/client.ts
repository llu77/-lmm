// Browser helpers for the finance pages (payroll, adjustments, requests,
// bonus, vouchers, settings). Import from page <script> blocks only.

import { formatMoney, type CurrencyCode } from './money';
import { MONTH_NAMES_AR, toPeriod, parsePeriod, currentPeriod } from './catalog';

export interface FinanceContextPayload {
  user: {
    id: string;
    username: string;
    displayName: string;
    roleName: string;
    roleNameAr: string;
    branchId: string | null;
    branchName: string | null;
  };
  permissions: {
    canViewAllBranches: boolean;
    canViewReports: boolean;
    canAddRevenue: boolean;
    canAddExpense: boolean;
    canManageEmployees: boolean;
    canManageRequests: boolean;
    canApproveRequests: boolean;
    canSubmitRequests: boolean;
    canViewOwnRequests: boolean;
    canGeneratePayroll: boolean;
    canManageBonus: boolean;
    canViewOwnBonus: boolean;
    canManageSettings: boolean;
    /** Approve payroll runs and vouchers (applies signature + stamp). */
    canApproveFinance: boolean;
  };
  branches: Array<{ id: string; name: string }>;
  organization: { companyNameAr: string; companyNameEn: string; currency: CurrencyCode; vatRate: number };
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public data: Record<string, unknown> = {}) {
    super(message);
  }
}

/** fetch + JSON with consistent Arabic error messages. Throws ApiError on any failure. */
export async function api<T = Record<string, unknown>>(
  url: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('تعذر الاتصال بالخادم — تحقق من الاتصال بالإنترنت', 0);
  }

  let data: Record<string, unknown> = {};
  try {
    data = await response.json();
  } catch {
    // non-JSON body (e.g. a plain-text 401)
  }

  if (response.status === 401) {
    window.location.href = '/auth/login';
    throw new ApiError('انتهت الجلسة — يرجى تسجيل الدخول', 401, data);
  }
  if (!response.ok || data.success === false) {
    const message = typeof data.error === 'string' && data.error ? data.error : `حدث خطأ غير متوقع (${response.status})`;
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

let activeCurrency: CurrencyCode = 'SAR';

export function money(value: unknown): string {
  return formatMoney(Number(value) || 0, activeCurrency);
}

let contextPromise: Promise<FinanceContextPayload> | null = null;

export function loadFinanceContext(): Promise<FinanceContextPayload> {
  if (!contextPromise) {
    contextPromise = api<{ context: FinanceContextPayload }>('/api/finance/context')
      .then(r => {
        activeCurrency = r.context.organization.currency;
        return r.context;
      })
      .catch(error => {
        contextPromise = null;
        throw error;
      });
  }
  return contextPromise;
}

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode): selection simply isn't remembered
  }
}

/**
 * Fills a branch <select>. Branch-bound users get their branch, locked;
 * all-branch users get every branch with their last choice remembered.
 */
export function fillBranchSelect(select: HTMLSelectElement, ctx: FinanceContextPayload): string {
  const branches = ctx.branches.length
    ? ctx.branches
    : ctx.user.branchId
      ? [{ id: ctx.user.branchId, name: ctx.user.branchName ?? ctx.user.branchId }]
      : [];
  select.innerHTML = branches.map(b => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`).join('');

  if (!ctx.permissions.canViewAllBranches && ctx.user.branchId) {
    select.value = ctx.user.branchId;
    select.disabled = true;
  } else {
    const remembered = storageGet('finance.branchId');
    if (remembered && branches.some(b => b.id === remembered)) select.value = remembered;
    select.addEventListener('change', () => storageSet('finance.branchId', select.value));
  }
  return select.value;
}

/** Fills month (1-12) and year selects; years span 2024 … next year. */
export function fillPeriodSelects(monthSelect: HTMLSelectElement, yearSelect: HTMLSelectElement, period = currentPeriod()): void {
  const p = parsePeriod(period) ?? parsePeriod(currentPeriod())!;
  monthSelect.innerHTML = MONTH_NAMES_AR.map((name, i) => `<option value="${i + 1}">${name}</option>`).join('');
  const lastYear = Math.max(new Date().getFullYear() + 1, p.year);
  const years: number[] = [];
  for (let y = lastYear; y >= 2024; y--) years.push(y);
  yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  monthSelect.value = String(p.month);
  yearSelect.value = String(p.year);
}

export function readPeriod(monthSelect: HTMLSelectElement, yearSelect: HTMLSelectElement): string {
  return toPeriod(Number(yearSelect.value), Number(monthSelect.value));
}

const dateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

/** Formats 'YYYY-MM-DD' or SQLite 'YYYY-MM-DD HH:MM:SS' (UTC) for display. */
export function formatDate(value: unknown, withTime = false): string {
  if (typeof value !== 'string' || !value) return '—';
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return value;
  return withTime ? dateTimeFormatter.format(d) : dateFormatter.format(d);
}

export function toast(message: string, kind: 'success' | 'error' | 'info' = 'success'): void {
  let host = document.getElementById('finance-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'finance-toast-host';
    host.setAttribute('aria-live', 'polite');
    host.className = 'fixed bottom-4 left-4 z-[100] flex flex-col gap-2 max-w-sm print:hidden';
    document.body.appendChild(host);
  }
  const colors = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-slate-800 text-white',
  }[kind];
  const item = document.createElement('div');
  item.className = `rounded-md px-4 py-3 shadow-lg text-sm ${colors}`;
  item.textContent = message;
  host.appendChild(item);
  setTimeout(() => item.remove(), kind === 'error' ? 7000 : 4000);
}

/** Disables a button while `task` runs and restores its label afterwards. */
export async function withBusy<T>(button: HTMLButtonElement | null, busyLabel: string, task: () => Promise<T>): Promise<T> {
  if (!button) return task();
  const label = button.textContent;
  button.disabled = true;
  button.textContent = busyLabel;
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

export function byId<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}
