// Money helpers: exact arithmetic in the minor unit (halalas), formatting,
// and amount-in-words (تفقيط) in Arabic and English. Browser-safe.

export type CurrencyCode = 'SAR' | 'AED' | 'KWD' | 'EGP' | 'USD';

interface CurrencyInfo {
  symbol: string;
  nameAr: string;
  fractionAr: string;
  nameEn: string;
  nameEnPlural: string;
  fractionEn: string;
  fractionEnPlural: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  SAR: { symbol: 'ر.س', nameAr: 'ريال سعودي', fractionAr: 'هللة', nameEn: 'Saudi Riyal', nameEnPlural: 'Saudi Riyals', fractionEn: 'Halala', fractionEnPlural: 'Halalas' },
  AED: { symbol: 'د.إ', nameAr: 'درهم إماراتي', fractionAr: 'فلس', nameEn: 'UAE Dirham', nameEnPlural: 'UAE Dirhams', fractionEn: 'Fils', fractionEnPlural: 'Fils' },
  KWD: { symbol: 'د.ك', nameAr: 'دينار كويتي', fractionAr: 'فلس', nameEn: 'Kuwaiti Dinar', nameEnPlural: 'Kuwaiti Dinars', fractionEn: 'Fils', fractionEnPlural: 'Fils' },
  EGP: { symbol: 'ج.م', nameAr: 'جنيه مصري', fractionAr: 'قرش', nameEn: 'Egyptian Pound', nameEnPlural: 'Egyptian Pounds', fractionEn: 'Piastre', fractionEnPlural: 'Piastres' },
  USD: { symbol: '$', nameAr: 'دولار أمريكي', fractionAr: 'سنت', nameEn: 'US Dollar', nameEnPlural: 'US Dollars', fractionEn: 'Cent', fractionEnPlural: 'Cents' },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'SAR';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CURRENCIES, value);
}

/** Converts a major-unit amount (number or numeric string) to integer minor units. NaN/garbage → 0. */
export function toMinor(value: unknown): number {
  const n = typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : Number(value);
  if (!Number.isFinite(n)) return 0;
  // Nudge by epsilon so values like 1.005 round the way people expect.
  return Math.round(n * 100 + (n >= 0 ? 1e-7 : -1e-7));
}

export function fromMinor(minor: number): number {
  return minor / 100;
}

/** Rounds to 2 decimals exactly the way toMinor does. */
export function round2(value: unknown): number {
  return fromMinor(toMinor(value));
}

/** Parses user input as a strictly positive amount with at most 2 decimals; null if invalid. */
export function parsePositiveAmount(value: unknown): number | null {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.replace(/,/g, '').trim() : '';
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const n = Number(text);
  return n > 0 && n < 1e10 ? n : null;
}

/** Same as parsePositiveAmount but allows 0. */
export function parseNonNegativeAmount(value: unknown): number | null {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.replace(/,/g, '').trim() : '';
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const n = Number(text);
  return n >= 0 && n < 1e10 ? n : null;
}

/** "12,345.50" (Western digits, as used on Saudi financial documents). */
export function formatAmount(value: number): string {
  const minor = toMinor(value);
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fraction = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}

/** "12,345.50 ر.س" */
export function formatMoney(value: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  return `${formatAmount(value)} ${CURRENCIES[currency]?.symbol ?? currency}`;
}

/** Splits `total` into `count` installments that sum exactly to `total` (remainder on the last one). */
export function splitInstallments(total: number, count: number): number[] {
  const minor = toMinor(total);
  const n = Math.max(1, Math.floor(count));
  const base = Math.floor(minor / n);
  const parts = Array.from({ length: n }, () => base);
  parts[n - 1] += minor - base * n;
  return parts.map(fromMinor);
}

// ---------------------------------------------------------------------------
// Arabic amount in words (تفقيط)
// ---------------------------------------------------------------------------

const AR_ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const AR_TEENS = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const AR_TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const AR_HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

const AR_SCALES = [
  { one: 'ألف', two: 'ألفان', few: 'آلاف', many: 'ألفاً' },
  { one: 'مليون', two: 'مليونان', few: 'ملايين', many: 'مليوناً' },
  { one: 'مليار', two: 'ملياران', few: 'مليارات', many: 'ملياراً' },
];

function arabicBelow100(n: number): string {
  if (n === 0) return '';
  if (n < 10) return AR_ONES[n];
  if (n < 20) return AR_TEENS[n - 10];
  const ones = n % 10;
  const tens = Math.floor(n / 10);
  return ones ? `${AR_ONES[ones]} و${AR_TENS[tens]}` : AR_TENS[tens];
}

function arabicBelow1000(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(AR_HUNDREDS[hundreds]);
  if (rest) parts.push(arabicBelow100(rest));
  return parts.join(' و');
}

function arabicScaledGroup(group: number, scale: (typeof AR_SCALES)[number]): string {
  if (group === 1) return scale.one;
  if (group === 2) return scale.two;
  if (group <= 10) return `${arabicBelow1000(group)} ${scale.few}`;

  const rest = group % 100;
  const hundreds = Math.floor(group / 100);
  if (rest === 1 || rest === 2) {
    // 101,000 → "مائة ألف وألف" ; 202,000 → "مائتا ألف وألفان"
    const head = hundreds === 2 ? 'مائتا' : AR_HUNDREDS[hundreds];
    return `${head} ${scale.one} و${rest === 1 ? scale.one : scale.two}`;
  }
  if (rest === 0) {
    // In construct state مائتان becomes مائتا: "مائتا ألف"
    const head = hundreds === 2 ? 'مائتا' : AR_HUNDREDS[hundreds];
    return `${head} ${scale.one}`;
  }
  const words = arabicBelow1000(group);
  return rest >= 3 && rest <= 10 ? `${words} ${scale.few}` : `${words} ${scale.many}`;
}

/** Whole non-negative integer to Arabic words ("ألفان وخمسمائة"). */
export function integerToArabicWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'صفر';
  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  if (groups.length > AR_SCALES.length + 1) throw new Error('Amount too large');
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (!group) continue;
    parts.push(i === 0 ? arabicBelow1000(group) : arabicScaledGroup(group, AR_SCALES[i - 1]));
  }
  return parts.join(' و');
}

/** "فقط ألفان ريال سعودي وخمسون هللة لا غير" */
export function amountToArabicWords(amount: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  const info = CURRENCIES[currency] ?? CURRENCIES.SAR;
  const minor = Math.abs(toMinor(amount));
  const major = Math.floor(minor / 100);
  const fraction = minor % 100;
  const prefix = toMinor(amount) < 0 ? 'سالب ' : '';
  if (major === 0 && fraction === 0) return `صفر ${info.nameAr}`;

  const parts: string[] = [];
  if (major > 0) parts.push(`${integerToArabicWords(major)} ${info.nameAr}`);
  if (fraction > 0) parts.push(`${integerToArabicWords(fraction)} ${info.fractionAr}`);
  return `فقط ${prefix}${parts.join(' و')} لا غير`;
}

// ---------------------------------------------------------------------------
// English amount in words
// ---------------------------------------------------------------------------

const EN_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const EN_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const EN_SCALES = ['', 'Thousand', 'Million', 'Billion'];

function englishBelow1000(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds) parts.push(`${EN_ONES[hundreds]} Hundred`);
  if (rest) {
    if (rest < 20) parts.push(EN_ONES[rest]);
    else parts.push(EN_TENS[Math.floor(rest / 10)] + (rest % 10 ? `-${EN_ONES[rest % 10]}` : ''));
  }
  return parts.join(' ');
}

export function integerToEnglishWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  let scale = 0;
  while (n > 0) {
    const group = n % 1000;
    if (group) parts.unshift(`${englishBelow1000(group)}${EN_SCALES[scale] ? ` ${EN_SCALES[scale]}` : ''}`);
    n = Math.floor(n / 1000);
    scale++;
    if (scale >= EN_SCALES.length && n > 0) throw new Error('Amount too large');
  }
  return parts.join(' ');
}

/** "Two Thousand Saudi Riyals and Fifty Halalas Only" */
export function amountToEnglishWords(amount: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  const info = CURRENCIES[currency] ?? CURRENCIES.SAR;
  const minor = Math.abs(toMinor(amount));
  const major = Math.floor(minor / 100);
  const fraction = minor % 100;
  const prefix = toMinor(amount) < 0 ? 'Minus ' : '';
  if (major === 0 && fraction === 0) return `Zero ${info.nameEnPlural}`;
  const parts: string[] = [];
  if (major > 0) parts.push(`${integerToEnglishWords(major)} ${major === 1 ? info.nameEn : info.nameEnPlural}`);
  if (fraction > 0) parts.push(`${integerToEnglishWords(fraction)} ${fraction === 1 ? info.fractionEn : info.fractionEnPlural}`);
  return `${prefix}${parts.join(' and ')} Only`;
}
