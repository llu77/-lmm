import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, call, type SchemaVariant } from './harness';
import { notifyUsers } from '../notify';
import { ensureFinanceSchema } from '../schema';
import * as organization from '../../../pages/api/settings/organization';
import * as signature from '../../../pages/api/settings/signature';
import * as notificationsList from '../../../pages/api/notifications/list';
import * as notificationsRead from '../../../pages/api/notifications/read';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD48L3N2Zz4=';
const VARIANTS: SchemaVariant[] = ['008', 'legacy'];

// ---------------------------------------------------------------------------
// Organization settings
// ---------------------------------------------------------------------------

for (const variant of VARIANTS) {
  test(`[${variant}] organization GET works for a supervisor (read-only)`, async () => {
    const { env, data } = await setup(variant);
    const res = await call(organization.GET, env, { token: data.users.supervisor.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.canEdit, false);
    assert.equal(res.body.profile.currency, 'SAR');
    assert.equal(res.body.profile.vatRate, 15);
    assert.equal(res.body.profile.stampImage, null);
  });
}

test('organization GET requires a session', async () => {
  const { env } = await setup('008');
  const res = await call(organization.GET, env);
  assert.equal(res.status, 401);
});

test('organization POST by a supervisor is forbidden', async () => {
  const { env, DB, data } = await setup('008');
  const res = await call(organization.POST, env, { token: data.users.supervisor.token, body: { companyNameAr: 'محاولة' } });
  assert.equal(res.status, 403);
  assert.equal(res.body.success, false);
  assert.equal(DB.query('SELECT * FROM organization_settings').length, 0);

  const emp = await call(organization.POST, env, { token: data.users.employee.token, body: { stampImage: PNG } });
  assert.equal(emp.status, 403);
});

test('organization POST by the admin saves values and the stamp (audit without image payload)', async () => {
  const { env, DB, data } = await setup('008');
  const token = data.users.admin.token;
  const res = await call(organization.POST, env, {
    token,
    body: {
      companyNameAr: '  شركة الرمز للتجارة  ',
      companyNameEn: 'Symbol Trading Co.',
      crNumber: '1010123456',
      vatNumber: '300123456700003',
      address: 'الرياض - حي العليا',
      phone: '+966 11 234 5678',
      email: 'info@symbolai.test',
      currency: 'SAR',
      vatRate: '15',
      documentFooter: 'شكراً لتعاملكم معنا',
      stampImage: PNG,
      logoImage: PNG2,
    },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.canEdit, true);
  assert.deepEqual(res.body.warnings, []);
  const p = res.body.profile;
  assert.equal(p.companyNameAr, 'شركة الرمز للتجارة');
  assert.equal(p.companyNameEn, 'Symbol Trading Co.');
  assert.equal(p.crNumber, '1010123456');
  assert.equal(p.vatNumber, '300123456700003');
  assert.equal(p.phone, '+966 11 234 5678');
  assert.equal(p.stampImage, PNG);
  assert.equal(p.logoImage, PNG2);
  assert.equal(p.vatRate, 15);

  const stored = DB.one<{ value: string; updated_by: string }>(`SELECT value, updated_by FROM organization_settings WHERE key = 'stamp_image'`);
  assert.equal(stored?.value, PNG);
  assert.equal(stored?.updated_by, 'u_admin');

  const audit = DB.one<{ details: string }>(`SELECT details FROM audit_logs WHERE entity_type = 'organization_settings'`);
  assert.ok(audit, 'audit row written');
  assert.ok(!audit!.details.includes('base64'), 'audit must not contain image data');
  assert.match(audit!.details, /"stampImage":"updated"/);

  // Supervisor (prepares payroll) sees the saved profile including the stamp.
  const read = await call(organization.GET, env, { token: data.users.supervisor.token });
  assert.equal(read.body.profile.companyNameAr, 'شركة الرمز للتجارة');
  assert.equal(read.body.profile.stampImage, PNG);
  assert.equal(read.body.hasStamp, true);

  // An employee gets the profile but not the raw stamp image.
  const empView = await call(organization.GET, env, { token: data.users.employee.token });
  assert.equal(empView.status, 200);
  assert.equal(empView.body.profile.companyNameAr, 'شركة الرمز للتجارة');
  assert.equal(empView.body.profile.logoImage, PNG2);
  assert.equal(empView.body.profile.stampImage, null);
  assert.equal(empView.body.hasStamp, true);
  assert.equal(empView.body.canEdit, false);

  // Partial update: only the VAT rate changes; null removes the stamp.
  const partial = await call(organization.POST, env, { token, body: { vatRate: 5, stampImage: null } });
  assert.equal(partial.status, 200);
  assert.equal(partial.body.profile.vatRate, 5);
  assert.equal(partial.body.profile.stampImage, null);
  assert.equal(partial.body.profile.logoImage, PNG2);
  assert.equal(partial.body.profile.companyNameEn, 'Symbol Trading Co.');

  // Clearing a name falls back to the default.
  const cleared = await call(organization.POST, env, { token, body: { companyNameAr: '' } });
  assert.equal(cleared.body.profile.companyNameAr, 'SymbolAI');
});

test('organization POST rejects invalid images and fields', async () => {
  const { env, DB, data } = await setup('008');
  const token = data.users.admin.token;
  const cases: Array<[string, Record<string, unknown>]> = [
    ['svg stamp', { stampImage: SVG }],
    ['too large stamp', { stampImage: `data:image/png;base64,${'A'.repeat(650_000)}` }],
    ['garbage stamp', { stampImage: 'not-an-image' }],
    ['javascript logo', { logoImage: 'javascript:alert(1)' }],
    ['non-string logo', { logoImage: 42 }],
    ['vat letters', { vatNumber: '30012345670000A' }],
    ['vat short', { vatNumber: '3001234' }],
    ['cr letters', { crNumber: '10-10' }],
    ['currency', { currency: 'XYZ' }],
    ['vat rate > 100', { vatRate: 150 }],
    ['vat rate negative', { vatRate: -1 }],
    ['vat rate text', { vatRate: 'abc' }],
    ['email', { email: 'not-an-email' }],
    ['name too long', { companyNameAr: 'ا'.repeat(151) }],
    ['footer too long', { documentFooter: 'x'.repeat(301) }],
    ['empty body', {}],
  ];
  for (const [label, body] of cases) {
    const res = await call(organization.POST, env, { token, body });
    assert.equal(res.status, 400, `${label}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.equal(typeof res.body.error, 'string');
  }
  assert.equal(DB.query('SELECT * FROM organization_settings').length, 0, 'nothing saved on invalid input');

  // A non-standard (but 15-digit) VAT number is accepted with a warning.
  const warn = await call(organization.POST, env, { token, body: { vatNumber: '123456789012345' } });
  assert.equal(warn.status, 200);
  assert.equal(warn.body.warnings.length, 1);
});

// ---------------------------------------------------------------------------
// Signatures
// ---------------------------------------------------------------------------

for (const variant of VARIANTS) {
  test(`[${variant}] an employee saves, updates and deletes their own signature`, async () => {
    const { env, DB, data } = await setup(variant);
    const token = data.users.employee.token;

    const empty = await call(signature.GET, env, { token });
    assert.equal(empty.status, 200);
    assert.equal(empty.body.signature, null);
    assert.equal(empty.body.user.id, 'u_emp');
    assert.equal(empty.body.user.branchName, 'فرع لبن');

    const saved = await call(signature.POST, env, { token, body: { image: PNG, signerTitle: 'محاسب' } });
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    assert.equal(saved.body.signature.image, PNG);
    assert.equal(saved.body.signature.signerTitle, 'محاسب');

    // Title-only update keeps the image.
    const retitled = await call(signature.POST, env, { token, body: { signerTitle: 'المحاسب', signerName: 'أحمد علي' } });
    assert.equal(retitled.status, 200);
    assert.equal(retitled.body.signature.image, PNG);
    assert.equal(retitled.body.signature.signerTitle, 'المحاسب');
    assert.equal(retitled.body.signature.signerName, 'أحمد علي');

    const mine = await call(signature.GET, env, { token });
    assert.equal(mine.body.signature.image, PNG);
    assert.equal(DB.query(`SELECT * FROM audit_logs WHERE entity_type = 'user_signature'`).length, 2);
    assert.ok(DB.query<{ details: string }>(`SELECT details FROM audit_logs WHERE entity_type = 'user_signature'`).every(r => !r.details.includes('base64')));

    const del = await call(signature.DELETE, env, { token, method: 'DELETE', body: {} });
    assert.equal(del.status, 200);
    assert.equal(del.body.deleted, true);
    assert.equal(DB.query('SELECT * FROM user_signatures').length, 0);
  });
}

test('signature POST validates the image', async () => {
  const { env, DB, data } = await setup('008');
  const token = data.users.employee.token;
  for (const image of [undefined, SVG, 'garbage', `data:image/png;base64,${'A'.repeat(650_000)}`]) {
    const res = await call(signature.POST, env, { token, body: { image } });
    assert.equal(res.status, 400);
  }
  const longTitle = await call(signature.POST, env, { token, body: { image: PNG, signerTitle: 'x'.repeat(101) } });
  assert.equal(longTitle.status, 400);
  assert.equal(DB.query('SELECT * FROM user_signatures').length, 0);
});

test('the admin registers a signature for another existing user', async () => {
  const { env, DB, data } = await setup('008');
  const admin = data.users.admin.token;

  const res = await call(signature.POST, env, { token: admin, body: { userId: 'u_sup', image: PNG, signerTitle: 'مشرف الفرع' } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.user.id, 'u_sup');
  const row = DB.one<{ signature_image: string; signer_title: string }>(`SELECT * FROM user_signatures WHERE user_id = 'u_sup'`);
  assert.equal(row?.signature_image, PNG);
  assert.equal(row?.signer_title, 'مشرف الفرع');

  const view = await call(signature.GET, env, { token: admin, query: { userId: 'u_sup' } });
  assert.equal(view.status, 200);
  assert.equal(view.body.signature.image, PNG);

  // The supervisor sees it as their own signature.
  const own = await call(signature.GET, env, { token: data.users.supervisor.token });
  assert.equal(own.body.signature.signerTitle, 'مشرف الفرع');

  const unknown = await call(signature.POST, env, { token: admin, body: { userId: 'u_missing', image: PNG } });
  assert.equal(unknown.status, 404);

  DB.raw.exec(`UPDATE users_new SET is_active = 0 WHERE id = 'u_partner'`);
  const inactive = await call(signature.POST, env, { token: admin, body: { userId: 'u_partner', image: PNG } });
  assert.equal(inactive.status, 404);

  const del = await call(signature.DELETE, env, { token: admin, method: 'DELETE', body: { userId: 'u_sup' } });
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);
  const again = await call(signature.DELETE, env, { token: admin, method: 'DELETE', query: { userId: 'u_sup' } });
  assert.equal(again.body.deleted, false);
});

test('a supervisor cannot manage other users’ signatures', async () => {
  const { env, DB, data } = await setup('008');
  const sup = data.users.supervisor.token;
  await ensureFinanceSchema(DB as any);
  DB.raw.exec(`INSERT INTO user_signatures (user_id, signature_image) VALUES ('u_emp', '${PNG}')`);

  const save = await call(signature.POST, env, { token: sup, body: { userId: 'u_emp', image: PNG2 } });
  assert.equal(save.status, 403);
  const view = await call(signature.GET, env, { token: sup, query: { userId: 'u_emp' } });
  assert.equal(view.status, 403);
  const list = await call(signature.GET, env, { token: sup, query: { all: '1' } });
  assert.equal(list.status, 403);
  const del = await call(signature.DELETE, env, { token: sup, method: 'DELETE', body: { userId: 'u_emp' } });
  assert.equal(del.status, 403);
  assert.equal(DB.one<{ signature_image: string }>(`SELECT signature_image FROM user_signatures WHERE user_id = 'u_emp'`)?.signature_image, PNG);

  // Passing their own id is fine.
  const self = await call(signature.POST, env, { token: sup, body: { userId: 'u_sup', image: PNG } });
  assert.equal(self.status, 201);
});

for (const variant of VARIANTS) {
  test(`[${variant}] ?all=1 lists every active user with hasSignature (no images)`, async () => {
    const { env, DB, data } = await setup(variant);
    const admin = data.users.admin.token;
    await call(signature.POST, env, { token: admin, body: { userId: 'u_emp', image: PNG, signerTitle: 'أمين الصندوق' } });
    DB.raw.exec(`UPDATE users_new SET is_active = 0 WHERE id = 'u_partner'`);

    const res = await call(signature.GET, env, { token: admin, query: { all: '1' } });
    assert.equal(res.status, 200);
    const users = res.body.users as Array<Record<string, unknown>>;
    // user_admin is seeded by migration 002; u_partner was deactivated.
    assert.deepEqual(users.map(u => u.id).sort(), ['u_admin', 'u_emp', 'u_sup', 'u_sup2', 'user_admin']);
    assert.deepEqual(users.slice(0, 2).map(u => u.roleName), ['admin', 'admin'], 'admins first');
    const emp = users.find(u => u.id === 'u_emp')!;
    assert.equal(emp.hasSignature, true);
    assert.equal(emp.signerTitle, 'أمين الصندوق');
    assert.equal(emp.roleNameAr, 'موظف');
    assert.equal(emp.branchName, 'فرع لبن');
    assert.equal(emp.displayName, 'أحمد علي');
    assert.equal(users.find(u => u.id === 'u_sup2')!.hasSignature, false);
    assert.equal(users.find(u => u.id === 'u_sup2')!.branchName, 'فرع طويق');
    assert.ok(!JSON.stringify(res.body).includes('base64'), 'list carries no images');
    assert.ok(!JSON.stringify(res.body).includes('password'), 'list carries no password fields');
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function seedNotifications(DB: any) {
  await notifyUsers(DB, ['u_emp'], { type: 'bonus_approved', title: 'تم اعتماد البونص', message: 'بونص الأسبوع الأول', link: '/bonus', relatedEntity: 'b1', severity: 'success' });
  await notifyUsers(DB, ['u_emp'], { type: 'request_decided', title: 'تمت الموافقة على طلبك', message: 'سلفة 500', link: 'https://evil.example/x', relatedEntity: 'r1' });
  await notifyUsers(DB, ['u_emp'], { type: 'payroll_approved', title: 'اعتماد الرواتب', message: 'أكتوبر', link: '//evil.example', relatedEntity: 'p1' });
  await notifyUsers(DB, ['u_sup'], { type: 'request_new', title: 'طلب جديد', message: 'طلب سلفة', link: '/manage-requests', relatedEntity: 'r1' });
  DB.raw.exec(`UPDATE user_notifications SET created_at = datetime('now', '-1 hour') WHERE type = 'bonus_approved'`);
}

for (const variant of VARIANTS) {
  test(`[${variant}] notifications list returns only the caller's rows with unreadCount`, async () => {
    const { env, DB, data } = await setup(variant);
    // Tables are created by the first authenticated call.
    await call(notificationsList.GET, env, { token: data.users.employee.token });
    await seedNotifications(DB);

    const res = await call(notificationsList.GET, env, { token: data.users.employee.token });
    assert.equal(res.status, 200);
    assert.equal(res.body.unreadCount, 3);
    const items = res.body.notifications as Array<Record<string, unknown>>;
    assert.equal(items.length, 3);
    assert.ok(items.every(n => n.type !== 'request_new'), 'no other user rows');
    assert.equal(items[items.length - 1].type, 'bonus_approved', 'newest first');
    assert.deepEqual(Object.keys(items[0]).sort(), ['createdAt', 'id', 'isRead', 'link', 'message', 'severity', 'title', 'type']);
    const byType = Object.fromEntries(items.map(n => [n.type, n]));
    assert.equal(byType.bonus_approved.link, '/bonus');
    assert.equal(byType.bonus_approved.severity, 'success');
    assert.equal(byType.request_decided.link, null, 'external links are dropped');
    assert.equal(byType.payroll_approved.link, null, 'protocol-relative links are dropped');

    const limited = await call(notificationsList.GET, env, { token: data.users.employee.token, query: { limit: '1' } });
    assert.equal(limited.body.notifications.length, 1);
    assert.equal(limited.body.unreadCount, 3);

    const sup = await call(notificationsList.GET, env, { token: data.users.supervisor.token, query: { limit: '999' } });
    assert.equal(sup.body.notifications.length, 1);
    assert.equal(sup.body.unreadCount, 1);

    const anon = await call(notificationsList.GET, env);
    assert.equal(anon.status, 401);
  });
}

test('notifications read {ids} only affects the caller’s rows', async () => {
  const { env, DB, data } = await setup('008');
  await call(notificationsList.GET, env, { token: data.users.employee.token });
  await seedNotifications(DB);
  const emp = data.users.employee.token;
  const empIds = DB.query<{ id: string }>(`SELECT id FROM user_notifications WHERE user_id = 'u_emp' ORDER BY type`).map(r => r.id);
  const supId = DB.one<{ id: string }>(`SELECT id FROM user_notifications WHERE user_id = 'u_sup'`)!.id;

  const res = await call(notificationsRead.POST, env, { token: emp, body: { ids: [empIds[0], supId] } });
  assert.equal(res.status, 200);
  assert.equal(res.body.updated, 1);
  assert.equal(res.body.unreadCount, 2);
  assert.equal(DB.one<{ is_read: number }>('SELECT is_read FROM user_notifications WHERE id = ?', supId)!.is_read, 0);
  assert.equal(DB.one<{ is_read: number; read_at: string }>('SELECT is_read, read_at FROM user_notifications WHERE id = ?', empIds[0])!.is_read, 1);

  // Re-marking is a no-op.
  const again = await call(notificationsRead.POST, env, { token: emp, body: { ids: [empIds[0]] } });
  assert.equal(again.body.updated, 0);

  for (const body of [{}, { ids: [] }, { ids: 'x' }, { ids: [1, 2] }, { ids: Array.from({ length: 101 }, (_, i) => `n${i}`) }, { all: 'yes' }]) {
    const bad = await call(notificationsRead.POST, env, { token: emp, body });
    assert.equal(bad.status, 400, JSON.stringify(body));
  }

  // 100 ids (chunked under D1's bound-parameter limit) are accepted.
  const many = await call(notificationsRead.POST, env, { token: emp, body: { ids: [...Array.from({ length: 99 }, (_, i) => `n${i}`), empIds[1]] } });
  assert.equal(many.status, 200);
  assert.equal(many.body.updated, 1);
});

test('notifications read {all:true} marks every unread row of the caller only', async () => {
  const { env, DB, data } = await setup('008');
  await call(notificationsList.GET, env, { token: data.users.employee.token });
  await seedNotifications(DB);

  const res = await call(notificationsRead.POST, env, { token: data.users.employee.token, body: { all: true } });
  assert.equal(res.status, 200);
  assert.equal(res.body.updated, 3);
  assert.equal(res.body.unreadCount, 0);
  assert.equal(DB.one<{ n: number }>(`SELECT COUNT(*) AS n FROM user_notifications WHERE user_id = 'u_emp' AND is_read = 0`)!.n, 0);
  assert.equal(DB.one<{ n: number }>(`SELECT COUNT(*) AS n FROM user_notifications WHERE user_id = 'u_sup' AND is_read = 0`)!.n, 1);

  const list = await call(notificationsList.GET, env, { token: data.users.employee.token });
  assert.ok(list.body.notifications.every((n: { isRead: boolean }) => n.isRead));

  const anon = await call(notificationsRead.POST, env, { body: { all: true } });
  assert.equal(anon.status, 401);
});
