import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/session';
import { sendEmail, sendTemplateEmail } from '@/lib/email';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check admin authentication
  const authResult = await requireAdmin(locals.runtime.env.SESSIONS, request);
  if (authResult instanceof Response) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { username } = authResult;

    // Check if using template or raw email
    if (body.templateId) {
      // Send using template
      const result = await sendTemplateEmail(locals.runtime.env, {
        to: body.to,
        cc: body.cc,
        templateId: body.templateId,
        variables: body.variables || {},
        priority: body.priority || 'medium',
        triggerType: 'manual_send',
        userId: username,
        relatedEntityId: body.relatedEntityId
      });

      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      // Send raw email
      const result = await sendEmail(locals.runtime.env, {
        to: body.to,
        cc: body.cc,
        subject: body.subject,
        html: body.html,
        text: body.text,
        attachments: body.attachments,
        priority: body.priority || 'medium',
        triggerType: 'manual_send',
        userId: username,
        relatedEntityId: body.relatedEntityId
      });

      return new Response(
        JSON.stringify(result),
        {
          status: result.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Send email API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
