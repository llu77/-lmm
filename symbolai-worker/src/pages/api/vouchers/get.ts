import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { canAccessBranch, type EnhancedSession } from '@/lib/permissions';
import { financeAuth, ok, fail, str, canApproveFinance, type PermissionFlag } from '@/lib/finance/http';
import {
  MONTH_NAMES_AR,
  PAYMENT_METHODS,
  VOUCHER_TYPES,
  type PaymentMethod,
  type VoucherType,
} from '@/lib/finance/catalog';
import {
  amountToArabicWords,
  amountToEnglishWords,
  formatAmount,
  formatMoney,
  fromMinor,
  isCurrencyCode,
  toMinor,
  type CurrencyCode,
} from '@/lib/finance/money';
import type { VoucherItem } from '@/lib/finance/vouchers';
import type { OrganizationProfile, UserSignature } from '@/lib/finance/documents';

// ---------------------------------------------------------------------------
// Shared voucher helpers (used by every /api/vouchers/* route and the print page)
// ---------------------------------------------------------------------------

/** Who may open the vouchers screens. Partners (canViewReports only) get read-only access. */
export const VOUCHER_VIEW_FLAGS: PermissionFlag[] = [
  'canAddRevenue',
  'canAddExpense',
  'canGeneratePayroll',
  'canManageSettings',
  'canViewReports',
];

/** Pre-filter for write routes; the per-type rule is canCreateVoucherType. */
export const VOUCHER_WRITE_FLAGS: PermissionFlag[] = ['canAddRevenue', 'canAddExpense', 'canGeneratePayroll', 'canManageSettings'];

export type PartyType = 'employee' | 'customer' | 'supplier' | 'other';
export type VoucherStatus = 'pending' | 'approved' | 'cancelled';

export const PARTY_TYPES: Record<PartyType, { ar: string; en: string }> = {
  employee: { ar: 'موظف', en: 'Employee' },
  customer: { ar: 'عميل', en: 'Customer' },
  supplier: { ar: 'مورد', en: 'Supplier' },
  other: { ar: 'أخرى', en: 'Other' },
};

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  pending: 'بانتظار الاعتماد',
  approved: 'معتمد',
  cancelled: 'ملغي',
};

export function isVoucherType(value: unknown): value is VoucherType {
  return value === 'receipt' || value === 'payment';
}

export function isPartyType(value: unknown): value is PartyType {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PARTY_TYPES, value);
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PAYMENT_METHODS, value);
}

/** Receipts: revenue staff; payments: expense or payroll staff. The manager may do both. */
export function canCreateVoucherType(session: EnhancedSession, type: VoucherType): boolean {
  if (canApproveFinance(session)) return true;
  const p = session.permissions;
  return type === 'receipt' ? p.canAddRevenue === true : p.canAddExpense === true || p.canGeneratePayroll === true;
}

export interface VoucherDto {
  id: string;
  branchId: string;
  branchName: string | null;
  type: VoucherType;
  typeLabel: string;
  typeLabelEn: string;
  number: string;
  sequenceNo: number;
  date: string;
  partyType: PartyType;
  partyTypeLabel: string;
  partyName: string;
  employeeId: string | null;
  partyIdNumber: string | null;
  partyPhone: string | null;
  amount: number;
  currency: CurrencyCode;
  purpose: string;
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  split: { cash: number; bank: number; cheque: number; card: number };
  chequeNumber: string | null;
  chequeDate: string | null;
  bankName: string | null;
  transactionRef: string | null;
  items: VoucherItem[];
  itemCount: number;
  subtotal: number | null;
  discount: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  notes: string | null;
  status: VoucherStatus;
  statusLabel: string;
  sourceType: string;
  sourceId: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  cancelledBy: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

export interface VoucherActions {
  print: boolean;
  edit: boolean;
  approve: boolean;
  cancel: boolean;
}

function textOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value);
  return s ? s : null;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Parses items_json defensively (bad JSON or rows → ignored). */
export function parseVoucherItems(json: unknown): VoucherItem[] {
  if (typeof json !== 'string' || !json) return [];
  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    return data
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        description: String(item.description ?? ''),
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        total: Number(item.total) || 0,
      }));
  } catch {
    return [];
  }
}

export function mapVoucherRow(row: Record<string, unknown>, options: { includeItems?: boolean } = {}): VoucherDto {
  const type: VoucherType = row.voucher_type === 'receipt' ? 'receipt' : 'payment';
  const partyType: PartyType = isPartyType(row.party_type) ? row.party_type : 'other';
  const paymentMethod: PaymentMethod = isPaymentMethod(row.payment_method) ? row.payment_method : 'cash';
  const status: VoucherStatus =
    row.status === 'approved' || row.status === 'cancelled' ? row.status : 'pending';
  const items = parseVoucherItems(row.items_json);
  return {
    id: String(row.id),
    branchId: String(row.branch_id ?? ''),
    branchName: textOrNull(row.branch_name),
    type,
    typeLabel: VOUCHER_TYPES[type].ar,
    typeLabelEn: VOUCHER_TYPES[type].en,
    number: String(row.voucher_number ?? ''),
    sequenceNo: Number(row.sequence_no) || 0,
    date: String(row.voucher_date ?? ''),
    partyType,
    partyTypeLabel: PARTY_TYPES[partyType].ar,
    partyName: String(row.party_name ?? ''),
    employeeId: textOrNull(row.employee_id),
    partyIdNumber: textOrNull(row.party_id_number),
    partyPhone: textOrNull(row.party_phone),
    amount: Number(row.amount) || 0,
    currency: isCurrencyCode(row.currency) ? row.currency : 'SAR',
    purpose: String(row.purpose ?? ''),
    paymentMethod,
    paymentMethodLabel: PAYMENT_METHODS[paymentMethod].ar,
    split: {
      cash: Number(row.cash_amount) || 0,
      bank: Number(row.bank_amount) || 0,
      cheque: Number(row.cheque_amount) || 0,
      card: Number(row.card_amount) || 0,
    },
    chequeNumber: textOrNull(row.cheque_number),
    chequeDate: textOrNull(row.cheque_date),
    bankName: textOrNull(row.bank_name),
    transactionRef: textOrNull(row.transaction_ref),
    items: options.includeItems === false ? [] : items,
    itemCount: items.length,
    subtotal: numOrNull(row.subtotal),
    discount: numOrNull(row.discount),
    vatRate: numOrNull(row.vat_rate),
    vatAmount: numOrNull(row.vat_amount),
    notes: textOrNull(row.notes),
    status,
    statusLabel: VOUCHER_STATUS_LABELS[status],
    sourceType: String(row.source_type ?? 'manual'),
    sourceId: textOrNull(row.source_id),
    createdBy: textOrNull(row.created_by),
    createdByName: textOrNull(row.created_by_name),
    createdAt: textOrNull(row.created_at),
    updatedAt: textOrNull(row.updated_at),
    approvedBy: textOrNull(row.approved_by),
    approvedByName: textOrNull(row.approved_by_name),
    approvedAt: textOrNull(row.approved_at),
    cancelledBy: textOrNull(row.cancelled_by),
    cancelledByName: textOrNull(row.cancelled_by_name),
    cancelledAt: textOrNull(row.cancelled_at),
    cancelReason: textOrNull(row.cancel_reason),
  };
}

/** What the current user may do with a voucher (the server re-checks on every action). */
export function voucherActions(session: EnhancedSession, v: Pick<VoucherDto, 'type' | 'status' | 'createdBy'>): VoucherActions {
  const mayWrite = canCreateVoucherType(session, v.type);
  const manager = canApproveFinance(session);
  return {
    print: true,
    edit: v.status === 'pending' && mayWrite,
    approve: v.status === 'pending' && manager,
    cancel:
      v.status === 'pending'
        ? mayWrite || (v.createdBy !== null && v.createdBy === session.userId)
        : v.status === 'approved' && manager,
  };
}

export async function loadVoucherRow(db: D1Database, id: string): Promise<Record<string, unknown> | null> {
  return db.prepare('SELECT * FROM financial_vouchers WHERE id = ?').bind(id).first<Record<string, unknown>>();
}

/** Loads a voucher and enforces branch scoping: 404 when missing, 403 for another branch. */
export async function loadScopedVoucher(
  db: D1Database,
  session: EnhancedSession,
  id: string,
): Promise<Record<string, unknown> | Response> {
  if (!id) return fail('معرّف السند مطلوب', 400);
  const row = await loadVoucherRow(db, id);
  if (!row) return fail('السند غير موجود', 404);
  if (!canAccessBranch(session, String(row.branch_id ?? ''))) {
    return fail('لا يمكنك الوصول إلى سندات هذا الفرع', 403);
  }
  return row;
}

/** Staff read access to the vouchers screens (branch scoping still applies per voucher). */
/**
 * Payroll and request (advance) vouchers expose per-employee pay, so only
 * payroll staff and the manager may see them — never partners.
 */
export function canSeePayVouchers(session: EnhancedSession): boolean {
  return session.permissions.canGeneratePayroll === true || canApproveFinance(session);
}

export function hasVoucherViewPermission(session: EnhancedSession): boolean {
  return VOUCHER_VIEW_FLAGS.some(flag => session.permissions[flag] === true) || canApproveFinance(session);
}

/**
 * True when `userId` may read this one request-generated voucher as its
 * beneficiary: (b) they filed the request (employee_requests.user_id), or
 * (a) they are the employee it pays — an APPROVED request they filed is
 * linked (employee_request_meta.employee_id) to the voucher's employee.
 * Pending or rejected requests never prove identity: a self-service user
 * could otherwise claim a colleague's record and read their vouchers.
 */
export async function isOwnRequestVoucher(db: D1Database, userId: string, row: Record<string, unknown>): Promise<boolean> {
  if (row.source_type !== 'request' || typeof row.source_id !== 'string' || !row.source_id || !userId) return false;
  try {
    const filed = await db
      .prepare('SELECT 1 AS ok FROM employee_requests WHERE id = ? AND user_id = ?')
      .bind(row.source_id, userId)
      .first<{ ok: number }>();
    if (filed) return true;
    if (typeof row.employee_id === 'string' && row.employee_id) {
      const linked = await db
        .prepare(
          `SELECT 1 AS ok FROM employee_request_meta m
           JOIN employee_requests r ON r.id = m.request_id
           WHERE m.employee_id = ? AND r.user_id = ? AND r.status = 'approved' LIMIT 1`,
        )
        .bind(row.employee_id, userId)
        .first<{ ok: number }>();
      if (linked) return true;
    }
  } catch (error) {
    console.error('Voucher owner check failed:', error);
  }
  return false;
}

export const READ_ONLY_ACTIONS: VoucherActions = { print: true, edit: false, approve: false, cancel: false };

/**
 * Read access to one voucher: finance staff of its branch, or (read-only) the
 * employee/requester of a request-generated voucher. Other users get a 403
 * without learning whether the id exists.
 */
export async function loadReadableVoucher(
  db: D1Database,
  session: EnhancedSession,
  id: string,
): Promise<{ row: Record<string, unknown>; ownerAccess: boolean } | Response> {
  if (!id) return fail('معرّف السند مطلوب', 400);
  const staff = hasVoucherViewPermission(session);
  const row = await loadVoucherRow(db, id);
  const payVoucher = row !== null && row.source_type !== 'manual';
  if (row && staff && canAccessBranch(session, String(row.branch_id ?? '')) && (!payVoucher || canSeePayVouchers(session))) {
    return { row, ownerAccess: false };
  }
  if (row && (await isOwnRequestVoucher(db, session.userId, row))) return { row, ownerAccess: true };
  if (!staff) return fail('صلاحيات غير كافية لعرض هذا السند', 403);
  if (!row) return fail('السند غير موجود', 404);
  if (payVoucher && !canSeePayVouchers(session)) return fail('سندات الرواتب والسلف متاحة لمسؤولي الرواتب فقط', 403);
  return fail('لا يمكنك الوصول إلى سندات هذا الفرع', 403);
}

/** Current display names (full name, else username) for user ids. */
export async function loadUserDisplayNames(db: D1Database, ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;
  try {
    const result = await db
      .prepare(`SELECT * FROM users_new WHERE id IN (${unique.map(() => '?').join(', ')})`)
      .bind(...unique)
      .all<Record<string, unknown>>();
    for (const row of result.results ?? []) {
      const name = (typeof row.full_name === 'string' && row.full_name.trim()) || (typeof row.username === 'string' ? row.username : '');
      if (name) out.set(String(row.id), name);
    }
  } catch (error) {
    console.error('Failed to load user names for vouchers:', error);
  }
  return out;
}

export interface PaymentBucket {
  method: Exclude<PaymentMethod, 'mixed'>;
  ar: string;
  en: string;
  amount: number;
}

/** Non-zero payment buckets in display order (cash, transfer, cheque, card). */
export function paymentBreakdown(v: Pick<VoucherDto, 'split' | 'paymentMethod' | 'amount'>): PaymentBucket[] {
  const order: Array<[PaymentBucket['method'], number]> = [
    ['cash', v.split.cash],
    ['bank_transfer', v.split.bank],
    ['cheque', v.split.cheque],
    ['card', v.split.card],
  ];
  const buckets = order
    .filter(([, amount]) => toMinor(amount) > 0)
    .map(([method, amount]) => ({ method, ar: PAYMENT_METHODS[method].ar, en: PAYMENT_METHODS[method].en, amount }));
  if (buckets.length === 0 && v.paymentMethod !== 'mixed') {
    const m = v.paymentMethod;
    return [{ method: m, ar: PAYMENT_METHODS[m].ar, en: PAYMENT_METHODS[m].en, amount: v.amount }];
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Print model (pure; the print page renders it, tests assert on it)
// ---------------------------------------------------------------------------

/** "29 أكتوبر 2026" */
export function formatGregorianAr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTH_NAMES_AR[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** "18 جمادى الأولى 1448 هـ" (Umm al-Qura), or null when the runtime lacks the calendar. */
export function formatHijriAr(iso: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  try {
    const text = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${iso}T12:00:00Z`));
    const clean = text.replace(/[‎‏؜]/g, '').trim();
    return clean.includes('هـ') ? clean : `${clean} هـ`;
  } catch {
    return null;
  }
}

/** "29/10/2026 14:05" in Riyadh time (UTC+3, no DST). Accepts SQLite UTC timestamps. */
export function formatRiyadhDateTime(value: Date | string | null | undefined): string {
  let date: Date;
  if (value instanceof Date) date = value;
  else if (typeof value === 'string' && value) {
    const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
    date = new Date(iso);
  } else return '';
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '';
  const r = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(r.getUTCDate())}/${pad(r.getUTCMonth() + 1)}/${r.getUTCFullYear()} ${pad(r.getUTCHours())}:${pad(r.getUTCMinutes())}`;
}

export interface PrintRow {
  ar: string;
  en: string;
  value: string;
  /** Second line under the value (English words / English payment text). */
  sub?: string | null;
  /** Visual emphasis: amount figures/words. */
  kind?: 'party' | 'amount' | 'words' | 'plain';
  numeric?: boolean;
}

export interface PrintSignatureSlot {
  titleAr: string;
  titleEn: string;
  name?: string | null;
  signatureImage?: string | null;
  stamp?: boolean;
  date?: string | null;
  handwritten?: boolean;
}

export interface VoucherPrintModel {
  titleAr: string;
  titleEn: string;
  number: string;
  dateGregorian: string;
  dateHijri: string | null;
  amountText: string;
  currency: CurrencyCode;
  rows: PrintRow[];
  items: Array<{ description: string; quantity: string; unitPrice: string; total: string }>;
  totals: Array<{ ar: string; en: string; value: string; strong?: boolean }>;
  notes: string | null;
  slots: PrintSignatureSlot[];
  watermark: string | null;
  statusLine: string;
  statusTone: 'pending' | 'approved' | 'cancelled';
  sourceLine: string | null;
}

function formatQuantity(q: number): string {
  return Number.isInteger(q) ? String(q) : String(Math.round(q * 1000) / 1000);
}

export function buildVoucherPrintModel(
  v: VoucherDto,
  org: Pick<OrganizationProfile, 'companyNameAr'>,
  signatures: Map<string, UserSignature>,
  names: Map<string, string> = new Map(),
): VoucherPrintModel {
  const meta = VOUCHER_TYPES[v.type];
  const currency = v.currency;
  const rows: PrintRow[] = [];

  rows.push({
    ar: `${meta.partyAr} السيد/السادة`,
    en: meta.partyEn,
    value: v.partyName,
    kind: 'party',
  });
  const idParts = [v.partyIdNumber, v.partyPhone].filter((x): x is string => Boolean(x));
  if (idParts.length) rows.push({ ar: 'رقم الهوية / الجوال', en: 'ID / Mobile', value: idParts.join('  •  '), numeric: true });
  rows.push({ ar: 'مبلغ وقدره', en: 'Amount', value: `${formatAmount(v.amount)} ${currency}`, kind: 'amount', numeric: true });
  rows.push({
    ar: 'المبلغ كتابةً',
    en: 'Amount in words',
    value: amountToArabicWords(v.amount, currency),
    sub: amountToEnglishWords(v.amount, currency),
    kind: 'words',
  });
  rows.push({ ar: 'وذلك مقابل', en: 'Being for', value: v.purpose });

  const buckets = paymentBreakdown(v);
  const single = buckets.length <= 1;
  rows.push({
    ar: 'طريقة الدفع',
    en: 'Payment method',
    value: single
      ? (buckets[0]?.ar ?? v.paymentMethodLabel)
      : buckets.map(b => `${b.ar} ${formatMoney(b.amount, currency)}`).join('  •  '),
    sub: single
      ? (buckets[0]?.en ?? PAYMENT_METHODS[v.paymentMethod].en)
      : buckets.map(b => `${b.en} ${formatAmount(b.amount)}`).join('  •  '),
  });
  if (v.chequeNumber) {
    rows.push({
      ar: 'شيك رقم / تاريخه',
      en: 'Cheque No. / Date',
      value: v.chequeDate ? `${v.chequeNumber}  —  ${formatGregorianAr(v.chequeDate)}` : v.chequeNumber,
      numeric: !v.chequeDate,
    });
  }
  if (v.bankName) {
    const drawn = v.chequeNumber && toMinor(v.split.cheque) > 0;
    rows.push({ ar: drawn ? 'مسحوب على بنك' : 'البنك', en: drawn ? 'Drawn on bank' : 'Bank', value: v.bankName });
  }
  if (v.transactionRef) rows.push({ ar: 'رقم العملية', en: 'Transaction ID', value: v.transactionRef, numeric: true });

  const items = v.items.map(item => ({
    description: item.description,
    quantity: formatQuantity(item.quantity),
    unitPrice: formatAmount(item.unitPrice),
    total: formatAmount(item.total),
  }));
  const totals: VoucherPrintModel['totals'] = [];
  if (v.items.length) {
    const subtotal = v.subtotal ?? fromMinor(v.items.reduce((s, i) => s + toMinor(i.total), 0));
    totals.push({ ar: 'المجموع', en: 'Sub-total', value: formatAmount(subtotal) });
    if (v.discount && toMinor(v.discount) > 0) totals.push({ ar: 'الخصم', en: 'Discount', value: `- ${formatAmount(v.discount)}` });
    if (v.vatRate && v.vatRate > 0) {
      totals.push({
        ar: `ضريبة القيمة المضافة (${formatQuantity(v.vatRate)}%)`,
        en: `VAT (${formatQuantity(v.vatRate)}%)`,
        value: formatAmount(v.vatAmount ?? 0),
      });
    }
    totals.push({ ar: 'الإجمالي', en: 'Total', value: `${formatAmount(v.amount)} ${currency}`, strong: true });
  }

  const creatorSig = v.createdBy ? signatures.get(v.createdBy) : undefined;
  const approved = v.status === 'approved';
  const approverSig = approved && v.approvedBy ? signatures.get(v.approvedBy) : undefined;
  // Print the account's real name: the self-chosen signerName must not let a
  // user present a signature under someone else's identity.
  const creatorName = (v.createdBy ? names.get(v.createdBy) : null) || v.createdByName || creatorSig?.signerName || null;
  const approverName = approved
    ? (v.approvedBy ? names.get(v.approvedBy) : null) || v.approvedByName || approverSig?.signerName || null
    : null;
  const createdDate = v.createdAt ? formatRiyadhDateTime(v.createdAt).slice(0, 10) : null;
  const approvedDate = approved && v.approvedAt ? formatRiyadhDateTime(v.approvedAt).slice(0, 10) : null;

  const preparer: PrintSignatureSlot =
    v.type === 'payment'
      ? { titleAr: 'المحاسب', titleEn: 'Prepared by', name: creatorName, signatureImage: creatorSig?.image ?? null, date: createdDate }
      : { titleAr: 'أمين الصندوق', titleEn: 'Received by', name: creatorName, signatureImage: creatorSig?.image ?? null, date: createdDate };
  const party: PrintSignatureSlot =
    v.type === 'payment'
      ? { titleAr: 'المستلم', titleEn: 'Receiver', name: v.partyName, handwritten: true }
      : { titleAr: 'الدافع', titleEn: 'Payer', name: v.partyName, handwritten: true };
  const approver: PrintSignatureSlot = {
    titleAr: 'المدير المعتمد',
    titleEn: 'Approved by',
    name: approverName,
    signatureImage: approverSig?.image ?? null,
    stamp: approved,
    date: approvedDate,
    handwritten: !approved,
  };

  let statusLine: string;
  if (v.status === 'approved') {
    statusLine = `معتمد${approverName ? ` من ${approverName}` : ''}${v.approvedAt ? ` بتاريخ ${formatRiyadhDateTime(v.approvedAt)}` : ''}`;
  } else if (v.status === 'cancelled') {
    statusLine = `ملغي${v.cancelledByName ? ` بواسطة ${v.cancelledByName}` : ''}${v.cancelReason ? ` — السبب: ${v.cancelReason}` : ''}`;
  } else {
    statusLine = 'بانتظار اعتماد المدير — لا يُعتد بالسند قبل الاعتماد والختم';
  }

  const sourceLine =
    v.sourceType === 'payroll'
      ? 'سند مولّد آلياً من مسير الرواتب'
      : v.sourceType === 'request'
        ? 'سند مولّد آلياً من طلب موظف'
        : null;

  return {
    titleAr: meta.ar,
    titleEn: meta.en,
    number: v.number,
    dateGregorian: formatGregorianAr(v.date),
    dateHijri: formatHijriAr(v.date),
    amountText: formatAmount(v.amount),
    currency,
    rows,
    items,
    totals,
    notes: v.notes,
    slots: [preparer, party, approver],
    watermark: v.status === 'pending' ? 'بانتظار الاعتماد' : v.status === 'cancelled' ? 'ملغي' : null,
    statusLine,
    statusTone: v.status,
    sourceLine,
  };
}

// ---------------------------------------------------------------------------
// GET /api/vouchers/get?id=
// Finance staff (branch-scoped), or read-only for the employee/requester of a
// request-generated voucher (e.g. the payment voucher of an approved سلفة).
// ---------------------------------------------------------------------------

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const id = str(new URL(context.request.url).searchParams.get('id'), 100);
  if (!id) return fail('معرّف السند مطلوب', 400);

  try {
    const found = await loadReadableVoucher(db, session, id);
    if (found instanceof Response) return found;
    const voucher = mapVoucherRow(found.row);
    const names = await loadUserDisplayNames(db, [voucher.createdBy, voucher.approvedBy, voucher.cancelledBy]);
    return ok({
      voucher: {
        ...voucher,
        createdByDisplayName: (voucher.createdBy && names.get(voucher.createdBy)) || voucher.createdByName,
        approvedByDisplayName: (voucher.approvedBy && names.get(voucher.approvedBy)) || voucher.approvedByName,
        cancelledByDisplayName: (voucher.cancelledBy && names.get(voucher.cancelledBy)) || voucher.cancelledByName,
        amountInWordsAr: amountToArabicWords(voucher.amount, voucher.currency),
        amountInWordsEn: amountToEnglishWords(voucher.amount, voucher.currency),
      },
      actions: found.ownerAccess ? READ_ONLY_ACTIONS : voucherActions(session, voucher),
      readOnly: found.ownerAccess,
    });
  } catch (error) {
    console.error('Voucher get failed:', error);
    return fail('تعذر تحميل السند', 500);
  }
};
