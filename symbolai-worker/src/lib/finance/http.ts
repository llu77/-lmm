// Server-side helpers shared by the finance API routes (payroll, adjustments,
// requests, bonus, vouchers, settings): JSON responses, auth + permission
// checks, branch resolution and lazy schema provisioning.

import type { APIContext } from 'astro';
import type { D1Database } from '@cloudflare/workers-types';
import {
  requireAuthWithPermissions,
  canAccessBranch,
  type EnhancedSession,
  type UserPermissions,
} from '@/lib/permissions';
import { ensureFinanceSchema } from './schema';

export type PermissionFlag = keyof Omit<
  UserPermissions,
  'userId' | 'username' | 'roleId' | 'roleName' | 'roleNameAr' | 'branchId' | 'branchName'
>;

export interface FinanceActor {
  id: string;
  username: string;
  /** Full name when the user has one, else the username — used on printed documents. */
  displayName: string;
  roleName: string;
  roleNameAr: string;
}

export interface FinanceContext {
  session: EnhancedSession;
  db: D1Database;
  actor: FinanceActor;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function ok(data: Record<string, unknown> = {}, status = 200): Response {
  return json({ success: true, ...data }, status);
}

export function fail(error: string, status = 400, extra: Record<string, unknown> = {}): Response {
  return json({ success: false, error, ...extra }, status);
}

/** Parses a JSON object body; returns null for invalid JSON or non-objects. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function str(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).trim().slice(0, maxLength);
}

export function optStr(value: unknown, maxLength = 500): string | null {
  const s = str(value, maxLength);
  return s ? s : null;
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Who may approve payroll runs and vouchers (and thereby apply the manager's
 * signature and company stamp): the admin role — the general manager.
 */
export function canApproveFinance(session: EnhancedSession): boolean {
  return session.permissions.roleName === 'admin' || session.permissions.canManageSettings === true;
}

/**
 * Authenticates the request, enforces that the user holds at least one of
 * `anyOf` (if given) and makes sure the finance tables exist.
 */
export async function financeAuth(
  context: Pick<APIContext, 'request' | 'locals'>,
  anyOf: PermissionFlag[] = [],
): Promise<FinanceContext | Response> {
  const env = context.locals.runtime?.env;
  if (!env?.DB || !env?.SESSIONS) return fail('الخدمة غير متاحة حالياً', 503);

  const session = await requireAuthWithPermissions(env.SESSIONS, env.DB, context.request);
  if (session instanceof Response) return session;

  if (anyOf.length > 0 && !anyOf.some(flag => session.permissions[flag] === true)) {
    return fail('صلاحيات غير كافية لتنفيذ هذا الإجراء', 403);
  }

  try {
    await ensureFinanceSchema(env.DB);
  } catch (error) {
    console.error('Finance schema provisioning failed:', error);
    return fail('تعذر تهيئة جداول النظام المالي', 500);
  }

  const actor = await loadActor(env.DB, session);
  return { session, db: env.DB, actor };
}

async function loadActor(db: D1Database, session: EnhancedSession): Promise<FinanceActor> {
  let fullName: string | null = null;
  try {
    const row = await db.prepare('SELECT full_name FROM users_new WHERE id = ?').bind(session.userId).first<{ full_name: string | null }>();
    fullName = row?.full_name?.trim() || null;
  } catch {
    // users_new without full_name: fall back to the username
  }
  return {
    id: session.userId,
    username: session.permissions.username,
    displayName: fullName || session.permissions.username,
    roleName: session.permissions.roleName,
    roleNameAr: session.permissions.roleNameAr,
  };
}

/**
 * Resolves which branch a request operates on. Users bound to a branch always
 * get their own branch (a different requested branch is a 403); users who can
 * see all branches must name one.
 */
export function resolveBranchId(session: EnhancedSession, requested: unknown): string | Response {
  const wanted = typeof requested === 'string' ? requested.trim() : '';
  if (wanted) {
    if (!canAccessBranch(session, wanted)) return fail('لا يمكنك الوصول إلى بيانات هذا الفرع', 403);
    return wanted;
  }
  if (session.branchId) return session.branchId;
  return fail('يرجى اختيار الفرع', 400);
}

/** Branch names for display (branches table shape differs between deployments). */
export async function getBranchName(db: D1Database, branchId: string): Promise<string> {
  try {
    const row = await db.prepare('SELECT * FROM branches WHERE id = ?').bind(branchId).first<Record<string, unknown>>();
    const name = row?.name_ar ?? row?.name ?? row?.branch_name;
    return typeof name === 'string' && name ? name : branchId;
  } catch {
    return branchId;
  }
}

/** Collision-resistant id (the legacy generateId uses Math.random). */
export function newId(prefix: string): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function clientIp(request: Request): string | undefined {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || undefined;
}
