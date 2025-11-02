# Cloudflare Agents-Based MCP Implementation

This document describes the modern, Agent-based implementation of the Cloudflare MCP server for SymbolAI.

## 🎯 Overview

SymbolAI now includes a **second-generation MCP server** built with the Cloudflare Agents framework. This implementation coexists with the original SSE-based approach but provides significant advantages:

### Original SSE Implementation
- **Location**: `src/pages/api/mcp/sse.ts`
- **Protocol**: Server-Sent Events (SSE) with POST
- **State**: Stateless, uses KV for sessions
- **Authentication**: Session-based with manual token management

### New Agent Implementation
- **Location**: `src/agents/cloudflare-mcp.ts`
- **Framework**: Cloudflare Agents (Durable Objects)
- **State**: SQLite-backed persistent state per agent instance
- **Authentication**: OAuth 2.0 with dynamic client registration
- **Scheduling**: Built-in task scheduling with cron support
- **Workflows**: Can trigger Workflows for complex operations

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Client                              │
│            (Claude Desktop, Cursor, etc.)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ OAuth 2.0 Authorization Code Flow
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              OAuth Provider (MCP Auth Handler)               │
│  /api/agents/mcp/authorize  → User authentication           │
│  /api/agents/mcp/token      → Token exchange                │
│  /api/agents/mcp/register   → Dynamic client registration   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Bearer Token
                      ↓
┌─────────────────────────────────────────────────────────────┐
│            Cloudflare MCP Agent (Durable Object)             │
│                                                               │
│  State (SQLite):                                              │
│    - Active account ID                                        │
│    - API tokens                                               │
│    - Usage statistics                                         │
│    - Last sync timestamp                                      │
│                                                               │
│  Tools (16 total):                                            │
│    - D1: list, get, query                                     │
│    - KV: list, get, list_keys                                 │
│    - R2: list, get                                            │
│    - Workers: list, get                                       │
│    - Builds: list, get_logs                                   │
│    - Stats: get_stats, set_active_account                     │
│                                                               │
│  Resources:                                                   │
│    - mcp://cloudflare/stats                                   │
│    - mcp://cloudflare/account                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Cloudflare API Calls
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare API                              │
│  - D1 Databases                                               │
│  - KV Namespaces                                              │
│  - R2 Buckets                                                 │
│  - Workers Scripts                                            │
│  - Pages Deployments                                          │
└─────────────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
symbolai-worker/
├── src/
│   ├── agents/
│   │   ├── cloudflare-mcp.ts         # Main MCP Agent class
│   │   └── mcp-oauth-provider.ts     # OAuth authentication handler
│   └── pages/
│       └── api/
│           └── agents/
│               └── mcp/
│                   └── [...path].ts   # Agent API route handler
├── wrangler.toml                      # Updated with Agent DO binding
└── CLOUDFLARE_AGENTS_MCP.md          # This documentation
```

## 🔧 Implementation Details

### 1. CloudflareMCPAgent Class

**File**: `src/agents/cloudflare-mcp.ts`

The main agent class extends `McpAgent` and provides:

#### State Management
```typescript
interface CloudflareMCPState {
  activeAccountId?: string;
  activeWorkerId?: string;
  tokenData?: {
    accountId: string;
    apiToken: string;
    expiresAt: number;
  };
  lastSync?: number;
  stats?: {
    toolCallsCount: number;
    queriesExecuted: number;
    lastActivity: number;
  };
}
```

#### MCP Tools (16 total)

**D1 Database Tools:**
- `d1_list_databases` - List all D1 databases
- `d1_get_database` - Get database details by UUID
- `d1_query` - Execute SQL query with validation

**KV Tools:**
- `kv_list_namespaces` - List all KV namespaces
- `kv_get_namespace` - Get namespace details
- `kv_list_keys` - List keys with optional prefix filter

**R2 Tools:**
- `r2_list_buckets` - List all R2 buckets
- `r2_get_bucket` - Get bucket details

**Workers Tools:**
- `workers_list` - List all Worker scripts
- `workers_get` - Get Worker details

**Build Tools:**
- `builds_list` - List deployments with optional project filter
- `builds_get_logs` - Get build logs

**Management Tools:**
- `get_stats` - Get agent usage statistics
- `set_active_account` - Set active Cloudflare account

#### MCP Resources

- `mcp://cloudflare/stats` - Real-time usage statistics
- `mcp://cloudflare/account` - Active account information

### 2. OAuth Provider

**File**: `src/agents/mcp-oauth-provider.ts`

Implements OAuth 2.0 Authorization Code flow with:

#### Endpoints

**Authorization Endpoint** (`/api/agents/mcp/authorize`):
- Validates MCP client credentials
- Checks user session from SymbolAI auth
- Generates authorization code
- Redirects to client with code

**Token Endpoint** (`/api/agents/mcp/token`):
- Exchanges authorization code for access token
- Validates client secret
- Returns access token + refresh token
- Includes MCP context (account ID, API token)

**Registration Endpoint** (`/api/agents/mcp/register`):
- Dynamic client registration
- Generates client_id and client_secret
- Stores client configuration in KV

#### Token Response Format
```json
{
  "access_token": "uuid-v4-token",
  "token_type": "Bearer",
  "expires_in": 604800,
  "refresh_token": "uuid-v4-refresh",
  "scope": "mcp:read mcp:write",
  "user_info": {
    "sub": "cloudflare-account-id",
    "name": "username",
    "email": "user@example.com",
    "mcp_account_id": "32-char-hex-id",
    "mcp_token": "cloudflare-api-token"
  }
}
```

### 3. Agent API Route

**File**: `src/pages/api/agents/mcp/[...path].ts`

Handles all MCP agent requests:
- OAuth flows (GET /authorize, POST /token, POST /register)
- MCP protocol communication (POST /mcp)
- CORS preflight (OPTIONS)

Uses `getAgentByName()` to retrieve or create agent instances per user.

### 4. Wrangler Configuration

**File**: `wrangler.toml`

Added Durable Object binding for Agents:

```toml
[[durable_objects.bindings]]
name = "CloudflareMCPAgent"
class_name = "CloudflareMCPAgent"
script_name = "symbolai-worker"

[[migrations]]
tag = "v1"
new_classes = ["CloudflareMCPAgent"]
```

## 🚀 Usage

### For MCP Clients (Claude Desktop, Cursor, etc.)

#### Step 1: Register Client

```bash
curl -X POST https://symbolai.net/api/agents/mcp/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Claude Desktop",
    "redirect_uris": ["http://localhost:3000/callback"],
    "scope": "mcp:read mcp:write"
  }'
```

Response:
```json
{
  "client_id": "uuid-client-id",
  "client_secret": "uuid-client-secret",
  "client_name": "Claude Desktop",
  "redirect_uris": ["http://localhost:3000/callback"],
  "scope": "mcp:read mcp:write"
}
```

#### Step 2: Authorization Code Flow

1. **Redirect user to authorization endpoint:**
```
https://symbolai.net/api/agents/mcp/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=http://localhost:3000/callback&
  scope=mcp:read%20mcp:write&
  state=random-state
```

2. **User authenticates with SymbolAI credentials**

3. **Receive authorization code:**
```
http://localhost:3000/callback?
  code=authorization-code&
  state=random-state
```

#### Step 3: Exchange Code for Token

```bash
curl -X POST https://symbolai.net/api/agents/mcp/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=authorization-code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000/callback"
```

#### Step 4: Use MCP Tools

```bash
curl -X POST https://symbolai.net/api/agents/mcp/mcp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

### Configuration for mcp-remote

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "symbolai-cloudflare": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://symbolai.net/api/agents/mcp/mcp"
      ],
      "env": {
        "MCP_REMOTE_OAUTH": "true",
        "MCP_REMOTE_CLIENT_ID": "your-client-id",
        "MCP_REMOTE_CLIENT_SECRET": "your-client-secret",
        "MCP_REMOTE_AUTH_URL": "https://symbolai.net/api/agents/mcp/authorize",
        "MCP_REMOTE_TOKEN_URL": "https://symbolai.net/api/agents/mcp/token"
      }
    }
  }
}
```

**Cursor** (`.cursor/config.json`):
```json
{
  "mcpServers": {
    "symbolai-cloudflare": {
      "url": "https://symbolai.net/api/agents/mcp/mcp",
      "transport": "http",
      "oauth": {
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret",
        "authUrl": "https://symbolai.net/api/agents/mcp/authorize",
        "tokenUrl": "https://symbolai.net/api/agents/mcp/token"
      }
    }
  }
}
```

## 🔐 Security Features

### 1. SQL Injection Prevention
- Validates all SQL queries before execution
- Blocks dangerous operations (DROP, TRUNCATE, EXEC, ATTACH)
- Detects SQL injection patterns (UNION, comments, file operations)
- Enforces query length limits (10,000 chars)

### 2. OAuth 2.0 Security
- CSRF protection via state parameter
- One-time use authorization codes (10-minute expiration)
- Secure token storage in KV
- Client secret verification
- Redirect URI validation

### 3. API Token Security
- Tokens stored encrypted in KV
- Automatic token expiration
- User-scoped token access
- Bearer token authentication

### 4. Input Validation
- UUID validation for database IDs
- Hex string validation for account IDs
- Range clamping for limits
- Content-Type validation

## 📊 State Management

Each agent instance maintains persistent state in SQLite:

```typescript
// Automatically persisted by Cloudflare Agents
this.setState({
  activeAccountId: 'cloudflare-account-id',
  stats: {
    toolCallsCount: 42,
    queriesExecuted: 15,
    lastActivity: Date.now(),
  },
});
```

State is:
- **Durable**: Survives restarts and deployments
- **Isolated**: Each user has their own agent instance
- **Queryable**: Can be accessed via `this.sql` template tag
- **Observable**: `onStateUpdate()` hook for change notifications

## 🔄 Comparison: SSE vs Agent Implementation

| Feature | SSE Implementation | Agent Implementation |
|---------|-------------------|---------------------|
| **State** | KV (manual) | SQLite (automatic) |
| **Auth** | Session-based | OAuth 2.0 |
| **Persistence** | Manual token management | Built-in state management |
| **Scheduling** | Not available | `this.schedule()` support |
| **Workflows** | Not available | Can trigger Workflows |
| **Protocol** | SSE + POST | HTTP + WebSocket |
| **Scalability** | Stateless (KV lookup per request) | Stateful (Durable Object) |
| **Complexity** | Manual implementation | Framework-provided |
| **Client Support** | Standard MCP clients | Standard MCP clients |

## 🎯 Advantages of Agent Implementation

### 1. **State Management**
- Automatic persistence via SQLite
- No manual KV operations
- Query state with SQL
- Observable state changes

### 2. **OAuth Integration**
- Standard OAuth 2.0 flow
- Dynamic client registration
- Refresh token support
- Better compatibility with MCP clients

### 3. **Scheduling Capabilities**
```typescript
// Schedule a task to run in 10 minutes
await this.schedule(600, 'syncCloudflareData', {
  accountId: 'your-account-id'
});

// Schedule periodic sync (every hour)
await this.schedule('0 * * * *', 'syncCloudflareData', {});
```

### 4. **Workflow Integration**
```typescript
// Trigger a Workflow for complex operations
await env.WORKFLOWS.create({
  id: crypto.randomUUID(),
  params: { operation: 'backup-d1-databases' }
});
```

### 5. **Built-in Resources**
- `mcp://cloudflare/stats` - Real-time usage metrics
- `mcp://cloudflare/account` - Account information
- Automatic resource caching

## 📈 Usage Statistics

The agent tracks usage automatically:

```typescript
{
  "toolCallsCount": 156,        // Total tool invocations
  "queriesExecuted": 42,         // D1 queries executed
  "lastActivity": 1705123456789, // Last activity timestamp
  "uptime": 3600000,             // Milliseconds since creation
  "accountId": "account-id"      // Active Cloudflare account
}
```

Access via `get_stats` tool or `mcp://cloudflare/stats` resource.

## 🛠️ Development

### Adding New Tools

```typescript
// In src/agents/cloudflare-mcp.ts
this.server.tool(
  'my_new_tool',
  'Description of what this tool does',
  {
    param1: z.string().describe('Parameter description'),
    param2: z.number().optional().describe('Optional parameter'),
  },
  async ({ param1, param2 }) => {
    await this.updateStats();

    try {
      const result = await this.callCloudflareAPI<any>(
        '/client/v4/accounts/{account_id}/endpoint',
        'GET'
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: `Error: ${error.message}`,
        }],
        isError: true,
      };
    }
  }
);
```

### Adding Scheduled Tasks

```typescript
// Schedule a task in the init() method
async init() {
  // ... existing tool registration

  // Schedule hourly sync
  await this.schedule('0 * * * *', 'syncData', {
    accountId: this.state.activeAccountId,
  });
}

// Add the scheduled task handler
async syncData(data: { accountId?: string }) {
  console.log('Syncing data for account:', data.accountId);
  // Sync logic here
}
```

## 📝 Testing

### Test OAuth Flow

```bash
# 1. Register client
CLIENT_RESP=$(curl -s -X POST https://symbolai.net/api/agents/mcp/register \
  -H "Content-Type: application/json" \
  -d '{"client_name":"Test Client","redirect_uris":["http://localhost:3000/callback"]}')

CLIENT_ID=$(echo $CLIENT_RESP | jq -r '.client_id')
CLIENT_SECRET=$(echo $CLIENT_RESP | jq -r '.client_secret')

# 2. Open authorization URL in browser
open "https://symbolai.net/api/agents/mcp/authorize?client_id=$CLIENT_ID&redirect_uri=http://localhost:3000/callback&state=test"

# 3. After redirect, exchange code for token
curl -X POST https://symbolai.net/api/agents/mcp/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "client_id=$CLIENT_ID" \
  -d "client_secret=$CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000/callback"
```

### Test MCP Tools

```bash
# List available tools
curl -X POST https://symbolai.net/api/agents/mcp/mcp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Call a tool
curl -X POST https://symbolai.net/api/agents/mcp/mcp \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "d1_list_databases",
      "arguments": {}
    },
    "id": 2
  }'
```

## 🚀 Deployment

### 1. Build

```bash
cd symbolai-worker
npm run build
```

### 2. Deploy

```bash
npx wrangler deploy
```

### 3. Verify

```bash
# Check agent endpoint
curl https://symbolai.net/api/agents/mcp/mcp

# Should return MCP server info
```

## 📚 References

- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749)
- [Cloudflare API Documentation](https://developers.cloudflare.com/api)

## 🔄 Migration Path

Both implementations coexist:

### Use SSE Implementation When:
- Simple stateless requests
- No OAuth requirement
- Session-based auth is sufficient
- Testing or debugging

### Use Agent Implementation When:
- Need persistent state
- OAuth 2.0 required
- Using scheduled tasks
- Triggering Workflows
- Production deployments

To migrate clients from SSE to Agent:
1. Register OAuth client via `/api/agents/mcp/register`
2. Update client configuration to use OAuth
3. Change endpoint from `/api/mcp/sse` to `/api/agents/mcp/mcp`

## 🎉 Summary

The Cloudflare Agents-based MCP implementation provides:

✅ **16 MCP tools** for D1, KV, R2, Workers, and Builds
✅ **OAuth 2.0 authentication** with dynamic client registration
✅ **SQLite-backed state** management per user
✅ **Scheduled tasks** support (coming soon)
✅ **Workflow integration** capabilities
✅ **Security hardening** with SQL validation and OAuth
✅ **Usage tracking** and statistics
✅ **CORS support** for external clients
✅ **Production-ready** deployment configuration

This modern implementation complements the existing SSE-based server and provides a path forward for advanced MCP features.
