/**
 * MCP OAuth Provider
 *
 * Handles OAuth authentication and authorization for MCP clients.
 * Integrates with SymbolAI's existing authentication system.
 *
 * @see https://developers.cloudflare.com/agents/mcp/oauth
 */

import { OAuthProvider } from 'agents/mcp';
import type { Env } from '../env';
import type { AuthContext } from './cloudflare-mcp';

/**
 * User session from SymbolAI auth
 */
interface UserSession {
  userId: number;
  username: string;
  email: string;
  role_id: number;
  is_active: boolean;
}

/**
 * OAuth client registration
 */
interface OAuthClient {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
  scope: string;
  created_at: number;
}

/**
 * MCP OAuth Authentication Handler
 *
 * This handler integrates with SymbolAI's existing session-based auth
 * and provides OAuth tokens for MCP clients.
 */
export async function handleMCPAuth(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);

  // Handle authorization endpoint
  if (url.pathname.endsWith('/authorize')) {
    return handleAuthorize(request, env);
  }

  // Handle token endpoint
  if (url.pathname.endsWith('/token')) {
    return handleToken(request, env);
  }

  // Handle client registration endpoint
  if (url.pathname.endsWith('/register')) {
    return handleRegister(request, env);
  }

  return new Response('Not Found', { status: 404 });
}

/**
 * Authorization endpoint
 *
 * Validates the user session and generates an authorization code.
 */
async function handleAuthorize(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    const redirectUri = url.searchParams.get('redirect_uri');
    const state = url.searchParams.get('state');
    const scope = url.searchParams.get('scope');

    // Validate required parameters
    if (!clientId || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate client
    const client = await getOAuthClient(env, clientId);
    if (!client) {
      return new Response(
        JSON.stringify({ error: 'unauthorized_client', error_description: 'Invalid client ID' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate redirect URI
    if (!client.redirect_uris.includes(redirectUri)) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Invalid redirect URI' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user session from cookie
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const sessionId = cookies.session;

    if (!sessionId) {
      // Redirect to login page with return URL
      const loginUrl = new URL('/auth/login', url.origin);
      loginUrl.searchParams.set('redirect', url.pathname + url.search);
      return Response.redirect(loginUrl.toString(), 302);
    }

    // Validate session
    const sessionData = await env.SESSIONS.get(`session:${sessionId}`);
    if (!sessionData) {
      const loginUrl = new URL('/auth/login', url.origin);
      loginUrl.searchParams.set('redirect', url.pathname + url.search);
      return Response.redirect(loginUrl.toString(), 302);
    }

    const session = JSON.parse(sessionData);
    if (session.expiresAt < Date.now()) {
      await env.SESSIONS.delete(`session:${sessionId}`);
      const loginUrl = new URL('/auth/login', url.origin);
      loginUrl.searchParams.set('redirect', url.pathname + url.search);
      return Response.redirect(loginUrl.toString(), 302);
    }

    // Get user details
    const user = await env.DB.prepare(
      'SELECT id, username, email, role_id, is_active FROM users_new WHERE id = ?'
    ).bind(session.userId).first<UserSession>();

    if (!user || !user.is_active) {
      return new Response(
        JSON.stringify({ error: 'access_denied', error_description: 'User not authorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate authorization code
    const authCode = crypto.randomUUID();
    const codeData = {
      clientId,
      userId: user.id,
      username: user.username,
      email: user.email,
      redirectUri,
      scope: scope || 'mcp:read mcp:write',
      createdAt: Date.now(),
    };

    // Store authorization code (valid for 10 minutes)
    await env.SESSIONS.put(
      `oauth_code:${authCode}`,
      JSON.stringify(codeData),
      { expirationTtl: 600 }
    );

    // Redirect back to client with authorization code
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) redirectUrl.searchParams.set('state', state);

    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    console.error('OAuth authorize error:', error);
    return new Response(
      JSON.stringify({ error: 'server_error', error_description: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Token endpoint
 *
 * Exchanges authorization code for access token.
 */
async function handleToken(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const contentType = request.headers.get('Content-Type') || '';
    let params: URLSearchParams;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const body = await request.text();
      params = new URLSearchParams(body);
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      params = new URLSearchParams(body);
    } else {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Unsupported content type' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const grantType = params.get('grant_type');
    const code = params.get('code');
    const clientId = params.get('client_id');
    const clientSecret = params.get('client_secret');
    const redirectUri = params.get('redirect_uri');

    // Validate grant type
    if (grantType !== 'authorization_code') {
      return new Response(
        JSON.stringify({ error: 'unsupported_grant_type', error_description: 'Only authorization_code is supported' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate required parameters
    if (!code || !clientId || !clientSecret || !redirectUri) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate client credentials
    const client = await getOAuthClient(env, clientId);
    if (!client || client.client_secret !== clientSecret) {
      return new Response(
        JSON.stringify({ error: 'invalid_client', error_description: 'Invalid client credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization code data
    const codeData = await env.SESSIONS.get(`oauth_code:${code}`);
    if (!codeData) {
      return new Response(
        JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authData = JSON.parse(codeData);

    // Validate code was issued to this client
    if (authData.clientId !== clientId || authData.redirectUri !== redirectUri) {
      return new Response(
        JSON.stringify({ error: 'invalid_grant', error_description: 'Authorization code mismatch' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete authorization code (one-time use)
    await env.SESSIONS.delete(`oauth_code:${code}`);

    // Generate access token
    const accessToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    const expiresIn = 7 * 24 * 60 * 60; // 7 days

    const tokenData = {
      userId: authData.userId,
      username: authData.username,
      email: authData.email,
      clientId,
      scope: authData.scope,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresIn * 1000,
    };

    // Store access token
    await env.SESSIONS.put(
      `oauth_token:${accessToken}`,
      JSON.stringify(tokenData),
      { expirationTtl: expiresIn }
    );

    // Store refresh token (valid for 30 days)
    await env.SESSIONS.put(
      `oauth_refresh:${refreshToken}`,
      JSON.stringify({ ...tokenData, accessToken }),
      { expirationTtl: 30 * 24 * 60 * 60 }
    );

    // Get Cloudflare account ID and API token for the user
    const mcpToken = await env.SESSIONS.get(`mcp_token:${authData.userId}`);
    let accountId: string | undefined;
    let apiToken: string | undefined;

    if (mcpToken) {
      const mcpData = JSON.parse(mcpToken);
      accountId = mcpData.accountId;
      apiToken = mcpData.accessToken;
    }

    // Return OAuth token response with MCP context
    return new Response(
      JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: refreshToken,
        scope: authData.scope,
        // Additional context for MCP agent
        user_info: {
          sub: accountId || String(authData.userId),
          name: authData.username,
          email: authData.email,
          mcp_account_id: accountId,
          mcp_token: apiToken,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('OAuth token error:', error);
    return new Response(
      JSON.stringify({ error: 'server_error', error_description: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Client registration endpoint
 *
 * Allows MCP clients to dynamically register.
 */
async function handleRegister(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const body = await request.json();
    const { redirect_uris, client_name, scope } = body;

    // Validate required fields
    if (!redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', error_description: 'redirect_uris is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate client credentials
    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomUUID();

    const client: OAuthClient = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris,
      scope: scope || 'mcp:read mcp:write',
      created_at: Date.now(),
    };

    // Store client (never expires, but can be revoked)
    await env.SESSIONS.put(
      `oauth_client:${clientId}`,
      JSON.stringify(client)
    );

    // Return client credentials
    return new Response(
      JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        client_name: client_name || 'MCP Client',
        redirect_uris,
        scope: client.scope,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('OAuth register error:', error);
    return new Response(
      JSON.stringify({ error: 'server_error', error_description: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get OAuth client by ID
 */
async function getOAuthClient(
  env: Env,
  clientId: string
): Promise<OAuthClient | null> {
  const clientData = await env.SESSIONS.get(`oauth_client:${clientId}`);
  if (!clientData) return null;
  return JSON.parse(clientData);
}

/**
 * Parse cookies from Cookie header
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader
    .split(';')
    .map(c => c.trim().split('='))
    .reduce((acc, [key, value]) => {
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
}

/**
 * Verify OAuth token and return auth context
 */
export async function verifyMCPToken(
  token: string,
  env: Env
): Promise<AuthContext | null> {
  try {
    const tokenData = await env.SESSIONS.get(`oauth_token:${token}`);
    if (!tokenData) return null;

    const data = JSON.parse(tokenData);

    // Check expiration
    if (data.expiresAt < Date.now()) {
      await env.SESSIONS.delete(`oauth_token:${token}`);
      return null;
    }

    // Get MCP credentials
    const mcpToken = await env.SESSIONS.get(`mcp_token:${data.userId}`);
    let accountId: string | undefined;
    let apiToken: string | undefined;

    if (mcpToken) {
      const mcpData = JSON.parse(mcpToken);
      accountId = mcpData.accountId;
      apiToken = mcpData.accessToken;
    }

    return {
      userId: String(data.userId),
      accountId,
      apiToken,
      claims: {
        sub: accountId || String(data.userId),
        name: data.username,
        email: data.email,
      },
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}
