// Organization profile (company name, CR/VAT, logo, stamp) and user
// signatures used on printed payroll sheets and vouchers. Server-only.

import type { D1Database } from '@cloudflare/workers-types';
import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from './money';

export interface OrganizationProfile {
  companyNameAr: string;
  companyNameEn: string;
  crNumber: string;
  vatNumber: string;
  address: string;
  phone: string;
  email: string;
  logoImage: string | null;
  stampImage: string | null;
  currency: CurrencyCode;
  vatRate: number;
  documentFooter: string;
}

/** Setting keys as stored in organization_settings. */
export const ORG_SETTING_KEYS = {
  companyNameAr: 'company_name_ar',
  companyNameEn: 'company_name_en',
  crNumber: 'cr_number',
  vatNumber: 'vat_number',
  address: 'address',
  phone: 'phone',
  email: 'email',
  logoImage: 'logo_image',
  stampImage: 'stamp_image',
  currency: 'currency',
  vatRate: 'vat_rate',
  documentFooter: 'document_footer',
} as const satisfies Record<keyof OrganizationProfile, string>;

export const DEFAULT_PROFILE: OrganizationProfile = {
  companyNameAr: 'SymbolAI',
  companyNameEn: 'SymbolAI',
  crNumber: '',
  vatNumber: '',
  address: '',
  phone: '',
  email: '',
  logoImage: null,
  stampImage: null,
  currency: DEFAULT_CURRENCY,
  vatRate: 15,
  documentFooter: '',
};

export async function getOrganizationProfile(db: D1Database): Promise<OrganizationProfile> {
  const result = await db.prepare('SELECT key, value FROM organization_settings').all<{ key: string; value: string | null }>();
  const map = new Map((result.results ?? []).map(r => [r.key, r.value]));
  const text = (key: string, fallback: string) => {
    const v = map.get(key);
    return typeof v === 'string' && v.trim() ? v : fallback;
  };
  const currency = map.get(ORG_SETTING_KEYS.currency);
  const vatRate = Number(map.get(ORG_SETTING_KEYS.vatRate));
  return {
    companyNameAr: text(ORG_SETTING_KEYS.companyNameAr, DEFAULT_PROFILE.companyNameAr),
    companyNameEn: text(ORG_SETTING_KEYS.companyNameEn, DEFAULT_PROFILE.companyNameEn),
    crNumber: text(ORG_SETTING_KEYS.crNumber, ''),
    vatNumber: text(ORG_SETTING_KEYS.vatNumber, ''),
    address: text(ORG_SETTING_KEYS.address, ''),
    phone: text(ORG_SETTING_KEYS.phone, ''),
    email: text(ORG_SETTING_KEYS.email, ''),
    logoImage: map.get(ORG_SETTING_KEYS.logoImage) || null,
    stampImage: map.get(ORG_SETTING_KEYS.stampImage) || null,
    currency: isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY,
    vatRate: Number.isFinite(vatRate) && vatRate >= 0 && vatRate <= 100 ? vatRate : DEFAULT_PROFILE.vatRate,
    documentFooter: text(ORG_SETTING_KEYS.documentFooter, ''),
  };
}

/** Upserts the given keys; `null` clears a key. */
export async function saveOrganizationSettings(
  db: D1Database,
  entries: Partial<Record<keyof OrganizationProfile, string | null>>,
  userId: string,
): Promise<void> {
  const statements = Object.entries(entries).map(([field, value]) =>
    db
      .prepare(
        `INSERT INTO organization_settings (key, value, updated_by, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
      )
      .bind(ORG_SETTING_KEYS[field as keyof OrganizationProfile], value, userId),
  );
  if (statements.length) await db.batch(statements);
}

// 600 KB of base64 ≈ 450 KB image: plenty for a signature/stamp/logo PNG.
const MAX_IMAGE_DATA_URL_LENGTH = 600_000;

/** Accepts PNG/JPEG/WebP data URLs only (no SVG: it can carry script). */
export function validateImageDataUrl(value: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== 'string' || !value) return { ok: false, error: 'الصورة مطلوبة' };
  if (value.length > MAX_IMAGE_DATA_URL_LENGTH) return { ok: false, error: 'حجم الصورة كبير جداً (الحد الأقصى 450 كيلوبايت)' };
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value)) {
    return { ok: false, error: 'صيغة الصورة غير مدعومة — استخدم PNG أو JPG أو WebP' };
  }
  return { ok: true, value };
}

export interface UserSignature {
  userId: string;
  image: string;
  signerName: string | null;
  signerTitle: string | null;
  updatedAt: string;
}

export async function getUserSignatures(db: D1Database, userIds: Array<string | null | undefined>): Promise<Map<string, UserSignature>> {
  const ids = [...new Set(userIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  const out = new Map<string, UserSignature>();
  if (ids.length === 0) return out;
  const result = await db
    .prepare(`SELECT * FROM user_signatures WHERE user_id IN (${ids.map(() => '?').join(', ')})`)
    .bind(...ids)
    .all<Record<string, unknown>>();
  for (const row of result.results ?? []) {
    out.set(String(row.user_id), {
      userId: String(row.user_id),
      image: String(row.signature_image),
      signerName: row.signer_name ? String(row.signer_name) : null,
      signerTitle: row.signer_title ? String(row.signer_title) : null,
      updatedAt: String(row.updated_at ?? ''),
    });
  }
  return out;
}
