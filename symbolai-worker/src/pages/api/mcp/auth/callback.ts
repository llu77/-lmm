/**
 * MCP OAuth Callback / Token Storage
 *
 * This endpoint handles the OAuth callback and stores the API token securely.
 * Admin-only access.
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { storeMCPToken, MCPClient } from '@/lib/mcp-client';

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

    // 2. Parse request body
    const body = await request.json();
    const { apiToken, accountId, state } = body;

    if (!apiToken || !accountId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: apiToken and accountId',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 2.5. Validate input formats
    // API token should be a reasonable length string (Cloudflare tokens are typically 40+ chars)
    if (typeof apiToken !== 'string' || apiToken.length < 10 || apiToken.length > 500) {
      return new Response(
        JSON.stringify({
          error: 'Invalid API token format',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Account ID should be a hex string (32 chars)
    if (!/^[a-f0-9]{32}$/i.test(accountId)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid account ID format (expected 32-character hex string)',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 3. Verify OAuth state (CSRF protection)
    if (state) {
      const stateKey = `mcp_oauth_state:${authResult.userId}`;
      const storedState = await locals.runtime.env.SESSIONS.get(stateKey);

      if (!storedState) {
        return new Response(
          JSON.stringify({
            error: 'Invalid or expired OAuth state',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Clean up state
      await locals.runtime.env.SESSIONS.delete(stateKey);
    }

    // 4. Test the API token by making a simple request
    const testClient = new MCPClient({ apiToken, accountId });

    try {
      // Try to list accounts to verify token
      await testClient.listAccounts();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid API token or insufficient permissions',
          details: error instanceof Error ? error.message : 'Token validation failed',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 5. Store token in KV
    await storeMCPToken(locals.runtime.env.SESSIONS, authResult.userId, {
      accessToken: apiToken,
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year (API tokens don't expire unless revoked)
      accountId,
    });

    // 6. Set active account
    await testClient.setActiveAccount(accountId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'MCP authentication successful',
        accountId,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('MCP callback error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to complete MCP authentication',
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
