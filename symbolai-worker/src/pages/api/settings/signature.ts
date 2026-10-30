import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { logAudit, type EnhancedSession } from '@/lib/permissions';
import { financeAuth, ok, fail, readJsonObject, canApproveFinance, clientIp, type FinanceContext } from '@/lib/finance/http';
import { getUserSignatures, validateImageDataUrl } from '@/lib/finance/documents';
import { getTableColumns } from '@/lib/finance/schema';

// User signatures printed on vouchers and payroll sheets.
// Every user manages their own signature; the general manager
// (canApproveFinance) can also register signatures for any existing user.
//
// GET    ?userId=…           → { signature | null, user }   (default: me)
// GET    ?all=1              → { users: [...] }             (manager only, no images)
// POST   { userId?, image?, signerName?, signerTitle? }      (image optional when one is already saved)
// DELETE { userId? } or ?userId=…

interface UserInfo {
  id: string;
  username: string;
  fullName: string | null;
  displayName: string;
  roleName: string | null;
  roleNameAr: string | null;
  branchId: string | null;
  branchName: string | null;
}

async function loadBranchNames(db: D1Database): Promise<Map<string, string>> {
  try {
    const result = await db.prepare('SELECT * FROM branches').all<Record<string, unknown>>();
    return new Map(
      (result.results ?? []).map(row => [String(row.id), String(row.name_ar ?? row.name ?? row.branch_name ?? row.id)]),
    );
  } catch (error) {
    console.error('Failed to load branch names:', error);
    return new Map();
  }
}

async function userSelectSql(db: D1Database): Promise<string> {
  const columns = await getTableColumns(db, 'users_new');
  const fullName = columns.has('full_name') ? 'u.full_name' : 'NULL';
  const active = columns.has('is_active') ? 'COALESCE(u.is_active, 1) = 1' : '1 = 1';
  return `SELECT u.id, u.username, ${fullName} AS full_name, u.branch_id,
                 r.name AS role_name, r.name_ar AS role_name_ar
          FROM users_new u LEFT JOIN roles r ON r.id = u.role_id
          WHERE ${active}`;
}

function toUserInfo(row: Record<string, unknown>, branches: Map<string, string>): UserInfo {
  const fullName = typeof row.full_name === 'string' && row.full_name.trim() ? row.full_name.trim() : null;
  const branchId = typeof row.branch_id === 'string' && row.branch_id ? row.branch_id : null;
  return {
    id: String(row.id),
    username: String(row.username ?? ''),
    fullName,
    displayName: fullName ?? String(row.username ?? row.id),
    roleName: (row.role_name as string | null) ?? null,
    roleNameAr: (row.role_name_ar as string | null) ?? null,
    branchId,
    branchName: branchId ? branches.get(branchId) ?? branchId : null,
  };
}

/** Active user by id, or null. */
async function loadActiveUser(db: D1Database, userId: string): Promise<UserInfo | null> {
  const row = await db.prepare(`${await userSelectSql(db)} AND u.id = ?`).bind(userId).first<Record<string, unknown>>();
  if (!row) return null;
  return toUserInfo(row, await loadBranchNames(db));
}

/**
 * Resolves whose signature a request acts on: the caller by default; another
 * user only for the general manager.
 */
function resolveTarget(session: EnhancedSession, requested: unknown): string | Response {
  if (requested !== undefined && requested !== null && typeof requested !== 'string') {
    return fail('معرّف المستخدم غير صالح');
  }
  const wanted = typeof requested === 'string' ? requested.trim() : '';
  if (!wanted || wanted === session.userId) return session.userId;
  if (wanted.length > 100) return fail('معرّف المستخدم غير صالح');
  if (!canApproveFinance(session)) {
    return fail('إدارة تواقيع المستخدمين الآخرين متاحة للمدير فقط', 403);
  }
  return wanted;
}

function audit(auth: FinanceContext, request: Request, action: 'update' | 'delete', targetId: string, details: Record<string, unknown>) {
  return logAudit(auth.db, auth.session, action, 'user_signature', targetId, details, clientIp(request),
    request.headers.get('User-Agent') || undefined);
}

function optionalText(value: unknown, max: number, label: string): { value: string | null } | { error: string } | undefined {
  if (value === undefined) return undefined;
  if (value === null) return { value: null };
  if (typeof value !== 'string') return { error: `قيمة غير صالحة في حقل ${label}` };
  const text = value.trim();
  if (text.length > max) return { error: `${label} يجب ألا يتجاوز ${max} حرفاً` };
  return { value: text || null };
}

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;
  const url = new URL(context.request.url);

  try {
    if (url.searchParams.get('all') === '1') {
      if (!canApproveFinance(session)) return fail('عرض تواقيع جميع المستخدمين متاح للمدير فقط', 403);
      const [usersResult, branches] = await Promise.all([
        db.prepare(await userSelectSql(db)).all<Record<string, unknown>>(),
        loadBranchNames(db),
      ]);
      const users = (usersResult.results ?? []).map(row => toUserInfo(row, branches));
      const signatures = await loadSignatureMeta(db);
      const roleOrder: Record<string, number> = { admin: 0, supervisor: 1, partner: 2, employee: 3 };
      const list = users
        .map(user => {
          const meta = signatures.get(user.id);
          return {
            ...user,
            hasSignature: Boolean(meta),
            signerName: meta?.signerName ?? null,
            signerTitle: meta?.signerTitle ?? null,
            updatedAt: meta?.updatedAt ?? null,
          };
        })
        .sort((a, b) =>
          (roleOrder[a.roleName ?? ''] ?? 9) - (roleOrder[b.roleName ?? ''] ?? 9)
          || (a.branchName ?? '').localeCompare(b.branchName ?? '', 'ar')
          || a.displayName.localeCompare(b.displayName, 'ar'));
      return ok({ users: list });
    }

    const target = resolveTarget(session, url.searchParams.get('userId') ?? undefined);
    if (target instanceof Response) return target;
    const user = await loadActiveUser(db, target);
    if (!user) return fail('المستخدم غير موجود أو غير نشط', 404);
    const signature = (await getUserSignatures(db, [target])).get(target) ?? null;
    return ok({ signature, user });
  } catch (error) {
    console.error('Failed to load signatures:', error);
    return fail('تعذر تحميل التواقيع', 500);
  }
};

/** Signature metadata (no images) for every user that has one. */
async function loadSignatureMeta(db: D1Database) {
  const result = await db
    .prepare('SELECT user_id, signer_name, signer_title, updated_at FROM user_signatures')
    .all<{ user_id: string; signer_name: string | null; signer_title: string | null; updated_at: string | null }>();
  return new Map(
    (result.results ?? []).map(row => [
      row.user_id,
      { signerName: row.signer_name || null, signerTitle: row.signer_title || null, updatedAt: row.updated_at || null },
    ]),
  );
}

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة');

  const target = resolveTarget(session, body.userId);
  if (target instanceof Response) return target;

  const signerName = optionalText(body.signerName, 100, 'اسم الموقّع');
  if (signerName && 'error' in signerName) return fail(signerName.error);
  const signerTitle = optionalText(body.signerTitle, 100, 'الصفة');
  if (signerTitle && 'error' in signerTitle) return fail(signerTitle.error);

  try {
    const user = await loadActiveUser(db, target);
    if (!user) return fail('المستخدم غير موجود أو غير نشط', 404);
    const existing = (await getUserSignatures(db, [target])).get(target) ?? null;

    let image: string;
    if (body.image === undefined && existing) {
      image = existing.image; // name/title update only
    } else {
      const validated = validateImageDataUrl(body.image);
      if (!validated.ok) return fail(validated.error);
      image = validated.value;
    }
    const name = signerName ? signerName.value : existing?.signerName ?? null;
    const title = signerTitle ? signerTitle.value : existing?.signerTitle ?? null;

    await db
      .prepare(
        `INSERT INTO user_signatures (user_id, signature_image, signer_name, signer_title, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           signature_image = excluded.signature_image,
           signer_name = excluded.signer_name,
           signer_title = excluded.signer_title,
           updated_at = excluded.updated_at`,
      )
      .bind(target, image, name, title)
      .run();

    await audit(auth, context.request, 'update', target, {
      targetUserId: target,
      targetUsername: user.username,
      onBehalf: target !== session.userId,
      imageChanged: image !== existing?.image,
      created: !existing,
      signerName: name,
      signerTitle: title,
    });

    const signature = (await getUserSignatures(db, [target])).get(target) ?? null;
    return ok({ signature, user }, existing ? 200 : 201);
  } catch (error) {
    console.error('Failed to save signature:', error);
    return fail('تعذر حفظ التوقيع', 500);
  }
};

export const DELETE: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const body = (await readJsonObject(context.request)) ?? {};
  const url = new URL(context.request.url);
  const target = resolveTarget(session, body.userId ?? url.searchParams.get('userId') ?? undefined);
  if (target instanceof Response) return target;

  try {
    if (target !== session.userId) {
      const user = await loadActiveUser(db, target);
      if (!user) return fail('المستخدم غير موجود أو غير نشط', 404);
    }
    const result = await db.prepare('DELETE FROM user_signatures WHERE user_id = ?').bind(target).run();
    const deleted = Number(result.meta?.changes ?? 0) > 0;
    if (deleted) {
      await audit(auth, context.request, 'delete', target, { targetUserId: target, onBehalf: target !== session.userId });
    }
    return ok({ deleted });
  } catch (error) {
    console.error('Failed to delete signature:', error);
    return fail('تعذر حذف التوقيع', 500);
  }
};
