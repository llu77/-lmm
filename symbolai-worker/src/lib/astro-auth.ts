/**
 * Authentication helpers for Astro pages
 * Provides reusable authentication and permission checking for .astro files
 */

import type { AstroGlobal } from 'astro';
import type { UserPermissions } from './permissions';
import { getSession } from './session';
import { loadUserPermissions } from './permissions';

export interface AuthenticatedPageData {
  userId: string;
  username: string;
  permissions: UserPermissions;
}

/**
 * Authenticate user for Astro page
 * Returns user data or a redirect/error Response
 */
export async function authenticateAstroPage(
  Astro: AstroGlobal
): Promise<AuthenticatedPageData | Response> {
  const sessionCookie = Astro.cookies.get('session')?.value;

  if (!sessionCookie) {
    return Astro.redirect('/auth/login');
  }

  const session = await getSession(Astro.locals.runtime.env.SESSIONS, sessionCookie);

  if (!session) {
    return Astro.redirect('/auth/login');
  }

  const permissions = await loadUserPermissions(Astro.locals.runtime.env.DB, session.userId);

  if (!permissions) {
    return new Response('المستخدم غير موجود أو غير نشط', { status: 403 });
  }

  return {
    userId: session.userId,
    username: session.username,
    permissions
  };
}

/**
 * Require specific permission for Astro page
 */
export function requirePermission(
  authData: AuthenticatedPageData,
  permission: keyof Omit<UserPermissions, 'userId' | 'username' | 'roleId' | 'roleName' | 'roleNameAr' | 'branchId' | 'branchName'>
): Response | null {
  if (!authData.permissions[permission]) {
    return new Response(`ليس لديك صلاحية لعرض هذه الصفحة (${permission})`, { status: 403 });
  }
  return null;
}

/**
 * Require branch assignment
 */
export function requireBranch(authData: AuthenticatedPageData): Response | null {
  if (!authData.permissions.branchId) {
    return new Response('يجب أن يكون لديك فرع معين للوصول إلى هذه الصفحة', { status: 403 });
  }
  return null;
}

/**
 * Require admin role
 */
export function requireAdmin(authData: AuthenticatedPageData): Response | null {
  if (authData.permissions.roleName !== 'admin') {
    return new Response('هذه الصفحة مخصصة للمشرفين فقط', { status: 403 });
  }
  return null;
}
