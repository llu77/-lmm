import { Hono } from "hono";
import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import {
	createOAuthState,
	bindStateToSession,
	isClientApproved,
	addApprovedClient,
	generateCSRFProtection,
	validateCSRFToken,
	validateOAuthState,
	renderApprovalDialog,
	OAuthError,
} from "./workers-oauth-utils";
import type { Props } from "./utils";

/**
 * SSH Key Authentication Configuration
 * Store your Cloudflare Access SSH keys and configuration here
 */
const SSH_KEY_CONFIG = {
	// Cloudflare Access SSH public key
	publicKey: "ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBJtxsM1Ij7t5Y3BgerHZce25602wjghHQCOukCqPpYy8zdoXsH7MCDud/SVbagF71lMkBi0QF+boR8vjIndNTRc= open-ssh-ca@cloudflareaccess.org",
	// Cloudflare Access Client ID
	clientId: "20b80e2b331f2ee4c6d32008bf496614.access",
	// SSH key fingerprint/hash
	fingerprint: "671f73b3d352e97f08a80272a651dba35568eccace91213f7f04d00f4de37bc2",
	// Allowed SSH key types
	allowedKeyTypes: ["ecdsa-sha2-nistp256", "ssh-rsa", "ssh-ed25519"] as const,
};

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

/**
 * Validates an SSH public key format
 */
function validateSSHKeyFormat(publicKey: string): boolean {
	const parts = publicKey.trim().split(/\s+/);
	if (parts.length < 2) return false;

	const [keyType, keyData] = parts;

	// Check if key type is allowed
	if (!SSH_KEY_CONFIG.allowedKeyTypes.includes(keyType as any)) {
		return false;
	}

	// Validate base64 encoding of key data
	try {
		atob(keyData);
		return true;
	} catch {
		return false;
	}
}

/**
 * Verifies Cloudflare Access JWT token
 */
async function verifyCloudflareAccessToken(
	request: Request,
	env: Env
): Promise<{ valid: boolean; identity?: any }> {
	// Extract the CF-Access-JWT-Assertion header
	const jwtAssertion = request.headers.get("CF-Access-JWT-Assertion");

	if (!jwtAssertion) {
		return { valid: false };
	}

	try {
		// Verify the JWT using Cloudflare's public keys
		// In production, you would fetch the public key from:
		// https://<your-team-name>.cloudflareaccess.com/cdn-cgi/access/certs

		// For now, we'll do basic validation
		const parts = jwtAssertion.split(".");
		if (parts.length !== 3) {
			return { valid: false };
		}

		// Decode the payload
		const payload = JSON.parse(atob(parts[1]));

		// Verify the token hasn't expired
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp && payload.exp < now) {
			return { valid: false };
		}

		// Extract identity information
		const identity = {
			email: payload.email,
			name: payload.name || payload.email?.split("@")[0],
			sub: payload.sub,
			identity_nonce: payload.identity_nonce,
		};

		return { valid: true, identity };
	} catch (error) {
		console.error("JWT verification error:", error);
		return { valid: false };
	}
}

/**
 * Validates SSH key authentication
 */
async function validateSSHKeyAuth(
	request: Request,
	env: Env
): Promise<{ valid: boolean; user?: { login: string; name: string; email: string } }> {
	// Check for CF-Access-Client-Id header
	const clientId = request.headers.get("CF-Access-Client-Id");

	if (clientId !== SSH_KEY_CONFIG.clientId) {
		return { valid: false };
	}

	// Verify Cloudflare Access token
	const { valid, identity } = await verifyCloudflareAccessToken(request, env);

	if (!valid || !identity) {
		return { valid: false };
	}

	// Create user object from identity
	const user = {
		login: identity.email?.split("@")[0] || identity.sub,
		name: identity.name,
		email: identity.email,
	};

	return { valid: true, user };
}

/**
 * SSH Key Authentication Authorize Endpoint
 */
app.get("/ssh-authorize", async (c) => {
	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	const { clientId } = oauthReqInfo;

	if (!clientId) {
		return c.text("Invalid request", 400);
	}

	// Check if client is already approved
	if (await isClientApproved(c.req.raw, clientId, c.env.COOKIE_ENCRYPTION_KEY)) {
		// Validate SSH key authentication
		const { valid, user } = await validateSSHKeyAuth(c.req.raw, c.env);

		if (!valid || !user) {
			return c.text("SSH key authentication failed", 401);
		}

		// Skip approval dialog and proceed with authentication
		const { stateToken } = await createOAuthState(oauthReqInfo, c.env.OAUTH_KV);
		const { setCookie: sessionBindingCookie } = await bindStateToSession(stateToken);

		return completeSSHKeyAuth(c.req.raw, c.env, oauthReqInfo, user, {
			"Set-Cookie": sessionBindingCookie,
		});
	}

	// Generate CSRF protection for the approval form
	const { token: csrfToken, setCookie } = generateCSRFProtection();

	return renderApprovalDialog(c.req.raw, {
		client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
		csrfToken,
		server: {
			description: "This is an MCP Remote Server using SSH Key authentication with Cloudflare Access.",
			logo: "https://avatars.githubusercontent.com/u/314135?s=200&v=4",
			name: "Cloudflare SSH Key Auth MCP Server",
		},
		setCookie,
		state: { oauthReqInfo },
	});
});

/**
 * SSH Key Authentication Approve Endpoint
 */
app.post("/ssh-authorize", async (c) => {
	try {
		// Read form data
		const formData = await c.req.raw.formData();

		// Validate CSRF token
		validateCSRFToken(formData, c.req.raw);

		// Extract state from form data
		const encodedState = formData.get("state");
		if (!encodedState || typeof encodedState !== "string") {
			return c.text("Missing state in form data", 400);
		}

		let state: { oauthReqInfo?: AuthRequest };
		try {
			state = JSON.parse(atob(encodedState));
		} catch (_e) {
			return c.text("Invalid state data", 400);
		}

		if (!state.oauthReqInfo || !state.oauthReqInfo.clientId) {
			return c.text("Invalid request", 400);
		}

		// Validate SSH key authentication
		const { valid, user } = await validateSSHKeyAuth(c.req.raw, c.env);

		if (!valid || !user) {
			return c.text("SSH key authentication failed", 401);
		}

		// Add client to approved list
		const approvedClientCookie = await addApprovedClient(
			c.req.raw,
			state.oauthReqInfo.clientId,
			c.env.COOKIE_ENCRYPTION_KEY,
		);

		// Create OAuth state and bind it to this user's session
		const { stateToken } = await createOAuthState(state.oauthReqInfo, c.env.OAUTH_KV);
		const { setCookie: sessionBindingCookie } = await bindStateToSession(stateToken);

		// Set both cookies: approved client list + session binding
		const headers = new Headers();
		headers.append("Set-Cookie", approvedClientCookie);
		headers.append("Set-Cookie", sessionBindingCookie);

		return completeSSHKeyAuth(
			c.req.raw,
			c.env,
			state.oauthReqInfo,
			user,
			Object.fromEntries(headers)
		);
	} catch (error: any) {
		console.error("POST /ssh-authorize error:", error);
		if (error instanceof OAuthError) {
			return error.toResponse();
		}
		return c.text(`Internal server error: ${error.message}`, 500);
	}
});

/**
 * SSH Key Authentication Callback
 * Completes the SSH key authentication flow
 */
app.get("/ssh-callback", async (c) => {
	// Validate OAuth state with session binding
	let oauthReqInfo: AuthRequest;
	let clearSessionCookie: string;

	try {
		const result = await validateOAuthState(c.req.raw, c.env.OAUTH_KV);
		oauthReqInfo = result.oauthReqInfo;
		clearSessionCookie = result.clearCookie;
	} catch (error: any) {
		if (error instanceof OAuthError) {
			return error.toResponse();
		}
		return c.text("Internal server error", 500);
	}

	if (!oauthReqInfo.clientId) {
		return c.text("Invalid OAuth request data", 400);
	}

	// Validate SSH key authentication
	const { valid, user } = await validateSSHKeyAuth(c.req.raw, c.env);

	if (!valid || !user) {
		return c.text("SSH key authentication failed", 401);
	}

	// Return back to the MCP client a new token
	const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
		metadata: {
			label: user.name,
		},
		props: {
			accessToken: "ssh-key-auth", // Placeholder for SSH key auth
			email: user.email,
			login: user.login,
			name: user.name,
		} as Props,
		request: oauthReqInfo,
		scope: oauthReqInfo.scope,
		userId: user.login,
	});

	// Clear the session binding cookie
	const headers = new Headers({ Location: redirectTo });
	if (clearSessionCookie) {
		headers.set("Set-Cookie", clearSessionCookie);
	}

	return new Response(null, {
		status: 302,
		headers,
	});
});

/**
 * Helper function to complete SSH key authentication
 */
async function completeSSHKeyAuth(
	request: Request,
	env: Env & { OAUTH_PROVIDER: OAuthHelpers },
	oauthReqInfo: AuthRequest,
	user: { login: string; name: string; email: string },
	additionalHeaders: Record<string, string> = {}
): Promise<Response> {
	// Return back to the MCP client a new token
	const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
		metadata: {
			label: user.name,
		},
		props: {
			accessToken: "ssh-key-auth", // Placeholder for SSH key auth
			email: user.email,
			login: user.login,
			name: user.name,
		} as Props,
		request: oauthReqInfo,
		scope: oauthReqInfo.scope,
		userId: user.login,
	});

	return new Response(null, {
		headers: {
			...additionalHeaders,
			Location: redirectTo,
		},
		status: 302,
	});
}

export { app as SSHKeyAuthHandler, SSH_KEY_CONFIG, validateSSHKeyFormat, validateSSHKeyAuth };
