// POST /api/requests/cancel {id} — the requester withdraws their own request
// while it is still pending.

import type { APIRoute } from 'astro';
import { financeAuth, ok, fail, readJsonObject, str, clientIp } from '@/lib/finance/http';
import { logAudit } from '@/lib/permissions';
import { loadRequest } from './_lib';

export const POST: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db, actor } = auth;

  const body = await readJsonObject(context.request);
  const id = str(body?.id, 100);
  if (!id) return fail('رقم الطلب مطلوب');

  try {
    const request = await loadRequest(db, id);
    if (!request) return fail('الطلب غير موجود', 404);
    if (request.userId !== actor.id) return fail('يمكنك سحب طلباتك أنت فقط', 403);
    if (request.status !== 'pending') return fail('لا يمكن سحب الطلب بعد الرد عليه', 409);

    let changes = 0;
    let deleted = false;
    try {
      const result = await db
        .prepare(`UPDATE employee_requests SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status = 'pending'`)
        .bind(id, actor.id)
        .run();
      changes = Number(result.meta?.changes ?? 0);
    } catch (error) {
      // A deployment whose status column has a CHECK without 'cancelled': remove the request instead.
      if (!/CHECK constraint/i.test(String(error))) throw error;
      const results = await db.batch([
        db.prepare(`DELETE FROM employee_request_meta WHERE request_id = ? AND EXISTS (SELECT 1 FROM employee_requests WHERE id = ? AND user_id = ? AND status = 'pending')`).bind(id, id, actor.id),
        db.prepare(`DELETE FROM employee_requests WHERE id = ? AND user_id = ? AND status = 'pending'`).bind(id, actor.id),
      ]);
      changes = Number(results[1]?.meta?.changes ?? 0);
      deleted = true;
    }
    if (changes === 0) return fail('لا يمكن سحب الطلب بعد الرد عليه', 409);

    await logAudit(
      db,
      session,
      deleted ? 'delete' : 'update',
      'employee_request',
      id,
      { status: 'cancelled', requestType: request.requestType, employeeName: request.employeeName },
      clientIp(context.request),
      context.request.headers.get('User-Agent') || undefined,
    );

    return ok({ message: 'تم سحب الطلب', deleted });
  } catch (error) {
    console.error('Cancel request error:', error);
    return fail('حدث خطأ أثناء سحب الطلب', 500);
  }
};
