/**
 * Login API Endpoint - Enhanced with Argon2id Support
 *
 * Security Features:
 * - Argon2id password hashing (secure)
 * - Backward compatibility with legacy SHA-256 hashes
 * - Automatic password re-hashing on login
 * - Password strength validation
 * - Rate limiting ready (to be added)
 *
 * @version 2.0 - Enhanced Security
 * @date 2025-11-20
 */

import type { APIRoute } from 'astro';
import { createSession, createSessionCookie } from '@/lib/session';
import { loadUserPermissions } from '@/lib/permissions';
import {
  verifyPassword,
  verifyLegacySHA256,
  needsRehash,
  hashPassword,
} from '@/lib/password';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check if runtime bindings are available
    if (!locals.runtime?.env?.DB || !locals.runtime?.env?.SESSIONS) {
      console.error('Runtime bindings not available:', {
        hasRuntime: !!locals.runtime,
        hasDB: !!locals.runtime?.env?.DB,
        hasSESSIONS: !!locals.runtime?.env?.SESSIONS,
      });
      return new Response(
        JSON.stringify({ error: 'خطأ في تهيئة النظام - يرجى المحاولة لاحقاً' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { username, password } = await request.json();

    // Validation
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'اسم المستخدم وكلمة المرور مطلوبة' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user from database (no longer filtering by password)
    const user = await locals.runtime.env.DB.prepare(`
      SELECT id, username, password, email, full_name, role_id, branch_id, is_active
      FROM users_new
      WHERE username = ?
    `)
      .bind(username)
      .first();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const storedHash = user.password as string;

    // =====================================================
    // Password Verification with Migration Support
    // =====================================================

    let passwordValid = false;
    let shouldRehash = false;

    // Check if this is a legacy SHA-256 hash
    if (needsRehash(storedHash)) {
      console.log(`🔄 Legacy SHA-256 hash detected for user: ${username}`);

      // Verify with legacy method
      passwordValid = await verifyLegacySHA256(password, storedHash);
      shouldRehash = true;
    } else {
      // Modern Argon2id verification
      passwordValid = await verifyPassword(password, storedHash);
    }

    // If password verification failed
    if (!passwordValid) {
      return new Response(
        JSON.stringify({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // Automatic Password Re-hashing (Migration)
    // =====================================================

    if (shouldRehash) {
      try {
        console.log(`🔐 Re-hashing password for user: ${username}`);

        // Hash with Argon2id
        const newHash = await hashPassword(password);

        // Update in database
        await locals.runtime.env.DB.prepare(`
          UPDATE users_new
          SET password = ?, updated_at = datetime('now')
          WHERE id = ?
        `)
          .bind(newHash, user.id)
          .run();

        console.log(`✅ Password successfully re-hashed for user: ${username}`);
      } catch (rehashError) {
        // Log error but don't fail login
        console.error('Password re-hashing error:', rehashError);
        // User can still login, will retry next time
      }
    }

    // =====================================================
    // Check User Status
    // =====================================================

    if (!user.is_active) {
      return new Response(
        JSON.stringify({
          error: 'الحساب غير نشط - يرجى التواصل مع الإدارة',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // Load User Permissions
    // =====================================================

    const permissions = await loadUserPermissions(
      locals.runtime.env.DB,
      user.id as string
    );

    if (!permissions) {
      return new Response(
        JSON.stringify({ error: 'فشل تحميل صلاحيات المستخدم' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // =====================================================
    // Create Session
    // =====================================================

    const token = await createSession(
      locals.runtime.env.SESSIONS,
      user.id as string,
      user.username as string,
      permissions.roleName
    );

    // Store permissions and branch info in session
    await locals.runtime.env.SESSIONS.put(
      `session:${token}:permissions`,
      JSON.stringify({
        branchId: user.branch_id,
        branchName: permissions.branchName,
        branchNameAr: permissions.branchName,
        permissions,
      }),
      {
        expirationTtl: 7 * 24 * 60 * 60, // 7 days
      }
    );

    // =====================================================
    // Return Success Response
    // =====================================================

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
            canViewOwnBonus: permissions.canViewOwnBonus,
          },
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': createSessionCookie(token),
        },
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء تسجيل الدخول' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
