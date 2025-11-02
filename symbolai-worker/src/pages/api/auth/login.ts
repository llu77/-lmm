import type { APIRoute } from 'astro';
import { createSession, createSessionCookie } from '@/lib/session';
import { loadUserPermissions, logAudit, getClientIP } from '@/lib/permissions';
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter';
import { verifyPassword, isOldPasswordFormat, hashPasswordSHA256Legacy, hashPassword } from '@/lib/password';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // تطبيق Rate Limiting للحماية من Brute Force
    const rateLimitResponse = await rateLimitMiddleware(
      request,
      locals.runtime.env.KV || locals.runtime.env.SESSIONS,
      RATE_LIMIT_PRESETS.auth
    );

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'اسم المستخدم وكلمة المرور مطلوبة' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user from database by username only
    const user = await locals.runtime.env.DB.prepare(`
      SELECT id, username, password, email, full_name, role_id, branch_id, is_active
      FROM users_new
      WHERE username = ?
    `).bind(username).first();

    if (!user) {
      // Log failed attempt - username doesn't exist
      await logFailedLogin(locals.runtime.env.KV, username, getClientIP(request), 'user_not_found');

      return new Response(JSON.stringify({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const storedPasswordHash = user.password as string;
    let isValidPassword = false;
    let needsMigration = false;

    // Check if password uses old SHA-256 format
    if (isOldPasswordFormat(storedPasswordHash)) {
      // Legacy password - verify using old method
      const oldHash = await hashPasswordSHA256Legacy(password);
      isValidPassword = oldHash === storedPasswordHash;
      needsMigration = isValidPassword; // Migrate if password is correct
    } else {
      // New PBKDF2 format - verify using secure method
      isValidPassword = await verifyPassword(password, storedPasswordHash);
    }

    if (!isValidPassword) {
      // Log failed attempt - wrong password
      await logFailedLogin(locals.runtime.env.KV, username, getClientIP(request), 'wrong_password');

      return new Response(JSON.stringify({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Migrate password to new format if needed (transparent upgrade)
    if (needsMigration) {
      try {
        const newHash = await hashPassword(password);
        await locals.runtime.env.DB.prepare(`
          UPDATE users_new SET password = ? WHERE id = ?
        `).bind(newHash, user.id).run();
        console.log(`Password migrated for user: ${username}`);
      } catch (migrationError) {
        // Log but don't fail login if migration fails
        console.error('Password migration failed:', migrationError);
      }
    }

    // Check if user is active
    if (!user.is_active) {
      return new Response(JSON.stringify({ error: 'الحساب غير نشط - يرجى التواصل مع الإدارة' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Load user permissions
    const permissions = await loadUserPermissions(locals.runtime.env.DB, user.id as string);

    if (!permissions) {
      return new Response(JSON.stringify({ error: 'فشل تحميل صلاحيات المستخدم' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create session with enhanced data (with session rotation for security)
    const token = await createSession(
      locals.runtime.env.SESSIONS,
      user.id as string,
      user.username as string,
      permissions.roleName
    );

    // Log successful login
    await logAudit(
      locals.runtime.env.DB,
      {
        userId: user.id as string,
        username: user.username as string,
        permissions,
        branchId: user.branch_id as string | null
      } as any,
      'view',
      'auth',
      'login',
      { username, migrated: needsMigration },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    // Also store permissions and branch info in session
    await locals.runtime.env.SESSIONS.put(
      `session:${token}:permissions`,
      JSON.stringify({
        branchId: user.branch_id,
        branchName: permissions.branchName,
        branchNameAr: permissions.branchName,
        permissions
      }),
      {
        expirationTtl: 7 * 24 * 60 * 60 // 7 days
      }
    );

    // Return success with session cookie
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          role: permissions.roleName,
          roleAr: permissions.roleNameAr,
          branchId: user.branch_id,
          branchName: permissions.branchName,
          permissions: {
            // System permissions
            canViewAllBranches: permissions.canViewAllBranches,
            canManageUsers: permissions.canManageUsers,
            canManageSettings: permissions.canManageSettings,
            canManageBranches: permissions.canManageBranches,
            // Branch permissions
            canAddRevenue: permissions.canAddRevenue,
            canAddExpense: permissions.canAddExpense,
            canViewReports: permissions.canViewReports,
            canManageEmployees: permissions.canManageEmployees,
            canManageOrders: permissions.canManageOrders,
            canManageRequests: permissions.canManageRequests,
            canApproveRequests: permissions.canApproveRequests,
            canGeneratePayroll: permissions.canGeneratePayroll,
            canManageBonus: permissions.canManageBonus,
            // Employee permissions
            canSubmitRequests: permissions.canSubmitRequests,
            canViewOwnRequests: permissions.canViewOwnRequests,
            canViewOwnBonus: permissions.canViewOwnBonus
          }
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createSessionCookie(token)
        }
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء تسجيل الدخول' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

/**
 * Log failed login attempts for security monitoring
 */
async function logFailedLogin(
  kv: any,
  username: string,
  ip: string,
  reason: string
): Promise<void> {
  try {
    const key = `failed_login:${username}:${Date.now()}`;
    await kv.put(
      key,
      JSON.stringify({
        username,
        ip,
        reason,
        timestamp: Date.now()
      }),
      { expirationTtl: 86400 } // 24 hours
    );

    // Check total failures in last hour
    const listResult = await kv.list({ prefix: `failed_login:${username}:` });
    const recentFailures = listResult.keys.filter((k: any) => {
      const timestamp = parseInt(k.name.split(':')[2]);
      return Date.now() - timestamp < 3600000; // 1 hour
    });

    if (recentFailures.length >= 5) {
      console.warn(`Security Alert: ${recentFailures.length} failed login attempts for ${username} from ${ip}`);
      // TODO: Send security alert email to admin
    }
  } catch (error) {
    // Don't fail login if logging fails
    console.error('Failed to log failed login:', error);
  }
}
