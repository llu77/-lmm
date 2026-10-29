import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePayroll, dailyRate, overtimeHourlyRate, payrollFingerprint, type PayrollAdjustmentInput } from '../payroll-engine';
import { toMinor } from '../money';
import { addMonths, currentPeriod, daysInPeriod, monthVariants, parseMonth, parsePeriod, toPeriod } from '../catalog';

const employees = [
  { id: 'e1', name: 'محمد إسماعيل', nationalId: '1010', baseSalary: 2000, supervisorAllowance: 0, incentives: 0 },
  { id: 'e2', name: 'أحمد علي', nationalId: null, baseSalary: 3000, supervisorAllowance: 500, incentives: 250 },
];

function adj(partial: Partial<PayrollAdjustmentInput> & Pick<PayrollAdjustmentInput, 'id' | 'employeeId' | 'category' | 'amount'>): PayrollAdjustmentInput {
  return { sourceType: 'manual', ...partial };
}

test('overtime is an earning line that reaches the sheet and the print columns', () => {
  const result = computePayroll(employees, [adj({ id: 'a1', employeeId: 'e1', category: 'overtime', amount: 1000, quantity: 20, rate: 50 })]);
  const item = result.items.find(i => i.employeeId === 'e1')!;
  assert.equal(item.overtime, 1000);
  assert.equal(item.totalEarnings, 3000);
  assert.equal(item.netSalary, 3000);
  assert.ok(result.activeColumns.includes('overtime'));
  assert.equal(item.lines[0].labelAr, 'ساعات إضافية');
  assert.equal(result.totals.overtime, 1000);
});

test('approved advance is deducted from net salary', () => {
  const result = computePayroll(employees, [adj({ id: 'a2', employeeId: 'e2', category: 'advance', amount: 750, sourceType: 'request', sourceId: 'r1' })]);
  const item = result.items.find(i => i.employeeId === 'e2')!;
  assert.equal(item.fixedSalary, 3750);
  assert.equal(item.advances, 750);
  assert.equal(item.totalDeductions, 750);
  assert.equal(item.netSalary, 3000);
});

test('categories are grouped into the right columns and totals add up', () => {
  const result = computePayroll(employees, [
    adj({ id: '1', employeeId: 'e1', category: 'bonus', amount: 175 }),
    adj({ id: '2', employeeId: 'e1', category: 'dues', amount: 300 }),
    adj({ id: '3', employeeId: 'e1', category: 'violation', amount: 100 }),
    adj({ id: '4', employeeId: 'e1', category: 'unpaid_leave', amount: 66.67 }),
    adj({ id: '5', employeeId: 'e1', category: 'absence', amount: 66.66 }),
    adj({ id: '6', employeeId: 'e2', category: 'other_deduction', amount: 10.1 }),
    adj({ id: '7', employeeId: 'e2', category: 'commission', amount: 0.2 }),
  ]);
  const e1 = result.items.find(i => i.employeeId === 'e1')!;
  assert.equal(e1.bonus, 175);
  assert.equal(e1.otherEarnings, 300);
  assert.equal(e1.penalties, 100);
  assert.equal(e1.absenceDeductions, 133.33);
  assert.equal(toMinor(e1.netSalary), toMinor(2000 + 175 + 300) - toMinor(100) - toMinor(133.33));
  assert.equal(toMinor(result.totals.netSalary), result.items.reduce((s, i) => s + toMinor(i.netSalary), 0));
  assert.equal(toMinor(result.totals.totalEarnings) - toMinor(result.totals.totalDeductions), toMinor(result.totals.netSalary));
  assert.deepEqual(result.activeColumns.sort(), ['absenceDeductions', 'bonus', 'otherDeductions', 'otherEarnings', 'penalties'].sort());
});

test('negative net is flagged, not hidden', () => {
  const result = computePayroll(employees, [adj({ id: 'x', employeeId: 'e1', category: 'advance', amount: 2500 })]);
  const e1 = result.items.find(i => i.employeeId === 'e1')!;
  assert.equal(e1.netSalary, -500);
  assert.equal(e1.warnings.length, 1);
});

test('adjustments for employees not on the sheet are reported as orphans', () => {
  const result = computePayroll(employees, [adj({ id: 'o', employeeId: 'gone', category: 'overtime', amount: 10 })]);
  assert.equal(result.orphanAdjustments.length, 1);
  assert.equal(result.totals.overtime, 0);
});

test('fingerprint changes when an adjustment changes and ignores order', () => {
  const a = [adj({ id: '1', employeeId: 'e1', category: 'overtime', amount: 10 }), adj({ id: '2', employeeId: 'e2', category: 'advance', amount: 5 })];
  const f1 = payrollFingerprint(employees, a);
  assert.equal(f1, payrollFingerprint([...employees].reverse(), [...a].reverse()));
  assert.notEqual(f1, payrollFingerprint(employees, [a[0], { ...a[1], amount: 6 }]));
  assert.notEqual(f1, payrollFingerprint(employees, [a[0]]));
});

test('daily and overtime rates follow fixed wage / 30 and Art. 107', () => {
  assert.equal(dailyRate(employees[1]), 125);
  // hourly = 3750/240 = 15.625 ; + 50% of basic hourly (3000/240 = 12.5) → 21.875 ≈ 21.88
  assert.equal(overtimeHourlyRate(employees[1]), 21.88);
});

test('period helpers', () => {
  assert.equal(toPeriod(2026, 1), '2026-01');
  assert.deepEqual(parsePeriod('2026-10'), { year: 2026, month: 10 });
  assert.equal(parsePeriod('2026-13'), null);
  assert.equal(addMonths('2026-11', 3), '2027-02');
  assert.equal(addMonths('2026-01', -1), '2025-12');
  assert.equal(daysInPeriod('2028-02'), 29);
  assert.equal(parseMonth('أكتوبر'), 10);
  assert.equal(parseMonth('07'), 7);
  assert.equal(parseMonth('13'), null);
  assert.deepEqual(monthVariants(3), ['3', '03', 'مارس']);
  // 22:30 UTC on Oct 31 is already Nov 1 in Riyadh
  assert.equal(currentPeriod(new Date('2026-10-31T22:30:00Z')), '2026-11');
});
