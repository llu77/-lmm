import type { APIRoute } from 'astro';
import { financeAuth, ok, fail, readJsonObject } from '@/lib/finance/http';

// Marks the caller's notifications as read.
// POST { ids: string[] (≤ 100) } or { all: true }. Other users' rows are never touched.

const MAX_IDS = 100;
const CHUNK = 50; // D1 allows at most 100 bound parameters per statement

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const body = await readJsonObject(context.request);
  if (!body) return fail('بيانات الطلب غير صالحة');

  const markAll = body.all === true;
  let ids: string[] = [];
  if (!markAll) {
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return fail('يرجى تحديد الإشعارات المطلوب تعليمها كمقروءة');
    }
    if (body.ids.length > MAX_IDS) return fail(`لا يمكن تعليم أكثر من ${MAX_IDS} إشعار في المرة الواحدة`);
    if (!body.ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 100)) {
      return fail('معرّفات الإشعارات غير صالحة');
    }
    ids = [...new Set(body.ids as string[])];
  }

  try {
    let updated = 0;
    if (markAll) {
      const result = await db
        .prepare(`UPDATE user_notifications SET is_read = 1, read_at = datetime('now') WHERE user_id = ? AND is_read = 0`)
        .bind(session.userId)
        .run();
      updated = Number(result.meta?.changes ?? 0);
    } else {
      const statements = [];
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        statements.push(
          db
            .prepare(
              `UPDATE user_notifications SET is_read = 1, read_at = datetime('now')
               WHERE user_id = ? AND is_read = 0 AND id IN (${chunk.map(() => '?').join(', ')})`,
            )
            .bind(session.userId, ...chunk),
        );
      }
      const results = await db.batch(statements);
      updated = results.reduce((sum, r) => sum + Number(r.meta?.changes ?? 0), 0);
    }

    const unread = await db
      .prepare('SELECT COUNT(*) AS n FROM user_notifications WHERE user_id = ? AND is_read = 0')
      .bind(session.userId)
      .first<{ n: number }>();
    return ok({ updated, unreadCount: Number(unread?.n ?? 0) });
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    return fail('تعذر تحديث حالة الإشعارات', 500);
  }
};
