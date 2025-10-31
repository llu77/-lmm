import type { APIRoute } from 'astro';
import { requireAuthWithPermissions } from '@/lib/permissions';

export const GET: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const authResult = await requireAuthWithPermissions(
    locals.runtime.env.SESSIONS,
    locals.runtime.env.DB,
    request
  );

  if (authResult instanceof Response) {
    return authResult;
  }

  // Only admins and supervisors can list users
  if (!authResult.permissions.canManageUsers && !authResult.permissions.canManageEmployees) {
    return new Response(
      JSON.stringify({ error: 'صلاحيات غير كافية' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const url = new URL(request.url);
    const branchId = url.searchParams.get('branchId');
    const roleId = url.searchParams.get('roleId');

    let query = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.phone,
        u.is_active,
        u.role_id,
        r.name as role_name,
        r.name_ar as role_name_ar,
        u.branch_id,
        b.name as branch_name,
        b.name_ar as branch_name_ar,
        u.created_at
      FROM users_new u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Branch filtering
    if (branchId) {
      query += ` AND u.branch_id = ?`;
      params.push(branchId);
    } else if (!authResult.permissions.canViewAllBranches && authResult.branchId) {
      // Supervisors can only see users in their branch
      query += ` AND u.branch_id = ?`;
      params.push(authResult.branchId);
    }

    // Role filtering
    if (roleId) {
      query += ` AND u.role_id = ?`;
      params.push(roleId);
    }

    query += ` ORDER BY u.created_at DESC`;

    const stmt = locals.runtime.env.DB.prepare(query);
    const result = await (params.length > 0 ? stmt.bind(...params) : stmt).all();

    // Remove password from results
    const users = (result.results || []).map((user: any) => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return new Response(
      JSON.stringify({
        success: true,
        users
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('List users error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب المستخدمين' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
