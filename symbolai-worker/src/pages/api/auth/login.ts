import type { APIRoute } from 'astro';
import { createSession, createSessionCookie } from '@/lib/session';
import { loadUserPermissions } from '@/lib/permissions';
import {
  verifyPassword,
  migrateSHA256ToBcrypt,
  isBcryptHash
} from '@/lib/password';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
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
      return new Response(JSON.stringify({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify password based on hash type
    let isPasswordValid = false;
    let needsPasswordUpdate = false;
    let newPasswordHash: string | undefined;

    const storedHash = user.password as string;

    if (isBcryptHash(storedHash)) {
      // Modern bcrypt hash - verify directly
      isPasswordValid = await verifyPassword(password, storedHash);
    } else {
      // Legacy SHA-256 hash - verify and migrate
      const migrationResult = await migrateSHA256ToBcrypt(password, storedHash);
      isPasswordValid = migrationResult.isValid;

      if (migrationResult.isValid && migrationResult.newHash) {
        needsPasswordUpdate = true;
        newPasswordHash = migrationResult.newHash;
      }
    }

    if (!isPasswordValid) {
      return new Response(JSON.stringify({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update password hash if migration occurred
    if (needsPasswordUpdate && newPasswordHash) {
      await locals.runtime.env.DB.prepare(`
        UPDATE users_new
        SET password = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newPasswordHash, user.id).run();

      console.log(`Password migrated to bcrypt for user: ${username}`);
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

    // Create session with enhanced data
    const token = await createSession(
      locals.runtime.env.SESSIONS,
      user.id as string,
      user.username as string,
      permissions.roleName
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
