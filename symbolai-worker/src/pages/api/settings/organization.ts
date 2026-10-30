import type { APIRoute } from 'astro';
import { logAudit } from '@/lib/permissions';
import { financeAuth, ok, fail, readJsonObject, canApproveFinance, clientIp } from '@/lib/finance/http';
import {
  getOrganizationProfile,
  saveOrganizationSettings,
  validateImageDataUrl,
  type OrganizationProfile,
} from '@/lib/finance/documents';
import { isCurrencyCode } from '@/lib/finance/money';

// Organization profile printed on vouchers and payroll sheets (company names,
// CR/VAT numbers, contact details, logo and company stamp).
// GET: any signed-in user (read-only view). POST: the general manager only.
// The stamp image itself is only sent to users who prepare or approve payroll
// (manager, branch supervisors); others just learn whether one exists, so the
// raw stamp cannot be copied onto forged documents from this endpoint.

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;
  try {
    const profile = await getOrganizationProfile(db);
    const canEdit = canApproveFinance(session);
    const canSeeStamp = canEdit || session.permissions.canGeneratePayroll === true;
    return ok({
      profile: canSeeStamp ? profile : { ...profile, stampImage: null },
      hasStamp: Boolean(profile.stampImage),
      canEdit,
    });
  } catch (error) {
    console.error('Failed to load organization settings:', error);
    return fail('تعذر تحميل بيانات المنشأة', 500);
  }
};

type Entries = Partial<Record<keyof OrganizationProfile, string | null>>;

const TEXT_FIELDS: Array<{ key: keyof OrganizationProfile; label: string; max: number }> = [
  { key: 'companyNameAr', label: 'اسم المنشأة بالعربية', max: 150 },
  { key: 'companyNameEn', label: 'اسم المنشأة بالإنجليزية', max: 150 },
  { key: 'address', label: 'العنوان', max: 300 },
  { key: 'documentFooter', label: 'تذييل المستندات', max: 300 },
];

/** Returns trimmed text, '' for null/empty, or undefined when the value is not text at all. */
function textValue(value: unknown): string | undefined {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return undefined;
  return value.trim();
}

function has(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;
}

/**
 * Validates a partial update. Returns the entries to store (null clears a
 * key), non-blocking warnings, or an Arabic error message.
 */
function parseOrganizationUpdate(
  body: Record<string, unknown>,
): { entries: Entries; warnings: string[] } | { error: string } {
  const entries: Entries = {};
  const warnings: string[] = [];

  for (const field of TEXT_FIELDS) {
    if (!has(body, field.key)) continue;
    const value = textValue(body[field.key]);
    if (value === undefined) return { error: `قيمة غير صالحة في حقل ${field.label}` };
    if (value.length > field.max) return { error: `${field.label} يجب ألا يتجاوز ${field.max} حرفاً` };
    entries[field.key] = value || null;
  }

  if (has(body, 'crNumber')) {
    const value = textValue(body.crNumber);
    if (value === undefined || (value && !/^\d{1,20}$/.test(value))) {
      return { error: 'رقم السجل التجاري يجب أن يتكون من أرقام فقط (20 رقماً كحد أقصى)' };
    }
    entries.crNumber = value || null;
  }

  if (has(body, 'vatNumber')) {
    const value = textValue(body.vatNumber);
    if (value === undefined || (value && !/^\d{15}$/.test(value))) {
      return { error: 'الرقم الضريبي يجب أن يتكون من 15 رقماً' };
    }
    if (value && !/^3\d{13}3$/.test(value)) {
      warnings.push('تنبيه: الرقم الضريبي السعودي يبدأ بالرقم 3 وينتهي بالرقم 3 — تحقق من صحته');
    }
    entries.vatNumber = value || null;
  }

  if (has(body, 'phone')) {
    const value = textValue(body.phone);
    if (value === undefined || value.length > 100 || (value && !/^[0-9٠-٩+\-\s()/,،.]+$/.test(value))) {
      return { error: 'رقم الهاتف غير صالح' };
    }
    entries.phone = value || null;
  }

  if (has(body, 'email')) {
    const value = textValue(body.email);
    if (value === undefined || value.length > 300 || (value && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(value))) {
      return { error: 'البريد الإلكتروني غير صالح' };
    }
    entries.email = value || null;
  }

  if (has(body, 'currency')) {
    if (!isCurrencyCode(body.currency)) return { error: 'العملة غير مدعومة' };
    entries.currency = body.currency;
  }

  if (has(body, 'vatRate')) {
    const raw = typeof body.vatRate === 'string' ? body.vatRate.trim() : body.vatRate;
    const rate = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+(\.\d{1,2})?$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isFinite(rate) || rate < 0 || rate > 100 || Math.abs(Math.round(rate * 100) - rate * 100) > 1e-6) {
      return { error: 'نسبة ضريبة القيمة المضافة يجب أن تكون بين 0 و 100' };
    }
    entries.vatRate = String(rate);
  }

  for (const key of ['logoImage', 'stampImage'] as const) {
    if (!has(body, key)) continue;
    const value = body[key];
    if (value === null || value === '') {
      entries[key] = null;
      continue;
    }
    const image = validateImageDataUrl(value);
    if (!image.ok) return { error: `${key === 'logoImage' ? 'الشعار' : 'ختم المنشأة'}: ${image.error}` };
    entries[key] = image.value;
  }

  return { entries, warnings };
}

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  if (!canApproveFinance(session)) {
    return fail('تعديل بيانات المنشأة متاح للمدير فقط', 403);
  }

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة');

  const parsed = parseOrganizationUpdate(body);
  if ('error' in parsed) return fail(parsed.error);
  const changed = Object.keys(parsed.entries) as Array<keyof OrganizationProfile>;
  if (changed.length === 0) return fail('لا توجد بيانات للحفظ');

  try {
    await saveOrganizationSettings(db, parsed.entries, actor.id);

    // Audit without the image payloads.
    const details: Record<string, unknown> = { fields: changed };
    for (const key of changed) {
      if (key === 'logoImage' || key === 'stampImage') {
        details[key] = parsed.entries[key] ? 'updated' : 'removed';
      } else {
        details[key] = parsed.entries[key];
      }
    }
    await logAudit(db, session, 'update', 'organization_settings', 'organization', details, clientIp(context.request),
      context.request.headers.get('User-Agent') || undefined);

    const profile = await getOrganizationProfile(db);
    return ok({ profile, hasStamp: Boolean(profile.stampImage), canEdit: true, warnings: parsed.warnings });
  } catch (error) {
    console.error('Failed to save organization settings:', error);
    return fail('تعذر حفظ بيانات المنشأة', 500);
  }
};
