/**
 * Get Build Logs via MCP
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { createAuthenticatedMCPClient } from '@/lib/mcp-client';

export const GET: APIRoute = async ({ request, url, locals }) => {
  try {
    const authResult = await requireAdminRole(
      locals.runtime.env.SESSIONS,
      locals.runtime.env.DB,
      request
    );

    if (authResult instanceof Response) return authResult;

    const buildId = url.searchParams.get('id');

    if (!buildId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    const logs = await mcpClient.getBuildLogs(buildId);

    return new Response(
      JSON.stringify({
        success: true,
        buildId,
        logs,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('MCP build logs error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to get build logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
