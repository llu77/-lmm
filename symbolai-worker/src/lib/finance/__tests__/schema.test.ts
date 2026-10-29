import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FINANCE_DDL, buildAdaptiveInsert, ensureFinanceSchema, getTableColumns } from '../schema';
import { setup, call } from './harness';
import { GET as financeContext } from '../../../pages/api/finance/context';

const here = path.dirname(fileURLToPath(import.meta.url));
const squash = (s: string) => s.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim();

test('migration 009 contains exactly the runtime DDL', () => {
  const sql = readFileSync(path.resolve(here, '../../../../migrations/009_payroll_vouchers.sql'), 'utf8')
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  const statements = sql.split(';').map(squash).filter(Boolean);
  assert.deepEqual(statements, FINANCE_DDL.map(squash));
});

for (const variant of ['008', 'legacy'] as const) {
  test(`finance DDL applies cleanly and idempotently on the ${variant} schema`, async () => {
    const { DB } = await setup(variant);
    await ensureFinanceSchema(DB as any);
    for (const statement of FINANCE_DDL) DB.raw.exec(statement); // second run is a no-op
    const tables = DB.query<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table'`).map(r => r.name);
    for (const t of ['payroll_adjustments', 'payroll_runs', 'payroll_run_items', 'financial_vouchers', 'voucher_sequences', 'organization_settings', 'user_signatures', 'user_notifications']) {
      assert.ok(tables.includes(t), `missing ${t}`);
    }
  });

  test(`context endpoint works for each role on the ${variant} schema`, async () => {
    const { env, data } = await setup(variant);
    const admin = await call(financeContext, env, { token: data.users.admin.token });
    assert.equal(admin.status, 200);
    assert.equal(admin.body.context.permissions.canApproveFinance, true);
    assert.ok(admin.body.context.branches.length >= 2);
    assert.equal(admin.body.context.user.displayName, 'المدير العام');

    const sup = await call(financeContext, env, { token: data.users.supervisor.token });
    assert.equal(sup.body.context.permissions.canApproveFinance, false);
    assert.deepEqual(sup.body.context.branches.map((b: any) => b.id), ['branch_1010']);

    const anon = await call(financeContext, env, {});
    assert.equal(anon.status, 401);
  });
}

test('partial unique index blocks a second open payroll run but allows it after cancel', async () => {
  const { DB } = await setup('008');
  await ensureFinanceSchema(DB as any);
  DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('r1', 'b', '2026-10', 'draft')`);
  assert.throws(() => DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('r2', 'b', '2026-10', 'draft')`));
  DB.raw.exec(`UPDATE payroll_runs SET status = 'cancelled' WHERE id = 'r1'`);
  DB.raw.exec(`INSERT INTO payroll_runs (id, branch_id, period, status) VALUES ('r2', 'b', '2026-10', 'draft')`);
});

test('adaptive insert rejects a row with no known columns', async () => {
  const { DB } = await setup('008');
  const cols = await getTableColumns(DB as any, 'employee_requests');
  assert.throws(() => buildAdaptiveInsert('employee_requests', cols, { nope: 1, other: undefined }), /No known columns/);
  assert.throws(() => buildAdaptiveInsert('employee_requests', cols, {}), /No known columns/);
});

test('getTableColumns returns an empty set for a missing table and rejects unsafe names', async () => {
  const { DB } = await setup('008');
  assert.equal((await getTableColumns(DB as any, 'does_not_exist')).size, 0);
  await assert.rejects(getTableColumns(DB as any, 'x; DROP TABLE employees'), /Invalid table name/);
});

test('supervisor without a branch gets an empty branch list, not an error', async () => {
  const { env, DB, data } = await setup('008');
  DB.raw.exec(`UPDATE users_new SET branch_id = NULL WHERE id = '${data.users.supervisor.id}'`);
  const res = await call(financeContext, env, { token: data.users.supervisor.token });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.context.branches, []);
  assert.equal(res.body.context.user.branchId, null);
});

test('payroll_adjustments rejects zero and negative amounts at the database level', async () => {
  const { DB } = await setup('008');
  await ensureFinanceSchema(DB as any);
  const insert = (amount: number) =>
    DB.raw.exec(`INSERT INTO payroll_adjustments (id, branch_id, employee_id, employee_name, period, kind, category, amount)
                 VALUES ('a${Math.abs(amount)}', 'b', 'e', 'n', '2026-10', 'earning', 'overtime', ${amount})`);
  assert.throws(() => insert(0));
  assert.throws(() => insert(-5));
  insert(0.01);
});

test('adaptive insert names only existing columns', async () => {
  const { DB } = await setup('008');
  const cols = await getTableColumns(DB as any, 'employee_requests');
  const { sql, params } = buildAdaptiveInsert('employee_requests', cols, { id: 'x', admin_response: 'no', response_notes: 'yes', skipped: undefined });
  assert.equal(sql, 'INSERT INTO employee_requests (id, response_notes) VALUES (?, ?)');
  assert.deepEqual(params, ['x', 'yes']);
});
