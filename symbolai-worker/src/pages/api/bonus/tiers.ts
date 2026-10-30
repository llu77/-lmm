import type { APIRoute } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import { logAudit, getClientIP } from '@/lib/permissions';
import { financeAuth, ok, fail, readJsonObject, canApproveFinance } from '@/lib/finance/http';
import {
  DEFAULT_BONUS_TIERS,
  MAX_BONUS_TIERS,
  getBonusTiers,
  resetBonusTiers,
  saveBonusTiers,
  validateTiers,
} from '@/lib/finance/bonus';

async function userDisplayName(db: D1Database, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const row = await db
      .prepare('SELECT username, full_name FROM users_new WHERE id = ?')
      .bind(userId)
      .first<{ username: string | null; full_name: string | null }>();
    return row?.full_name?.trim() || row?.username || userId;
  } catch {
    return userId;
  }
}

/** Current bonus tiers (anyone who can see the bonus page). */
export const GET: APIRoute = async context => {
  const auth = await financeAuth(context, ['canManageBonus', 'canManageSettings', 'canViewReports']);
  if (auth instanceof Response) return auth;
  const { db, session } = auth;
  try {
    const stored = await getBonusTiers(db);
    return ok({
      tiers: stored.tiers,
      isDefault: stored.isDefault,
      invalidStored: stored.invalidStored,
      defaults: DEFAULT_BONUS_TIERS,
      maxTiers: MAX_BONUS_TIERS,
      updatedAt: stored.isDefault && !stored.invalidStored ? null : stored.updatedAt,
      updatedByName: stored.isDefault && !stored.invalidStored ? null : await userDisplayName(db, stored.updatedBy),
      canEdit: canApproveFinance(session),
    });
  } catch (error) {
    console.error('Load bonus tiers error:', error);
    return fail('تعذر تحميل شرائح البونص', 500);
  }
};

/** Saves the tiers ({tiers}) or restores the defaults ({reset: true}). Manager (admin) only. */
export const POST: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { db, session, actor } = auth;
  if (!canApproveFinance(session)) return fail('تعديل شرائح البونص من صلاحيات المدير فقط', 403);

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة', 400);

  try {
    const before = await getBonusTiers(db);
    const ip = getClientIP(context.request);
    const ua = context.request.headers.get('User-Agent') || undefined;

    if (body.reset === true) {
      await resetBonusTiers(db);
      await logAudit(db, session, 'update', 'bonus_tiers', 'bonus_tiers', { action: 'reset', before: before.tiers, after: DEFAULT_BONUS_TIERS }, ip, ua);
      return ok({ tiers: DEFAULT_BONUS_TIERS, isDefault: true, message: 'تمت استعادة الشرائح الافتراضية' });
    }

    const validation = validateTiers(body.tiers);
    if (!validation.ok) return fail(validation.error, 400, { index: validation.index ?? null });

    const tiers = await saveBonusTiers(db, validation.tiers, actor.id);
    await logAudit(db, session, 'update', 'bonus_tiers', 'bonus_tiers', { before: before.tiers, after: tiers }, ip, ua);
    return ok({
      tiers,
      isDefault: false,
      updatedByName: actor.displayName,
      message: 'تم حفظ شرائح البونص — تُطبق على الأسابيع غير المعتمدة',
    });
  } catch (error) {
    console.error('Save bonus tiers error:', error);
    return fail('تعذر حفظ شرائح البونص', 500);
  }
};
