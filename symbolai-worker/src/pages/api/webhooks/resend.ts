import type { APIRoute } from 'astro';

/**
 * Resend Webhook Handler
 * Tracks email delivery status: delivered, bounced, complained
 *
 * Setup in Resend Dashboard:
 * 1. Go to Settings → Webhooks
 * 2. Add endpoint: https://symbolai.net/api/webhooks/resend
 * 3. Select events: email.delivered, email.bounced, email.complained
 * 4. Copy webhook secret to wrangler.toml
 */

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json() as any;

    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('svix-signature');
    const webhookSecret = locals.runtime.env.RESEND_WEBHOOK_SECRET;

    // TODO: Implement signature verification
    // For now, we'll trust the webhook

    const { type, data } = body;

    // Extract message ID
    const messageId = data?.email_id || data?.id;

    if (!messageId) {
      console.error('No message ID in webhook payload');
      return new Response(
        JSON.stringify({ success: false, error: 'No message ID' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find email log by Resend message ID
    const emailLog = await locals.runtime.env.DB.prepare(`
      SELECT id
      FROM email_logs
      WHERE resend_message_id = ?
    `).bind(messageId).first();

    if (!emailLog) {
      console.log(`Email log not found for message ID: ${messageId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Email log not found (may be external)' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update delivery status based on event type
    let deliveryStatus = '';
    let deliveredAt: string | null = null;

    switch (type) {
      case 'email.delivered':
      case 'email.delivery_delayed':
        deliveryStatus = 'delivered';
        deliveredAt = new Date().toISOString();
        break;

      case 'email.bounced':
        deliveryStatus = 'bounced';
        break;

      case 'email.complained':
        deliveryStatus = 'complained';
        break;

      default:
        console.log(`Unknown event type: ${type}`);
        return new Response(
          JSON.stringify({ success: true, message: 'Event type not tracked' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Update email log
    if (deliveredAt) {
      await locals.runtime.env.DB.prepare(`
        UPDATE email_logs
        SET delivery_status = ?, delivered_at = ?
        WHERE id = ?
      `).bind(deliveryStatus, deliveredAt, emailLog.id).run();
    } else {
      await locals.runtime.env.DB.prepare(`
        UPDATE email_logs
        SET delivery_status = ?
        WHERE id = ?
      `).bind(deliveryStatus, emailLog.id).run();
    }

    console.log(`Updated email ${emailLog.id} status to ${deliveryStatus}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Resend webhook error:', error);
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
