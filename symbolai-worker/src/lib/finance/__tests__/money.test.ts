import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amountToArabicWords,
  amountToEnglishWords,
  formatAmount,
  formatMoney,
  integerToArabicWords,
  parsePositiveAmount,
  round2,
  splitInstallments,
  toMinor,
} from '../money';

test('toMinor rounds half-up and survives float noise', () => {
  assert.equal(toMinor(0.1 + 0.2), 30);
  assert.equal(toMinor(1.005), 101);
  assert.equal(toMinor('1,250.50'), 125050);
  assert.equal(toMinor('abc'), 0);
  assert.equal(toMinor(undefined), 0);
  assert.equal(round2(10.255), 10.26);
});

test('formatAmount groups thousands with two decimals', () => {
  assert.equal(formatAmount(2000), '2,000.00');
  assert.equal(formatAmount(1234567.891), '1,234,567.89');
  assert.equal(formatAmount(-50.5), '-50.50');
  assert.equal(formatMoney(1000), '1,000.00 ر.س');
});

test('parsePositiveAmount accepts plain positive amounts only', () => {
  assert.equal(parsePositiveAmount('1000'), 1000);
  assert.equal(parsePositiveAmount('1,000.5'), 1000.5);
  assert.equal(parsePositiveAmount(250.25), 250.25);
  assert.equal(parsePositiveAmount('0'), null);
  assert.equal(parsePositiveAmount('-5'), null);
  assert.equal(parsePositiveAmount('1.234'), null);
  assert.equal(parsePositiveAmount('abc'), null);
  assert.equal(parsePositiveAmount(''), null);
});

test('splitInstallments sums exactly to the total', () => {
  assert.deepEqual(splitInstallments(1000, 3), [333.33, 333.33, 333.34]);
  assert.deepEqual(splitInstallments(500, 1), [500]);
  const parts = splitInstallments(1234.57, 7);
  assert.equal(parts.reduce((s, p) => s + toMinor(p), 0), 123457);
});

test('integerToArabicWords covers units, teens, tens, hundreds and scales', () => {
  const cases: Array<[number, string]> = [
    [1, 'واحد'],
    [11, 'أحد عشر'],
    [12, 'اثنا عشر'],
    [21, 'واحد وعشرون'],
    [100, 'مائة'],
    [200, 'مائتان'],
    [305, 'ثلاثمائة وخمسة'],
    [1000, 'ألف'],
    [2000, 'ألفان'],
    [3000, 'ثلاثة آلاف'],
    [10000, 'عشرة آلاف'],
    [11000, 'أحد عشر ألفاً'],
    [1500, 'ألف وخمسمائة'],
    [100000, 'مائة ألف'],
    [200000, 'مائتا ألف'],
    [101000, 'مائة ألف وألف'],
    [150000, 'مائة وخمسون ألفاً'],
    [103000, 'مائة وثلاثة آلاف'],
    [1000000, 'مليون'],
    [2500000, 'مليونان وخمسمائة ألف'],
    [3000000, 'ثلاثة ملايين'],
  ];
  for (const [n, words] of cases) assert.equal(integerToArabicWords(n), words, `n=${n}`);
});

test('amountToArabicWords produces voucher wording', () => {
  assert.equal(amountToArabicWords(2000), 'فقط ألفان ريال سعودي لا غير');
  assert.equal(amountToArabicWords(1500.5), 'فقط ألف وخمسمائة ريال سعودي وخمسون هللة لا غير');
  assert.equal(amountToArabicWords(0.25), 'فقط خمسة وعشرون هللة لا غير');
  assert.equal(amountToArabicWords(0), 'صفر ريال سعودي');
});

test('amountToEnglishWords produces voucher wording', () => {
  assert.equal(amountToEnglishWords(2000), 'Two Thousand Saudi Riyals Only');
  assert.equal(amountToEnglishWords(1), 'One Saudi Riyal Only');
  assert.equal(amountToEnglishWords(1521.75), 'One Thousand Five Hundred Twenty-One Saudi Riyals and Seventy-Five Halalas Only');
});
