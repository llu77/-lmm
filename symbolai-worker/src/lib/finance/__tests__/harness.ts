// Test harness: a Cloudflare D1 look-alike over node:sqlite plus a fake KV,
// seeded with either of the two schemas found in deployments, so API routes
// can be exercised end-to-end with `tsx --test`.

import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.resolve(here, '../../../..');

type Row = Record<string, unknown>;

function normalizeParams(values: unknown[]): Array<string | number | bigint | null | Uint8Array> {
  return values.map(v => {
    if (v === undefined) throw new Error('D1_TYPE_ERROR: Type undefined is not supported');
    if (typeof v === 'boolean') return v ? 1 : 0;
    return v as string | number | null;
  });
}

function plain(row: Row): Row {
  return { ...row };
}

const RETURNS_ROWS = /^\s*(SELECT|PRAGMA|WITH|VALUES)\b|\bRETURNING\b/i;

class FakeStatement {
  constructor(private db: FakeD1, readonly sql: string, readonly params: unknown[] = []) {}

  bind(...values: unknown[]): FakeStatement {
    return new FakeStatement(this.db, this.sql, values);
  }

  private stmt(): StatementSync {
    return this.db.raw.prepare(this.sql);
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const row = this.stmt().get(...normalizeParams(this.params)) as Row | undefined;
    if (!row) return null;
    return (column ? row[column] : plain(row)) as T;
  }

  async all<T = Row>(): Promise<{ results: T[]; success: true; meta: Row }> {
    return this.execute() as Promise<{ results: T[]; success: true; meta: Row }>;
  }

  async run(): Promise<{ results: Row[]; success: true; meta: Row }> {
    return this.execute();
  }

  async raw(): Promise<unknown[][]> {
    const { results } = await this.execute();
    return results.map(r => Object.values(r));
  }

  executeSync(): { results: Row[]; success: true; meta: Row } {
    const stmt = this.stmt();
    const params = normalizeParams(this.params);
    if (RETURNS_ROWS.test(this.sql)) {
      const rows = (stmt.all(...params) as Row[]).map(plain);
      return { results: rows, success: true, meta: { changes: this.db.raw.prepare('SELECT changes() AS c').get()!.c, rows_read: rows.length } };
    }
    const info = stmt.run(...params);
    return { results: [], success: true, meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
  }

  async execute() {
    return this.executeSync();
  }
}

export class FakeD1 {
  readonly raw: DatabaseSync;
  /** Every SQL string executed, for assertions. */
  readonly log: string[] = [];

  constructor() {
    this.raw = new DatabaseSync(':memory:');
    this.raw.exec('PRAGMA foreign_keys = ON');
  }

  prepare(sql: string): FakeStatement {
    this.log.push(sql);
    return new FakeStatement(this, sql);
  }

  async batch(statements: FakeStatement[]) {
    this.raw.exec('BEGIN');
    try {
      const results = statements.map(s => s.executeSync());
      this.raw.exec('COMMIT');
      return results;
    } catch (error) {
      this.raw.exec('ROLLBACK');
      throw error;
    }
  }

  async exec(sql: string) {
    this.raw.exec(sql);
    return { count: 1, duration: 0 };
  }

  query<T = Row>(sql: string, ...params: unknown[]): T[] {
    return (this.raw.prepare(sql).all(...normalizeParams(params)) as Row[]).map(plain) as T[];
  }

  one<T = Row>(sql: string, ...params: unknown[]): T | undefined {
    const row = this.raw.prepare(sql).get(...normalizeParams(params)) as Row | undefined;
    return row ? (plain(row) as T) : undefined;
  }
}

export class FakeKV {
  private store = new Map<string, string>();
  async get(key: string, _type?: string) {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.store.set(key, value);
  }
  async delete(key: string) {
    this.store.delete(key);
  }
}

export type SchemaVariant = '008' | 'legacy';

function readSql(rel: string): string {
  return readFileSync(path.join(workerRoot, rel), 'utf8');
}

/**
 * Builds a database the way a deployment would have it:
 * - '008':    migrations 002 + 008 (current migrations folder)
 * - 'legacy': 002 for auth tables, then the legacy shapes from
 *             symbolai-migration/schema.sql for the finance tables
 */
export function createDatabase(variant: SchemaVariant): FakeD1 {
  const db = new FakeD1();
  db.raw.exec(readSql('migrations/002_create_branches_and_roles.sql'));
  if (variant === '008') {
    db.raw.exec(readSql('migrations/008_create_financial_tables.sql'));
  } else {
    // Legacy finance tables without their FKs to branches(branch_id), which
    // cannot be satisfied alongside 002's branches table.
    const legacy = readSql('../symbolai-migration/schema.sql');
    const wanted = ['employees', 'revenues', 'bonus_records', 'employee_requests', 'advances', 'deductions', 'payroll_records', 'notifications'];
    for (const table of wanted) {
      const match = new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\);`).exec(legacy);
      if (!match) throw new Error(`legacy table ${table} not found`);
      const body = match[1]
        .split('\n')
        .filter(line => !/FOREIGN KEY/.test(line))
        .join('\n')
        .replace(/,\s*$/, '');
      db.raw.exec(`CREATE TABLE ${table} (${body}\n);`);
    }
  }
  return db;
}

export interface SeedResult {
  branchId: string;
  otherBranchId: string;
  users: Record<'admin' | 'supervisor' | 'otherSupervisor' | 'employee' | 'partner', { id: string; token: string }>;
  employees: Array<{ id: string; name: string; nationalId: string; baseSalary: number }>;
}

export async function seed(db: FakeD1, kv: FakeKV): Promise<SeedResult> {
  db.raw.exec(`
    INSERT OR IGNORE INTO branches (id, name, name_ar, is_active) VALUES
      ('branch_1010', 'Laban', 'فرع لبن', 1),
      ('branch_2020', 'Tuwaiq', 'فرع طويق', 1);
    INSERT INTO users_new (id, username, password, full_name, role_id, branch_id, is_active) VALUES
      ('u_admin', 'boss', 'x', 'المدير العام', 'role_admin', NULL, 1),
      ('u_sup', 'sup', 'x', 'محمد أحمد', 'role_supervisor', 'branch_1010', 1),
      ('u_sup2', 'sup2', 'x', 'عبدالله خالد', 'role_supervisor', 'branch_2020', 1),
      ('u_emp', 'emp', 'x', 'أحمد علي', 'role_employee', 'branch_1010', 1),
      ('u_partner', 'partner', 'x', 'سعد', 'role_partner', 'branch_1010', 1);
  `);
  const employees = [
    { id: 'emp_1', name: 'أحمد علي', nationalId: '1001', baseSalary: 3000 },
    { id: 'emp_2', name: 'محمد إسماعيل', nationalId: '1002', baseSalary: 2000 },
    { id: 'emp_3', name: 'خالد سالم', nationalId: '2001', baseSalary: 2500 },
  ];
  db.raw.prepare(`INSERT INTO employees (id, branch_id, employee_name, national_id, base_salary, supervisor_allowance, incentives, is_active)
                  VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run('emp_1', 'branch_1010', employees[0].name, '1001', 3000, 500, 0);
  db.raw.prepare(`INSERT INTO employees (id, branch_id, employee_name, national_id, base_salary, supervisor_allowance, incentives, is_active)
                  VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run('emp_2', 'branch_1010', employees[1].name, '1002', 2000, 0, 0);
  db.raw.prepare(`INSERT INTO employees (id, branch_id, employee_name, national_id, base_salary, supervisor_allowance, incentives, is_active)
                  VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).run('emp_3', 'branch_2020', employees[2].name, '2001', 2500, 0, 0);

  const users = {} as SeedResult['users'];
  const entries: Array<[keyof SeedResult['users'], string, string]> = [
    ['admin', 'u_admin', 'boss'],
    ['supervisor', 'u_sup', 'sup'],
    ['otherSupervisor', 'u_sup2', 'sup2'],
    ['employee', 'u_emp', 'emp'],
    ['partner', 'u_partner', 'partner'],
  ];
  for (const [key, id, username] of entries) {
    const token = `tok_${id}`;
    await kv.put(`session:${token}`, JSON.stringify({ userId: id, username, role: key, createdAt: Date.now(), expiresAt: Date.now() + 3_600_000 }));
    users[key] = { id, token };
  }
  return { branchId: 'branch_1010', otherBranchId: 'branch_2020', users, employees };
}

export interface CallOptions {
  method?: string;
  body?: unknown;
  token?: string;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

/** Invokes an Astro APIRoute handler the way the Cloudflare adapter would. */
export async function call(
  handler: (ctx: any) => Promise<Response> | Response,
  env: { DB: FakeD1; SESSIONS: FakeKV },
  options: CallOptions = {},
): Promise<{ status: number; body: any }> {
  const url = new URL('https://symbolai.test/api/test');
  for (const [k, v] of Object.entries(options.query ?? {})) url.searchParams.set(k, v);
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (options.token) headers.set('Cookie', `session=${options.token}`);
  const request = new Request(url, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const response = await handler({
    request,
    url,
    params: options.params ?? {},
    locals: { runtime: { env: { ...env, ADMIN_EMAIL: 'admin@test', RESEND_API_KEY: '' } } },
  });
  const text = await response.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep text
  }
  return { status: response.status, body };
}

/** Fresh DB + KV + seed for one test. */
export async function setup(variant: SchemaVariant) {
  const { resetSchemaCaches } = await import('../schema');
  resetSchemaCaches();
  const DB = createDatabase(variant);
  const SESSIONS = new FakeKV();
  const data = await seed(DB, SESSIONS);
  return { env: { DB, SESSIONS }, DB, data };
}
