// In-app notifications for finance events (request decisions, bonus
// approvals, payroll approval, vouchers awaiting approval). Notifications are
// fanned out to one row per recipient so read state is per user. Server-only.

import type { D1Database } from '@cloudflare/workers-types';
import { newId } from './http';

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  severity?: 'info' | 'success' | 'warning' | 'critical';
  link?: string | null;
  /** Used for de-duplication: one notification per (type, related entity, user). */
  relatedEntity?: string | null;
  branchId?: string | null;
}

type RoleFlag =
  | 'can_approve_requests'
  | 'can_generate_payroll'
  | 'can_manage_bonus'
  | 'can_manage_requests'
  | 'can_manage_settings'
  | 'can_view_own_bonus';

/**
 * Active users who hold `flag` and can see `branchId` (their own branch, or all
 * branches). Pass `includeAllBranchUsers: false` to skip admins of other branches.
 */
export async function findRecipients(
  db: D1Database,
  branchId: string | null,
  flag: RoleFlag,
  options: { includeAllBranchUsers?: boolean } = {},
): Promise<string[]> {
  const includeAll = options.includeAllBranchUsers !== false;
  const branchClause = branchId
    ? includeAll
      ? '(u.branch_id = ? OR r.can_view_all_branches = 1)'
      : 'u.branch_id = ?'
    : 'r.can_view_all_branches = 1';
  const sql = `SELECT u.id FROM users_new u JOIN roles r ON r.id = u.role_id
               WHERE u.is_active = 1 AND r.${flag} = 1 AND ${branchClause}`;
  try {
    const stmt = db.prepare(sql);
    const result = await (branchId ? stmt.bind(branchId) : stmt).all<{ id: string }>();
    return (result.results ?? []).map(r => r.id);
  } catch (error) {
    console.error('findRecipients failed:', error);
    return [];
  }
}

/** Inserts one notification per user. Never throws: notifications must not break the main action. */
export async function notifyUsers(db: D1Database, userIds: string[], payload: NotificationPayload): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;
  try {
    await db.batch(
      unique.map(userId =>
        db
          .prepare(
            `INSERT OR IGNORE INTO user_notifications
               (id, branch_id, user_id, audience, type, severity, title, message, link, related_entity)
             VALUES (?, ?, ?, 'user', ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            newId('ntf'),
            payload.branchId ?? null,
            userId,
            payload.type,
            payload.severity ?? 'info',
            payload.title.slice(0, 200),
            payload.message.slice(0, 1000),
            payload.link ?? null,
            payload.relatedEntity ?? null,
          ),
      ),
    );
  } catch (error) {
    console.error('notifyUsers failed:', error);
  }
}

export async function notifyByPermission(
  db: D1Database,
  branchId: string | null,
  flag: RoleFlag,
  payload: NotificationPayload,
  options: { excludeUserId?: string; includeAllBranchUsers?: boolean } = {},
): Promise<void> {
  const recipients = (await findRecipients(db, branchId, flag, options)).filter(id => id !== options.excludeUserId);
  await notifyUsers(db, recipients, { ...payload, branchId: payload.branchId ?? branchId });
}
