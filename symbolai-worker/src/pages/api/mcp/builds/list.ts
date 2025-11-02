/**
 * List Worker Builds via MCP
 */

import type { APIRoute } from 'astro';
import { requireAdminRole } from '@/lib/permissions';
import { createAuthenticatedMCPClient, formatBuildStatus } from '@/lib/mcp-client';

export const GET: APIRoute = async ({ request, url, locals }) => {
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

    // Get limit from query params (default 10)
    const rawLimit = parseInt(url.searchParams.get('limit') || '10', 10);
    const limit = Math.max(1, Math.min(rawLimit, 100)); // Clamp between 1-100

    const rawWorkerName = url.searchParams.get('worker') || 'symbolai-worker';
    // Validate worker name: alphanumeric, hyphens, underscores only
    const workerName = /^[a-zA-Z0-9_-]+$/.test(rawWorkerName)
      ? rawWorkerName
      : 'symbolai-worker';

    // Set active worker
    await mcpClient.setActiveWorker(workerName);

    // List builds
    const builds = await mcpClient.listBuilds(limit);

    // Format builds with status summary
    const formattedBuilds = builds.map(build => ({
      ...build,
      statusSummary: formatBuildStatus(build),
    }));

    // Calculate success rate
    const successCount = builds.filter(b => b.status === 'success').length;
    const successRate = builds.length > 0 ? (successCount / builds.length * 100).toFixed(1) : '0';

    return new Response(
      JSON.stringify({
        success: true,
        builds: formattedBuilds,
        count: builds.length,
        stats: {
          total: builds.length,
          successful: successCount,
          failed: builds.filter(b => b.status === 'failure').length,
          successRate: `${successRate}%`,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('MCP builds list error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to list builds',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
