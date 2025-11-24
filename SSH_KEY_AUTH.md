# SSH Key Authentication with Cloudflare Access

This document describes how to use SSH key authentication with Cloudflare Access for the MCP server.

## Overview

In addition to GitHub OAuth, this MCP server now supports SSH key authentication using Cloudflare Access. This provides an alternative authentication method that leverages Cloudflare's zero-trust security model.

## How It Works

The SSH key authentication flow:

1. **User connects** to the MCP server via the `/ssh-authorize` endpoint
2. **Cloudflare Access** validates the user's SSH certificate and injects authentication headers
3. **MCP server** validates the Cloudflare Access headers:
   - `CF-Access-JWT-Assertion`: JWT token containing user identity
   - `CF-Access-Client-Id`: Client identification
4. **User identity** is extracted from the JWT token
5. **Session** is created with the user's information

## Configuration

### SSH Key Configuration

The SSH key configuration is stored in `/my-mcp-server-github-auth/src/ssh-key-auth.ts`:

```typescript
const SSH_KEY_CONFIG = {
	// Cloudflare Access SSH public key
	publicKey: "ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBJtxsM1Ij7t5Y3BgerHZce25602wjghHQCOukCqPpYy8zdoXsH7MCDud/SVbagF71lMkBi0QF+boR8vjIndNTRc= open-ssh-ca@cloudflareaccess.org",
	// Cloudflare Access Client ID
	clientId: "20b80e2b331f2ee4c6d32008bf496614.access",
	// SSH key fingerprint/hash
	fingerprint: "671f73b3d352e97f08a80272a651dba35568eccace91213f7f04d00f4de37bc2",
	// Allowed SSH key types
	allowedKeyTypes: ["ecdsa-sha2-nistp256", "ssh-rsa", "ssh-ed25519"],
};
```

### Cloudflare Access Setup

To configure Cloudflare Access for SSH authentication:

1. **Create an Access Application**:
   - Go to Cloudflare Zero Trust Dashboard
   - Navigate to Access > Applications
   - Create a new application for your MCP server
   - Set the application domain to match your worker URL

2. **Configure SSH Authentication**:
   - Enable SSH short-lived certificates in Cloudflare Access
   - Generate SSH CA public key from Cloudflare
   - Add the CA public key to your SSH configuration

3. **Set Access Policies**:
   - Define who can access your MCP server
   - Configure authentication methods (email, SSO, etc.)

4. **Update Configuration**:
   - Copy the Cloudflare Access Client ID
   - Copy the SSH CA public key
   - Update `SSH_KEY_CONFIG` in `ssh-key-auth.ts`

## Endpoints

### GET `/ssh-authorize`

Initiates SSH key authentication flow.

**Headers Required**:
- `CF-Access-JWT-Assertion`: JWT token from Cloudflare Access
- `CF-Access-Client-Id`: Must match the configured client ID

**Response**:
- 302 redirect to MCP client callback (on success)
- 401 Unauthorized (on failure)
- Approval dialog (if client not yet approved)

### POST `/ssh-authorize`

Completes SSH key authentication after user approval.

**Form Data**:
- `csrf_token`: CSRF protection token
- `state`: OAuth state data (base64 encoded)

## Security Features

### JWT Validation

The server validates Cloudflare Access JWT tokens by:
- Checking token structure (header.payload.signature)
- Verifying token expiration
- Extracting user identity information

### Client ID Verification

Only requests with the correct `CF-Access-Client-Id` header are accepted.

### CSRF Protection

The approval flow includes CSRF token validation to prevent cross-site request forgery attacks.

### Session Binding

OAuth state tokens are bound to user sessions via secure cookies to prevent state hijacking.

## User Identity

When authenticated via SSH key, the user's identity is derived from the Cloudflare Access JWT:

```typescript
{
  login: "email-prefix", // Extracted from email
  name: "User Name",     // From JWT name claim
  email: "user@example.com" // From JWT email claim
}
```

## Usage with Claude Desktop

Update your Claude Desktop MCP configuration to use SSH key authentication:

```json
{
  "mcpServers": {
    "ssh-auth-server": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://<your-worker-name>.<your-subdomain>.workers.dev/ssh-authorize"
      ]
    }
  }
}
```

## Supported Key Types

The following SSH key types are supported:
- `ecdsa-sha2-nistp256` (default for Cloudflare Access)
- `ssh-rsa`
- `ssh-ed25519`

## Troubleshooting

### Authentication Fails

1. **Check headers**: Ensure `CF-Access-JWT-Assertion` and `CF-Access-Client-Id` are present
2. **Verify client ID**: Confirm it matches the configured value
3. **Check token expiration**: JWT tokens expire and need to be refreshed
4. **Validate Cloudflare Access**: Ensure your Access policy allows the user

### Missing Headers

If Cloudflare Access headers are missing:
- Verify the request goes through Cloudflare Access
- Check that the Access policy is configured correctly
- Ensure the application domain matches your worker URL

## Comparison: SSH Key Auth vs GitHub OAuth

| Feature | SSH Key Auth | GitHub OAuth |
|---------|--------------|--------------|
| **Setup Complexity** | Moderate (Cloudflare Access setup) | Low (GitHub app creation) |
| **Security Model** | Zero-trust (Cloudflare Access) | OAuth 2.0 |
| **User Identity** | From Cloudflare Access | From GitHub |
| **Access Control** | Cloudflare Access policies | GitHub username allowlist |
| **Token Management** | Short-lived JWT | OAuth access tokens |
| **Use Case** | Enterprise with Cloudflare | Public/open source projects |

## Integration with Existing Tools

The SSH key authentication works alongside the existing GitHub OAuth:
- `/authorize` → GitHub OAuth flow
- `/ssh-authorize` → SSH key authentication flow
- Both flows complete with the same MCP authorization

This allows you to support multiple authentication methods in the same deployment.

## Example: SSH Connection Flow

```
1. User → MCP Client → GET /ssh-authorize
   Headers:
   - CF-Access-JWT-Assertion: eyJhbGc...
   - CF-Access-Client-Id: 20b80e2b...

2. MCP Server validates JWT and client ID

3. MCP Server → Returns approval dialog (if needed)

4. User approves → POST /ssh-authorize

5. MCP Server → Creates session and redirects

6. User authenticated with identity:
   {
     login: "john.doe",
     name: "John Doe",
     email: "john.doe@company.com"
   }
```

## Production Considerations

### JWT Signature Verification

In production, implement full JWT signature verification:

```typescript
// Fetch Cloudflare's public keys
const certsUrl = `https://<your-team-name>.cloudflareaccess.com/cdn-cgi/access/certs`;
const response = await fetch(certsUrl);
const certs = await response.json();

// Verify JWT signature using the public keys
// Use a library like jose or jsonwebtoken
```

### Rate Limiting

Implement rate limiting on authentication endpoints to prevent abuse:
- Limit failed authentication attempts
- Add exponential backoff
- Block suspicious IP addresses

### Logging and Monitoring

Log authentication events for security monitoring:
- Successful authentications
- Failed authentication attempts
- JWT validation failures
- Client ID mismatches

### Environment Variables

Store sensitive configuration in environment variables:

```bash
# Add to .dev.vars for local development
SSH_KEY_CLIENT_ID=20b80e2b331f2ee4c6d32008bf496614.access
SSH_KEY_FINGERPRINT=671f73b3d352e97f08a80272a651dba35568eccace91213f7f04d00f4de37bc2

# Set secrets for production
wrangler secret put SSH_KEY_CLIENT_ID
wrangler secret put SSH_KEY_FINGERPRINT
```

## Future Enhancements

Potential improvements to consider:
- Support for multiple SSH CA public keys
- Certificate revocation checking
- Advanced access control based on JWT claims
- Integration with other identity providers
- Audit logging of authentication events

## Resources

- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/identity/users/short-lived-certificates/)
- [SSH Certificate Authentication](https://developers.cloudflare.com/cloudflare-one/identity/users/short-lived-certificates/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OAuth 2.1 Specification](https://oauth.net/2.1/)
