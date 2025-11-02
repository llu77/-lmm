# 🔌 MCP Client Configuration Guide

## Overview

This guide explains how to connect to the **SymbolAI MCP Server** from MCP-compatible clients like Claude Desktop, Cursor, and Windsurf using `mcp-remote`.

---

## 🏗️ Architecture

### Server-Side (SymbolAI)
- **MCP API Endpoints**: `/api/mcp/*`
- **Authentication**: OAuth-style with API token storage
- **Transport**: HTTP REST API
- **Base URL**: `https://your-domain.workers.dev`

### Client-Side (mcp-remote)
- **Package**: `mcp-remote` (npm package)
- **Transport**: SSE or HTTP
- **OAuth**: Supported with custom headers
- **Config Location**:
  - Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
  - Cursor: `~/.cursor/mcp.json`
  - Windsurf: `~/.codeium/windsurf/mcp_config.json`

---

## 📋 Prerequisites

### 1. Cloudflare API Token

Create a Cloudflare API token with these permissions:

```text
✅ Account Settings: Read
✅ Workers Scripts: Read, Edit
✅ Workers KV Storage: Read, Edit
✅ Workers R2 Storage: Read, Edit
✅ D1: Read, Edit
```

Get your token from: https://dash.cloudflare.com/profile/api-tokens

### 2. Account ID

Find your Cloudflare Account ID in the Workers dashboard URL:
```
https://dash.cloudflare.com/{ACCOUNT_ID}/workers
```

---

## ⚙️ Configuration

### Option 1: Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "symbolai-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://your-domain.workers.dev/api/mcp/sse",
        "--header",
        "Authorization:Bearer ${CLOUDFLARE_API_TOKEN}",
        "--header",
        "X-Account-ID:${CLOUDFLARE_ACCOUNT_ID}"
      ],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your-cloudflare-api-token-here",
        "CLOUDFLARE_ACCOUNT_ID": "your-32-char-account-id-here"
      }
    }
  }
}
```

**Notes:**
- Replace `your-domain.workers.dev` with your actual Workers domain
- Replace `CLOUDFLARE_API_TOKEN` with your Cloudflare API token
- Replace `CLOUDFLARE_ACCOUNT_ID` with your 32-character account ID
- No spaces around `:` in header values (Cursor/Claude Desktop bug workaround)

### Option 2: Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "symbolai-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://your-domain.workers.dev/api/mcp/sse"
      ]
    }
  }
}
```

**Note**: As of v0.48.0, Cursor supports unauthed SSE servers directly. For OAuth, use the full `mcp-remote` configuration.

### Option 3: Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "symbolai-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://your-domain.workers.dev/api/mcp/sse",
        "--transport",
        "http-first",
        "--debug"
      ],
      "env": {
        "CLOUDFLARE_API_TOKEN": "your-token",
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id"
      }
    }
  }
}
```

---

## 🔒 Advanced Configuration

### 1. Custom OAuth Configuration

If using full OAuth flow (not API token headers):

```json
{
  "mcpServers": {
    "symbolai-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://your-domain.workers.dev/api/mcp/sse",
        "--static-oauth-client-metadata",
        "{\"scope\":\"read:d1 write:d1 read:kv write:kv read:r2 write:r2\"}"
      ]
    }
  }
}
```

### 2. Transport Strategy

Choose the appropriate transport strategy:

```json
{
  "args": [
    "mcp-remote@latest",
    "https://your-domain.workers.dev/api/mcp/sse",
    "--transport",
    "http-first"  // Options: http-first, sse-first, http-only, sse-only
  ]
}
```

**Transport Options:**
- `http-first` (default): Tries HTTP, falls back to SSE on 404
- `sse-first`: Tries SSE, falls back to HTTP on 405
- `http-only`: Only HTTP transport
- `sse-only`: Only SSE transport

### 3. Debugging

Enable detailed logging:

```json
{
  "args": [
    "mcp-remote@latest",
    "https://your-domain.workers.dev/api/mcp/sse",
    "--debug"
  ]
}
```

Debug logs are written to: `~/.mcp-auth/{server_hash}_debug.log`

### 4. Proxy Support

For corporate networks with proxy:

```json
{
  "args": [
    "mcp-remote@latest",
    "https://your-domain.workers.dev/api/mcp/sse",
    "--enable-proxy"
  ],
  "env": {
    "HTTPS_PROXY": "http://proxy.company.com:8080",
    "NO_PROXY": "localhost,127.0.0.1"
  }
}
```

### 5. Tool Filtering

Ignore specific dangerous tools:

```json
{
  "args": [
    "mcp-remote@latest",
    "https://your-domain.workers.dev/api/mcp/sse",
    "--ignore-tool",
    "delete*",
    "--ignore-tool",
    "drop*",
    "--ignore-tool",
    "truncate*"
  ]
}
```

### 6. Custom OAuth Port

Change the OAuth callback port (default 3334):

```json
{
  "args": [
    "mcp-remote@latest",
    "https://your-domain.workers.dev/api/mcp/sse",
    "9696"  // Custom port
  ]
}
```

### 7. Authentication Timeout

Increase OAuth callback timeout (default 30 seconds):

```json
{
  "args": [
    "mcp-remote@latest",
    "https://your-domain.workers.dev/api/mcp/sse",
    "--auth-timeout",
    "60"
  ]
}
```

---

## 🚀 Usage

### Starting the Client

After configuring, restart your MCP client:

1. **Claude Desktop**: Fully quit and restart the app
2. **Cursor**: Restart or reload window
3. **Windsurf**: Restart the application

### Verifying Connection

Look for these indicators:

- **Claude Desktop**: Hammer icon (🔨) in bottom-right of input box
- **Cursor**: MCP tools available in command palette
- **Windsurf**: MCP status in status bar

### Available Commands

Once connected, you can use natural language to interact with your infrastructure:

```text
"Show me all D1 databases"
"List KV namespaces"
"Query users table in database abc123"
"Show last 10 deployments"
"What R2 buckets do I have?"
```

---

## 🔍 Troubleshooting

### Error: "Failed to connect to MCP server"

**Solution:**
1. Check your Workers domain is correct
2. Verify the `/api/mcp/sse` endpoint exists
3. Test the endpoint manually: `curl https://your-domain.workers.dev/api/mcp/sse`

### Error: "Authentication failed"

**Solution:**
1. Verify your API token is valid: https://dash.cloudflare.com/profile/api-tokens
2. Check token has correct permissions
3. Ensure Account ID is correct (32 hex characters)
4. Clear auth cache: `rm -rf ~/.mcp-auth`

### Error: "Transport negotiation failed"

**Solution:**
1. Try specifying transport explicitly: `--transport http-first`
2. Check if SSE endpoint is implemented
3. Enable debug logs: `--debug`

### Error: "Token exchange failed: HTTP 400"

**Solution:**
1. Clear auth cache: `rm -rf ~/.mcp-auth`
2. Check OAuth configuration
3. Verify callback URL is accessible

### Error: "Node version incompatible"

**Solution:**
- Ensure Node.js version is 18 or higher
- Claude Desktop uses system Node version
- Check: `node --version`

### VPN Certificate Issues

**Solution:**
Add CA certificate path:

```json
{
  "env": {
    "NODE_EXTRA_CA_CERTS": "/path/to/your-ca-certificate.pem"
  }
}
```

### Viewing Logs

**Claude Desktop (macOS):**
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

**mcp-remote Debug Logs:**
```bash
tail -f ~/.mcp-auth/*_debug.log
```

---

## 📊 Monitoring

### Check Connection Status

Test the MCP server status endpoint:

```bash
curl -X GET https://your-domain.workers.dev/api/mcp/auth/status \
  -H "Cookie: session=your-session-token"
```

Expected response:
```json
{
  "connected": true,
  "accountId": "abc123...",
  "userId": "user_123"
}
```

### View MCP Logs

From SymbolAI admin dashboard:
1. Navigate to `/mcp-tools`
2. Check "Build Monitor" tab
3. View deployment logs

---

## 🔐 Security Best Practices

### 1. Token Management

- ✅ Use API tokens with minimal required permissions
- ✅ Rotate tokens every 6 months
- ✅ Never commit tokens to version control
- ❌ Don't share tokens via chat or email

### 2. Environment Variables

Store sensitive data in environment variables:

```json
{
  "env": {
    "CLOUDFLARE_API_TOKEN": "${CLOUDFLARE_API_TOKEN}",
    "CLOUDFLARE_ACCOUNT_ID": "${CLOUDFLARE_ACCOUNT_ID}"
  }
}
```

Then set system environment variables:
```bash
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

### 3. Network Security

- ✅ Always use HTTPS (not HTTP)
- ✅ Use `--allow-http` only in trusted private networks
- ✅ Enable proxy in corporate environments
- ❌ Don't expose MCP endpoints publicly without authentication

### 4. Tool Filtering

Block dangerous operations:

```json
{
  "args": [
    "mcp-remote@latest",
    "https://your-domain.workers.dev/api/mcp/sse",
    "--ignore-tool", "delete*",
    "--ignore-tool", "drop*",
    "--ignore-tool", "truncate*",
    "--ignore-tool", "alter*"
  ]
}
```

---

## 📚 Related Documentation

### SymbolAI Documentation
- [MCP Integration Guide](./MCP_INTEGRATION_GUIDE.md) - Server-side implementation
- [MCP Client Library](./symbolai-worker/src/lib/MCP_CLIENT_README.md) - API reference
- [RBAC System](./RBAC_SYSTEM.md) - Authentication and permissions

### External Resources
- [mcp-remote GitHub](https://github.com/anthropics/mcp-remote)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Cloudflare MCP Server](https://github.com/cloudflare/mcp-server-cloudflare)
- [Claude Desktop Docs](https://docs.anthropic.com/claude/docs/mcp)

---

## 🎯 Quick Reference

### Configuration File Locations

| Client | Path |
|--------|------|
| **Claude Desktop (macOS)** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Claude Desktop (Windows)** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Cursor** | `~/.cursor/mcp.json` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` |

### Common Flags

| Flag | Purpose | Example |
|------|---------|---------|
| `--header` | Add custom HTTP header | `--header "Authorization:Bearer ${TOKEN}"` |
| `--transport` | Choose transport strategy | `--transport http-first` |
| `--debug` | Enable debug logging | `--debug` |
| `--enable-proxy` | Enable HTTP proxy | `--enable-proxy` |
| `--ignore-tool` | Filter out tools | `--ignore-tool "delete*"` |
| `--auth-timeout` | OAuth timeout (seconds) | `--auth-timeout 60` |
| `--allow-http` | Allow HTTP (insecure) | `--allow-http` |

### Testing the Connection

```bash
# 1. Test endpoint is reachable
curl https://your-domain.workers.dev/api/mcp/sse

# 2. Test authentication
curl -X POST https://your-domain.workers.dev/api/mcp/auth/status \
  -H "Authorization: Bearer your-token"

# 3. Test with mcp-remote client mode
npx -p mcp-remote@latest mcp-remote-client https://your-domain.workers.dev/api/mcp/sse
```

---

## ✅ Checklist

Before using SymbolAI MCP:

- [ ] Created Cloudflare API token with correct permissions
- [ ] Found Account ID from Cloudflare dashboard
- [ ] Installed Node.js 18+ (check: `node --version`)
- [ ] Created configuration file in correct location
- [ ] Added API token and Account ID to config
- [ ] Restarted MCP client (Claude/Cursor/Windsurf)
- [ ] Verified connection (hammer icon / MCP status)
- [ ] Tested a simple command ("list D1 databases")
- [ ] Reviewed security best practices
- [ ] Set up debug logging (optional but recommended)

---

**Status**: ✅ Ready for Production

**Last Updated**: 2025-11-02

**Version**: 1.0.0
