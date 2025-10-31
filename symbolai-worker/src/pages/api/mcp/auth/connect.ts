/**
 * MCP OAuth Connection Initiation
 *
 * This endpoint initiates the OAuth flow for connecting to Cloudflare MCP servers.
 * Admin-only access.
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Verify admin authentication
    const authResult = await requireAdminRole(
      locals.runtime.env.SESSIONS,
      locals.runtime.env.DB,
      request
    );

    if (authResult instanceof Response) {
      return authResult;
    }

    // 2. Generate OAuth state for CSRF protection
    const state = crypto.randomUUID();
    const stateKey = `mcp_oauth_state:${authResult.userId}`;

    // Store state in KV for 10 minutes
    await locals.runtime.env.SESSIONS.put(
      stateKey,
      JSON.stringify({
        userId: authResult.userId,
        createdAt: Date.now(),
      }),
      { expirationTtl: 600 }
    );

    // 3. Construct OAuth authorization URL
    // Note: Cloudflare MCP uses OAuth 2.0 with PKCE
    // The actual authorization URL would be provided by Cloudflare
    // For now, we return instructions for manual API token setup

    return new Response(
      JSON.stringify({
        success: true,
        message: 'MCP authentication setup required',
        instructions: {
          step1: 'Go to Cloudflare Dashboard: https://dash.cloudflare.com/profile/api-tokens',
          step2: 'Create an API Token with the following permissions:',
          permissions: [
            'Account Settings: Read',
            'Workers Scripts: Read, Edit',
            'Workers KV Storage: Read, Edit',
            'Workers R2 Storage: Read, Edit',
            'D1: Read, Edit',
          ],
          step3: 'Copy the API token and send it to /api/mcp/auth/callback',
        },
        state,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('MCP connect error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to initiate MCP connection',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
