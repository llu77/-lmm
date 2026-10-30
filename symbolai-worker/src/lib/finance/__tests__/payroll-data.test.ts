import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './harness';
import { computeBranchPayroll, loadActiveEmployees, loadApprovedBonuses } from '../payroll-data';
import { bonusDigest, describeOrphans, riyadhDate } from '../payroll-runs';
import { buildAdaptiveInsert, ensureFinanceSchema, getTableColumns } from '../schema';

function insertLegacyBonus(DB: any, id: string, week: number, amount: number, approvedAt: string | null, month = 'أكتوبر') {
  DB.raw
    .prepare(`INSERT INTO bonus_records (id, branch_id, week_number, month, year, employee_bonuses, total_bonus_paid, approved_by, approved_at)
              VALUES (?, 'branch_1010', ?, ?, 2026, ?, ?, ?, ?)`)
    .run(id, week, month, JSON.stringify([{ employeeId: 'emp_1', employeeName: 'أحمد علي', bonusAmount: amount }]), amount,
      approvedAt ? 'u_admin' : null, approvedAt);
}

test('duplicate approved rows for one week are paid once (latest approval wins)', async () => {
  const { DB } = await setup('legacy');
  const db = DB as any;
  insertLegacyBonus(DB, 'b1', 1, 50, '2026-10-08 10:00:00');
  insertLegacyBonus(DB, 'b2', 1, 100, '2026-10-09 10:00:00');
  insertLegacyBonus(DB, 'b3', 2, 175, '2026-10-15 10:00:00', '10');
  insertLegacyBonus(DB, 'b4', 3, 999, null); // not approved
  const employees = await loadActiveEmployees(db, 'branch_1010');
  const bonuses = await loadApprovedBonuses(db, 'branch_1010', '2026-10', employees);
  assert.deepEqual(bonuses.map(b => [b.sourceId, b.amount]).sort(), [['b2', 100], ['b3', 175]]);
});

test('no bonus records → no bonus lines; other months are ignored', async () => {
  const { DB } = await setup('legacy');
  const db = DB as any;
  const employees = await loadActiveEmployees(db, 'branch_1010');
  assert.deepEqual(await loadApprovedBonuses(db, 'branch_1010', '2026-10', employees), []);
  insertLegacyBonus(DB, 'nov', 1, 50, '2026-11-08 10:00:00', 'نوفمبر');
  assert.deepEqual(await loadApprovedBonuses(db, 'branch_1010', '2026-10', employees), []);
  assert.deepEqual(await loadApprovedBonuses(db, 'branch_1010', 'bad-period', employees), []);
});

for (const variant of ['008', 'legacy'] as const) {
  test(`a bonus entry of an inactive employee is not credited to an active namesake; it stays an orphan (${variant})`, async () => {
    const { DB } = await setup(variant);
    const db = DB as any;
    await ensureFinanceSchema(db);
    // emp_9 left the company; an active employee (emp_2) has the same name.
    DB.raw.exec(`INSERT INTO employees (id, branch_id, employee_name, national_id, base_salary, is_active)
                 VALUES ('emp_9', 'branch_1010', 'محمد إسماعيل', '1009', 1000, 0)`);
    const columns = await getTableColumns(db, 'bonus_records');
    const record = (id: string, week: number, entries: unknown[]) => {
      const { sql, params } = buildAdaptiveInsert('bonus_records', columns, {
        id, branch_id: 'branch_1010', month: '10', year: 2026, week_number: week, start_date: '2026-10-01', end_date: '2026-10-07',
        employee_bonuses: JSON.stringify(entries), total_paid: 70, total_bonus_paid: 70,
        status: 'approved', approved_by: 'u_admin', approved_at: '2026-10-08 10:00:00',
      });
      DB.raw.prepare(sql).run(...(params as any[]));
    };
    record('b_departed', 1, [{ employeeId: 'emp_9', employeeName: 'محمد إسماعيل', bonusAmount: 70 }]);
    // An id-less (very old) entry still falls back to the name.
    record('b_old', 2, [{ employeeName: 'أحمد علي', bonusAmount: 20 }]);

    const result = await computeBranchPayroll(db, 'branch_1010', '2026-10');
    const emp2 = result.items.find(i => i.employeeId === 'emp_2')!;
    const emp1 = result.items.find(i => i.employeeId === 'emp_1')!;
    assert.equal(emp2.bonus, 0, 'the namesake gets nothing');
    assert.equal(emp1.bonus, 20, 'id-less entries are matched by name');
    assert.equal(result.orphanAdjustments.length, 1);
    assert.equal(result.orphanAdjustments[0].employeeId, 'emp_9');
    assert.equal(result.orphanAdjustments[0].amount, 70);

    const [orphan] = await describeOrphans(db, 'branch_1010', result.orphanAdjustments);
    assert.equal(orphan.reason, 'inactive');
    assert.equal(orphan.employeeName, 'محمد إسماعيل');
  });

  test(`bonus digest changes when a weekly bonus is approved, not for pending rows (${variant})`, async () => {
    const { DB } = await setup(variant);
    const db = DB as any;
    const columns = await getTableColumns(db, 'bonus_records');
    const insert = (id: string, week: number, approved: boolean) => {
      const { sql, params } = buildAdaptiveInsert('bonus_records', columns, {
        id, branch_id: 'branch_1010', month: 'أكتوبر', year: 2026, week_number: week, start_date: '2026-10-01', end_date: '2026-10-07',
        employee_bonuses: JSON.stringify([{ employeeId: 'emp_1', employeeName: 'أحمد علي', bonusAmount: 35 }]),
        total_paid: 35, total_bonus_paid: 35,
        status: approved ? 'approved' : 'pending', approved_by: approved ? 'u_admin' : null,
        approved_at: approved ? '2026-10-08 10:00:00' : null,
      });
      DB.raw.prepare(sql).run(...(params as any[]));
    };
    const read = async () => (await bonusDigest(db, 'branch_1010', '2026-10'))!.value;
    const empty = await read();
    insert('pending', 1, false);
    assert.equal(await read(), empty, 'pending rows do not count');
    DB.raw.exec(`UPDATE bonus_records SET approved_by = 'u_admin', approved_at = '2026-10-09 09:00:00'${columns.has('status') ? `, status = 'approved'` : ''} WHERE id = 'pending'`);
    const afterApproval = await read();
    assert.notEqual(afterApproval, empty);
    insert('other_month', 2, true);
    DB.raw.exec(`UPDATE bonus_records SET month = 'نوفمبر' WHERE id = 'other_month'`);
    assert.equal(await read(), afterApproval, 'other months are ignored');
    assert.equal(await bonusDigest(db, 'branch_1010', 'bad'), null);
  });
}

test('riyadhDate prints the Riyadh calendar day of UTC timestamps', () => {
  assert.equal(riyadhDate('2026-10-29 22:30:00'), '2026-10-30');
  assert.equal(riyadhDate('2026-10-29 20:59:59'), '2026-10-29');
  assert.equal(riyadhDate('2026-10-29T21:00:00.000Z'), '2026-10-30');
  assert.equal(riyadhDate('2026-10-29T23:00:00+03:00'), '2026-10-29');
  assert.equal(riyadhDate('2026-10-29'), '2026-10-29');
  assert.equal(riyadhDate(null), '');
  assert.equal(riyadhDate(''), '');
  assert.equal(riyadhDate('garbage-value'), 'garbage-va');
});
