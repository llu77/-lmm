import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './harness';
import { loadActiveEmployees, loadApprovedBonuses } from '../payroll-data';

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
