import type { APIRoute } from 'astro';
import { financeAuth, ok, fail } from '@/lib/finance/http';

// In-app notifications of the signed-in user (newest first) plus the unread count.
// GET ?limit=20 (1…50)

const SEVERITIES = new Set(['info', 'success', 'warning', 'critical']);

/** Only same-origin relative paths ("/x"), never "//host" or "/\host". */
function safeLink(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const link = value.trim();
  return /^\/(?![/\\])[^\s\\]*$/.test(link) ? link : null;
}

export const GET: APIRoute = async context => {
  const auth = await financeAuth(context);
  if (auth instanceof Response) return auth;
  const { session, db } = auth;

  const url = new URL(context.request.url);
  const requested = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 50) : 20;

  try {
    const [rows, unread] = await Promise.all([
      db
        .prepare(
          `SELECT id, type, severity, title, message, link, is_read, created_at
           FROM user_notifications
           WHERE user_id = ?
           ORDER BY created_at DESC, rowid DESC
           LIMIT ?`,
        )
        .bind(session.userId, limit)
        .all<Record<string, unknown>>(),
      db
        .prepare('SELECT COUNT(*) AS n FROM user_notifications WHERE user_id = ? AND is_read = 0')
        .bind(session.userId)
        .first<{ n: number }>(),
    ]);

    const notifications = (rows.results ?? []).map(row => ({
      id: String(row.id),
      type: String(row.type ?? ''),
      severity: SEVERITIES.has(String(row.severity)) ? String(row.severity) : 'info',
      title: String(row.title ?? ''),
      message: String(row.message ?? ''),
      link: safeLink(row.link),
      isRead: Number(row.is_read) === 1,
      createdAt: String(row.created_at ?? ''),
    }));

    return ok({ notifications, unreadCount: Number(unread?.n ?? 0) });
  } catch (error) {
    console.error('Failed to list notifications:', error);
    return fail('تعذر تحميل الإشعارات', 500);
  }
};
