import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { logAudit } from '@/lib/permissions';
import {
  financeAuth,
  ok,
  fail,
  readJsonObject,
  isIsoDate,
  canApproveFinance,
  resolveBranchId,
  getBranchName,
  newId,
  clientIp,
} from '@/lib/finance/http';
import { todayIso, VOUCHER_TYPES, type PaymentMethod, type VoucherType } from '@/lib/finance/catalog';
import {
  formatMoney,
  fromMinor,
  parseNonNegativeAmount,
  parsePositiveAmount,
  toMinor,
  type CurrencyCode,
} from '@/lib/finance/money';
import { normalizePaymentSplit, voucherInsertStatements, type NewVoucher, type VoucherItem } from '@/lib/finance/vouchers';
import { getOrganizationProfile, type OrganizationProfile } from '@/lib/finance/documents';
import { notifyByPermission } from '@/lib/finance/notify';
import {
  VOUCHER_WRITE_FLAGS,
  canCreateVoucherType,
  isPartyType,
  isPaymentMethod,
  isVoucherType,
  loadVoucherRow,
  mapVoucherRow,
  voucherActions,
  type PartyType,
} from './get';

// ---------------------------------------------------------------------------
// Input validation shared by create and update
// ---------------------------------------------------------------------------

export const MAX_VOUCHER_ITEMS = 30;
const MAX_AMOUNT_MINOR = 1e12; // 10,000,000,000.00

export interface VoucherInput {
  type: VoucherType;
  date: string;
  partyType: PartyType;
  partyName: string;
  employeeId: string | null;
  partyIdNumber: string | null;
  partyPhone: string | null;
  purpose: string;
  amount: number;
  paymentMethod: PaymentMethod;
  cashAmount: number;
  bankAmount: number;
  chequeAmount: number;
  cardAmount: number;
  chequeNumber: string | null;
  chequeDate: string | null;
  bankName: string | null;
  transactionRef: string | null;
  items: VoucherItem[] | null;
  subtotal: number | null;
  discount: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  notes: string | null;
}

/** Fields of a system-generated voucher (payroll/request) that edits may not change. */
export type LockedVoucherFields = Pick<
  VoucherInput,
  'partyType' | 'partyName' | 'employeeId' | 'amount' | 'items' | 'subtotal' | 'discount' | 'vatRate' | 'vatAmount'
>;

export type ParseResult = { ok: true; value: VoucherInput } | { ok: false; error: string; status: number };

const bad = (error: string, status = 400): ParseResult => ({ ok: false, error, status });

/** Trimmed text; '' when absent; undefined when not text or longer than `max`. */
function readText(value: unknown, max: number): string | undefined {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const s = String(value).replace(/\s+/g, ' ').trim();
  return s.length > max ? undefined : s;
}

/** Multi-line text (notes): keeps line breaks. */
function readLongText(value: unknown, max: number): string | undefined {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return undefined;
  const s = value.replace(/\r\n?/g, '\n').trim();
  return s.length > max ? undefined : s;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function parseQuantity(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) return null;
  const rounded = Math.round(n * 1000) / 1000;
  return rounded > 0 ? rounded : null;
}

function parseRate(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.trim()) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Line total in halalas: quantity (≤3 decimals) × unit price, rounded once. */
function lineTotalMinor(quantity: number, unitPrice: number): number {
  return Math.round((Math.round(quantity * 1000) * toMinor(unitPrice)) / 1000);
}

/**
 * Validates and normalizes a voucher body. Server-side totals only: with items
 * the amount is subtotal − discount + VAT and any client amount is ignored.
 */
export async function parseVoucherInput(
  db: D1Database,
  body: Record<string, unknown>,
  options: {
    branchId: string;
    org: Pick<OrganizationProfile, 'vatRate'>;
    /** Fixed type (updates): the body may not change it. */
    type?: VoucherType;
    locked?: LockedVoucherFields;
    now?: Date;
  },
): Promise<ParseResult> {
  // Type
  let type: VoucherType;
  if (options.type) {
    if (!isBlank(body.type) && body.type !== options.type) return bad('لا يمكن تغيير نوع السند بعد إنشائه');
    type = options.type;
  } else {
    if (!isVoucherType(body.type)) return bad('نوع السند غير صحيح');
    type = body.type;
  }

  // Date: Gregorian ISO, at most one day ahead of today in Riyadh.
  const today = todayIso(options.now);
  const date = isBlank(body.date) ? today : body.date;
  if (!isIsoDate(date)) return bad('تاريخ السند غير صحيح');
  if (date < '2000-01-01') return bad('تاريخ السند غير صحيح');
  if (date > addDays(today, 1)) return bad('لا يمكن أن يكون تاريخ السند في المستقبل');

  // Party
  let partyType: PartyType;
  let partyName: string;
  let employeeId: string | null = null;
  let partyIdNumber = readText(body.partyIdNumber, 30);
  if (partyIdNumber === undefined) return bad('رقم الهوية طويل جداً (الحد الأقصى 30 حرفاً)');
  let partyPhone = readText(body.partyPhone, 20);
  if (partyPhone === undefined) return bad('رقم الجوال طويل جداً');
  if (partyPhone && !/^[0-9+\-\s()]{5,20}$/.test(partyPhone)) return bad('رقم الجوال غير صحيح');

  if (options.locked) {
    partyType = options.locked.partyType;
    partyName = options.locked.partyName;
    employeeId = options.locked.employeeId;
  } else {
    const rawPartyType = isBlank(body.partyType) ? 'other' : body.partyType;
    if (!isPartyType(rawPartyType)) return bad('نوع الطرف غير صحيح');
    partyType = rawPartyType;
    if (partyType === 'employee') {
      const wanted = readText(body.employeeId, 100);
      if (!wanted) return bad('يرجى اختيار الموظف');
      const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').bind(wanted).first<Record<string, unknown>>();
      if (!employee || String(employee.branch_id ?? '') !== options.branchId) return bad('الموظف غير موجود في هذا الفرع');
      employeeId = String(employee.id);
      partyName = String(employee.employee_name ?? '').trim();
      if (!partyIdNumber && employee.national_id) partyIdNumber = String(employee.national_id).slice(0, 30);
      if (!partyPhone && typeof employee.phone === 'string' && employee.phone.trim()) partyPhone = employee.phone.trim().slice(0, 20);
    } else {
      const name = readText(body.partyName, 150);
      if (name === undefined) return bad('اسم الطرف طويل جداً (الحد الأقصى 150 حرفاً)');
      partyName = name;
    }
    if (!partyName) return bad(type === 'receipt' ? 'يرجى إدخال اسم الدافع (استلمنا من)' : 'يرجى إدخال اسم المستفيد (صرفنا إلى)');
  }

  // Purpose
  const purpose = readText(body.purpose, 300);
  if (purpose === undefined) return bad('البيان طويل جداً (الحد الأقصى 300 حرف)');
  if (!purpose) return bad('يرجى إدخال البيان (وذلك مقابل)');

  // Amount / items
  let amount: number;
  let items: VoucherItem[] | null = null;
  let subtotal: number | null = null;
  let discount: number | null = null;
  let vatRate: number | null = null;
  let vatAmount: number | null = null;

  if (options.locked) {
    if (!isBlank(body.amount)) {
      const requested = parsePositiveAmount(body.amount);
      if (requested === null || toMinor(requested) !== toMinor(options.locked.amount)) {
        return bad('لا يمكن تعديل مبلغ سند مولّد آلياً من النظام', 409);
      }
    }
    ({ amount, items, subtotal, discount, vatRate, vatAmount } = options.locked);
  } else if (body.items !== undefined && body.items !== null && !Array.isArray(body.items)) {
    return bad('بنود السند غير صحيحة');
  } else if (Array.isArray(body.items) && body.items.length > 0) {
    if (body.items.length > MAX_VOUCHER_ITEMS) return bad(`الحد الأقصى ${MAX_VOUCHER_ITEMS} بنداً في السند الواحد`);
    items = [];
    let subtotalMinor = 0;
    for (let i = 0; i < body.items.length; i++) {
      const raw = body.items[i];
      const n = i + 1;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad(`البند رقم ${n} غير صحيح`);
      const item = raw as Record<string, unknown>;
      const description = readText(item.description, 200);
      if (description === undefined) return bad(`وصف البند رقم ${n} طويل جداً`);
      if (!description) return bad(`يرجى إدخال وصف البند رقم ${n}`);
      const quantity = parseQuantity(item.quantity);
      if (quantity === null) return bad(`كمية البند رقم ${n} يجب أن تكون أكبر من صفر`);
      const unitPrice = parseNonNegativeAmount(item.unitPrice);
      if (unitPrice === null) return bad(`سعر الوحدة في البند رقم ${n} غير صحيح`);
      const totalMinor = lineTotalMinor(quantity, unitPrice);
      subtotalMinor += totalMinor;
      items.push({ description, quantity, unitPrice, total: fromMinor(totalMinor) });
    }

    let discountMinor = 0;
    if (!isBlank(body.discount)) {
      const d = parseNonNegativeAmount(body.discount);
      if (d === null) return bad('قيمة الخصم غير صحيحة');
      discountMinor = toMinor(d);
    }
    if (discountMinor > subtotalMinor) return bad('الخصم لا يمكن أن يتجاوز مجموع البنود');

    let rate = 0;
    if (body.applyVat === false) {
      rate = 0;
    } else if (!isBlank(body.vatRate)) {
      const r = parseRate(body.vatRate);
      if (r === null) return bad('نسبة الضريبة يجب أن تكون بين 0 و 100');
      rate = r;
    } else if (body.applyVat === true) {
      rate = options.org.vatRate;
    }
    const taxableMinor = subtotalMinor - discountMinor;
    const vatMinor = Math.round((taxableMinor * Math.round(rate * 100)) / 10000);
    const totalMinor = taxableMinor + vatMinor;
    if (totalMinor <= 0) return bad('إجمالي السند يجب أن يكون أكبر من صفر');
    if (totalMinor >= MAX_AMOUNT_MINOR) return bad('مبلغ السند كبير جداً');

    amount = fromMinor(totalMinor);
    subtotal = fromMinor(subtotalMinor);
    discount = fromMinor(discountMinor);
    vatRate = rate;
    vatAmount = fromMinor(vatMinor);
  } else {
    const parsed = parsePositiveAmount(body.amount);
    if (parsed === null) return bad('يرجى إدخال مبلغ صحيح أكبر من صفر (بحد أقصى منزلتين عشريتين)');
    amount = parsed;
  }

  // Payment method and split
  const method = isBlank(body.paymentMethod) ? 'cash' : body.paymentMethod;
  if (!isPaymentMethod(method)) return bad('طريقة الدفع غير صحيحة');
  const buckets: Record<'cashAmount' | 'bankAmount' | 'chequeAmount' | 'cardAmount', number> = {
    cashAmount: 0,
    bankAmount: 0,
    chequeAmount: 0,
    cardAmount: 0,
  };
  if (method === 'mixed') {
    for (const key of Object.keys(buckets) as Array<keyof typeof buckets>) {
      if (isBlank(body[key])) continue;
      const value = parseNonNegativeAmount(body[key]);
      if (value === null) return bad('مبالغ طرق الدفع غير صحيحة');
      buckets[key] = value;
    }
  }

  const chequeNumber = readText(body.chequeNumber, 30);
  if (chequeNumber === undefined) return bad('رقم الشيك طويل جداً');
  const chequeDateRaw = isBlank(body.chequeDate) ? '' : body.chequeDate;
  if (chequeDateRaw && !isIsoDate(chequeDateRaw)) return bad('تاريخ الشيك غير صحيح');
  const bankName = readText(body.bankName, 100);
  if (bankName === undefined) return bad('اسم البنك طويل جداً');
  const transactionRef = readText(body.transactionRef, 60);
  if (transactionRef === undefined) return bad('رقم العملية طويل جداً');

  const split = {
    amount,
    paymentMethod: method,
    ...buckets,
    chequeNumber: chequeNumber || null,
  } as unknown as NewVoucher;
  const splitError = normalizePaymentSplit(split);
  if (splitError) return bad(splitError);

  const cash = split.cashAmount ?? 0;
  const bank = split.bankAmount ?? 0;
  const cheque = split.chequeAmount ?? 0;
  const card = split.cardAmount ?? 0;
  const hasCheque = toMinor(cheque) > 0;

  const notes = readLongText(body.notes, 1000);
  if (notes === undefined) return bad('الملاحظات طويلة جداً (الحد الأقصى 1000 حرف)');

  return {
    ok: true,
    value: {
      type,
      date,
      partyType,
      partyName,
      employeeId,
      partyIdNumber: partyIdNumber || null,
      partyPhone: partyPhone || null,
      purpose,
      amount,
      paymentMethod: method,
      cashAmount: cash,
      bankAmount: bank,
      chequeAmount: cheque,
      cardAmount: card,
      // Keep only the details relevant to the buckets actually used.
      chequeNumber: hasCheque ? chequeNumber || null : null,
      chequeDate: hasCheque ? (chequeDateRaw as string) || null : null,
      bankName: hasCheque || toMinor(bank) > 0 ? bankName || null : null,
      transactionRef: toMinor(bank) > 0 || toMinor(card) > 0 ? transactionRef || null : null,
      items,
      subtotal,
      discount,
      vatRate,
      vatAmount,
      notes: notes || null,
    },
  };
}

export function voucherNotificationLink(type: VoucherType, branchId: string, number: string): string {
  return `/vouchers?type=${type}&branchId=${encodeURIComponent(branchId)}&q=${encodeURIComponent(number)}`;
}

export function voucherSummaryText(type: VoucherType, number: string, amount: number, currency: CurrencyCode, partyName: string): string {
  return `${VOUCHER_TYPES[type].ar} رقم ${number} بمبلغ ${formatMoney(amount, currency)} — ${partyName}`;
}

// ---------------------------------------------------------------------------
// POST /api/vouchers/create
// ---------------------------------------------------------------------------

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context, VOUCHER_WRITE_FLAGS);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);
  if (!isVoucherType(body.type)) return fail('نوع السند غير صحيح', 400);
  const type = body.type;
  if (!canCreateVoucherType(session, type)) {
    return fail(type === 'receipt' ? 'ليست لديك صلاحية إنشاء سندات القبض' : 'ليست لديك صلاحية إنشاء سندات الصرف', 403);
  }

  const branchId = resolveBranchId(session, body.branchId);
  if (branchId instanceof Response) return branchId;

  try {
    const org = await getOrganizationProfile(db);
    const parsed = await parseVoucherInput(db, body, { branchId, org });
    if ('error' in parsed) return fail(parsed.error, parsed.status);
    const input = parsed.value;

    const approveNow = body.approveNow === true && canApproveFinance(session);
    const branchName = await getBranchName(db, branchId);
    const id = newId('vch');
    const voucher: NewVoucher = {
      id,
      branchId,
      branchName,
      ...input,
      currency: org.currency,
      items: input.items,
      status: approveNow ? 'approved' : 'pending',
      sourceType: 'manual',
      sourceId: null,
      createdBy: actor.id,
      createdByName: actor.displayName,
      approvedBy: approveNow ? actor.id : null,
      approvedByName: approveNow ? actor.displayName : null,
    };

    const results = await db.batch(voucherInsertStatements(db, voucher));
    if (Number(results[1]?.meta?.changes ?? 0) !== 1) {
      console.error('Voucher insert affected no rows', { id, branchId, type });
      return fail('تعذر حفظ السند — حاول مرة أخرى', 500);
    }

    const row = await loadVoucherRow(db, id);
    if (!row) return fail('تعذر قراءة السند بعد الحفظ', 500);
    const saved = mapVoucherRow(row);

    await logAudit(
      db,
      session,
      'create',
      'voucher',
      id,
      { number: saved.number, type, amount: saved.amount, status: saved.status, partyName: saved.partyName },
      clientIp(context.request),
      context.request.headers.get('User-Agent') ?? undefined,
    );

    if (saved.status === 'pending') {
      await notifyByPermission(
        db,
        null,
        'can_manage_settings',
        {
          type: 'voucher_pending',
          title: 'سند بانتظار الاعتماد',
          message: `${voucherSummaryText(type, saved.number, saved.amount, saved.currency, saved.partyName)} (${branchName}) — أنشأه ${actor.displayName}`,
          severity: 'warning',
          link: voucherNotificationLink(type, branchId, saved.number),
          relatedEntity: id,
          branchId,
        },
        { excludeUserId: actor.id },
      );
    }

    return ok({ voucher: saved, actions: voucherActions(session, saved) }, 201);
  } catch (error) {
    console.error('Voucher create failed:', error);
    return fail('حدث خطأ أثناء حفظ السند', 500);
  }
};
