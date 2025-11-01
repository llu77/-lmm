import type { APIRoute } from 'astro';
import { requireAdminRole, logAudit, getClientIP } from '@/lib/permissions';
import { generateId } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/password';

export const POST: APIRoute = async ({ request, locals }) => {
  // Only admin can create users
  const authResult = await requireAdminRole(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const {
      username,
      password,
      email,
      full_name,
      phone,
      role_id,
      branch_id
    } = await request.json();

    // Validation
    if (!username || !password || !role_id) {
      return new Response(
        JSON.stringify({ error: 'اسم المستخدم وكلمة المرور والدور مطلوبة' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({
          error: 'كلمة المرور ضعيفة',
          details: passwordValidation.errors,
          score: passwordValidation.score
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if username already exists
    const existing = await locals.runtime.env.DB.prepare(
      `SELECT id FROM users_new WHERE username = ?`
    ).bind(username).first();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'اسم المستخدم موجود بالفعل' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate role exists
    const roleExists = await locals.runtime.env.DB.prepare(
      `SELECT id FROM roles WHERE id = ?`
    ).bind(role_id).first();

    if (!roleExists) {
      return new Response(
        JSON.stringify({ error: 'الدور غير موجود' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate branch if provided
    if (branch_id) {
      const branchExists = await locals.runtime.env.DB.prepare(
        `SELECT id FROM branches WHERE id = ?`
      ).bind(branch_id).first();

      if (!branchExists) {
        return new Response(
          JSON.stringify({ error: 'الفرع غير موجود' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Hash password using secure PBKDF2 with 100k iterations
    const hashedPassword = await hashPassword(password);

    // Create user
    const userId = generateId();
    await locals.runtime.env.DB.prepare(`
      INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      userId,
      username,
      hashedPassword,
      email || null,
      full_name || null,
      phone || null,
      role_id,
      branch_id || null
    ).run();

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'user',
      userId,
      { username, email, full_name, role_id, branch_id },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          username,
          email,
          full_name,
          phone,
          role_id,
          branch_id
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Create user error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء إنشاء المستخدم' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
