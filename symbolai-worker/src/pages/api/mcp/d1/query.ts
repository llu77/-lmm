/**
 * Execute D1 Query via MCP
 *
 * Execute a SQL query on a D1 database.
 * Admin-only access with SQL validation.
 */

import type { APIRoute } from 'astro';
import { requireAdminRole, logAudit } from '@/lib/permissions';
import { createAuthenticatedMCPClient, validateSQL, formatD1Results } from '@/lib/mcp-client';

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
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
    const { databaseId, sql, params, format = 'json' } = body;

    if (!databaseId || !sql) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: databaseId and sql',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 2.5. Validate database ID format (UUID)
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(databaseId)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid database ID format (expected UUID)',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 3. Validate SQL query
    const validation = validateSQL(sql);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid SQL query',
          details: validation.error,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 4. Create authenticated MCP client
    const mcpClient = await createAuthenticatedMCPClient(
      locals.runtime.env.SESSIONS,
      authResult.userId
    );

    if (!mcpClient) {
      return new Response(
        JSON.stringify({
          error: 'MCP not connected',
          message: 'Please connect to Cloudflare MCP first',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 5. Execute query
    const startTime = Date.now();
    const result = await mcpClient.queryD1Database(databaseId, sql, params);
    const executionTime = Date.now() - startTime;

    // 6. Log audit
    await logAudit(
      locals.runtime.env.DB,
      authResult,
      'execute',
      'd1_query',
      databaseId,
      {
        sql: sql.substring(0, 200), // Log first 200 chars
        rowCount: result.results.length,
        executionTime,
      },
      clientAddress || 'unknown'
    );

    // 7. Format response based on requested format
    let formattedResult;
    if (format === 'table') {
      formattedResult = formatD1Results(result);
    } else {
      formattedResult = result.results;
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: formattedResult,
        meta: {
          ...result.meta,
          executionTime,
          rowCount: result.results.length,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('MCP D1 query error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to execute D1 query',
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
