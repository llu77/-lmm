/**
 * List R2 Buckets via MCP
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { createAuthenticatedMCPClient } from '@/lib/mcp-client';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const authResult = await requireAdminRole(
      locals.runtime.env.SESSIONS,
      locals.runtime.env.DB,
      request
    );

    if (authResult instanceof Response) return authResult;

    const mcpClient = await createAuthenticatedMCPClient(
      locals.runtime.env.SESSIONS,
      authResult.userId
    );

    if (!mcpClient) {
      return new Response(
        JSON.stringify({ error: 'MCP not connected' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const buckets = await mcpClient.listR2Buckets();

    return new Response(
      JSON.stringify({
        success: true,
        buckets,
        count: buckets.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('MCP R2 list error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to list R2 buckets',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
