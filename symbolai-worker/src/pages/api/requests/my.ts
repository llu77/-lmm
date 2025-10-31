import type { APIRoute } from 'astro';
import { requireAuth } from '@/lib/session';
import { employeeRequestQueries } from '@/lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  // Check authentication
  const authResult = await requireAuth(locals.runtime.env.SESSIONS, request);
  if (authResult instanceof Response) {
    return authResult;
  }

  const session = authResult;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status'); // optional filter

    const result = await employeeRequestQueries.getByUser(
      locals.runtime.env.DB,
      session.userId
    );

    let requests = result.results || [];

    // Filter by status if provided
    if (status && status !== 'all') {
      requests = requests.filter((r: any) => r.status === status);
    }

    return new Response(
      JSON.stringify({
        success: true,
        requests,
        count: requests.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get my requests error:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء جلب البيانات' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
