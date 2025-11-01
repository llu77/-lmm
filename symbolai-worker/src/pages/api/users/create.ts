import type { APIRoute } from 'astro';
import { requireAdminRole, logAudit, getClientIP } from '@/lib/permissions';
import { generateId } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/password';
import { rateLimitMiddleware, RATE_LIMIT_PRESETS } from '@/lib/rate-limiter';
import { validateInput, createUserSchema } from '@/lib/validation-schemas';

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

  // Rate limiting
  const rateLimitResponse = await rateLimitMiddleware(
    request,
    locals.runtime.env.KV || locals.runtime.env.SESSIONS,
    RATE_LIMIT_PRESETS.admin_operations
  );
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();

    // Validate input
    const validationResult = validateInput(createUserSchema, body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'خطأ في البيانات المدخلة',
          details: validationResult.error
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const validatedData = validationResult.data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(validatedData.password);
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
    ).bind(validatedData.username).first();

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
    ).bind(validatedData.role_id).first();

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
    if (validatedData.branch_id) {
      const branchExists = await locals.runtime.env.DB.prepare(
        `SELECT id FROM branches WHERE id = ?`
      ).bind(validatedData.branch_id).first();

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
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user
    const userId = generateId();
    await locals.runtime.env.DB.prepare(`
      INSERT INTO users_new (id, username, password, email, full_name, phone, role_id, branch_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      userId,
      validatedData.username,
      hashedPassword,
      validatedData.email || null,
      validatedData.full_name || null,
      validatedData.phone || null,
      validatedData.role_id,
      validatedData.branch_id || null
    ).run();

    // Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'create',
      'user',
      userId,
      { username: validatedData.username, email: validatedData.email, full_name: validatedData.full_name, role_id: validatedData.role_id, branch_id: validatedData.branch_id },
      getClientIP(request),
      request.headers.get('User-Agent') || undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          username: validatedData.username,
          email: validatedData.email,
          full_name: validatedData.full_name,
          phone: validatedData.phone,
          role_id: validatedData.role_id,
          branch_id: validatedData.branch_id
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
