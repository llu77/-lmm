# 🏗️ MCP Architecture Overview

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Diagram](#component-diagram)
3. [Data Flow](#data-flow)
4. [Authentication Flow](#authentication-flow)
5. [API Endpoints](#api-endpoints)
6. [Security Model](#security-model)
7. [Performance Considerations](#performance-considerations)

---

## Architecture Overview

The SymbolAI MCP integration consists of **two main components**:

### 1. **MCP Client** (SymbolAI → Cloudflare)
- **Purpose**: SymbolAI Worker acts as an MCP client to Cloudflare's MCP servers
- **Protocol**: HTTP REST API
- **Library**: `src/lib/mcp-client.ts` (750+ lines)
- **Functionality**: Query D1, manage KV/R2, deploy Workers, monitor builds

### 2. **MCP Server** (Clients → SymbolAI)
- **Purpose**: Expose SymbolAI's MCP functionality to external clients (Claude Desktop, Cursor, etc.)
- **Protocol**: SSE (Server-Sent Events) + HTTP POST
- **Endpoint**: `/api/mcp/sse`
- **Functionality**: Wrap Cloudflare MCP operations in standard MCP protocol

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         External MCP Clients                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │Claude Desktop│  │    Cursor    │  │   Windsurf   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                  │
│                            │                                      │
│                    (mcp-remote client)                            │
│                            │                                      │
│                    SSE + HTTP POST                                │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SymbolAI Worker                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              MCP Server (SSE Endpoint)                      │ │
│  │                  /api/mcp/sse                               │ │
│  │  • Implements Model Context Protocol                        │ │
│  │  • Handles tools/list, tools/call                           │ │
│  │  • Handles resources/list, resources/read                   │ │
│  │  • Authentication: Admin RBAC                               │ │
│  └────────────────┬───────────────────────────────────────────┘ │
│                   │                                              │
│  ┌────────────────▼───────────────────────────────────────────┐ │
│  │              MCP Client Library                             │ │
│  │              src/lib/mcp-client.ts                          │ │
│  │  • MCPClient class                                          │ │
│  │  • Token management                                         │ │
│  │  • Request handling with retry logic                       │ │
│  │  • SQL validation                                           │ │
│  └────────────────┬───────────────────────────────────────────┘ │
│                   │                                              │
│                   │ HTTP REST API                                │
└───────────────────┼──────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare MCP Servers                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Bindings    │  │    Builds    │  │Observability │          │
│  │ MCP Server   │  │  MCP Server  │  │  MCP Server  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Cloudflare Infrastructure                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   D1    │  │   KV    │  │   R2    │  │ Workers │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Scenario 1: External Client Query (Claude Desktop → SymbolAI → Cloudflare)

```
┌──────────────┐
│Claude Desktop│
└──────┬───────┘
       │ 1. "List D1 databases"
       ▼
┌──────────────┐
│  mcp-remote  │
└──────┬───────┘
       │ 2. POST /api/mcp/sse
       │    { method: "tools/call", params: { name: "d1_list_databases" }}
       ▼
┌────────────────────────────────┐
│   SymbolAI MCP Server          │
│   /api/mcp/sse (POST handler)  │
└──────┬─────────────────────────┘
       │ 3. handleMCPMethod()
       │    → case 'd1_list_databases'
       ▼
┌────────────────────────────────┐
│   MCP Client Library           │
│   mcpClient.listD1Databases()  │
└──────┬─────────────────────────┘
       │ 4. GET https://bindings.mcp.cloudflare.com/mcp
       │    Authorization: Bearer {cloudflare_token}
       ▼
┌──────────────────────┐
│ Cloudflare Bindings  │
│    MCP Server        │
└──────┬───────────────┘
       │ 5. Query Cloudflare API
       ▼
┌──────────────────────┐
│  Cloudflare D1       │
└──────┬───────────────┘
       │ 6. Return database list
       ▼
┌────────────────────────────────┐
│   Response travels back        │
│   through the chain            │
└────────────────────────────────┘
```

### Scenario 2: Web Dashboard Query (Browser → SymbolAI → Cloudflare)

```
┌──────────────┐
│   Browser    │
│ /mcp-tools   │
└──────┬───────┘
       │ 1. User clicks "Query D1"
       │    POST /api/mcp/d1/query
       │    { databaseId: "...", sql: "SELECT * FROM users" }
       ▼
┌────────────────────────────────┐
│   REST API Endpoint            │
│   /api/mcp/d1/query.ts         │
└──────┬─────────────────────────┘
       │ 2. createAuthenticatedMCPClient()
       │    → validateSQL()
       ▼
┌────────────────────────────────┐
│   MCP Client Library           │
│   mcpClient.queryD1Database()  │
└──────┬─────────────────────────┘
       │ 3. POST to Cloudflare Bindings MCP
       ▼
┌──────────────────────┐
│ Cloudflare Bindings  │
│    MCP Server        │
└──────┬───────────────┘
       │ 4. Execute SQL on D1
       ▼
┌──────────────────────┐
│  Cloudflare D1       │
└──────┬───────────────┘
       │ 5. Return query results
       ▼
┌────────────────────────────────┐
│   Results displayed in         │
│   browser dashboard            │
└────────────────────────────────┘
```

---

## Authentication Flow

### Initial Setup (One-time)

```
┌──────────────┐
│    Admin     │
└──────┬───────┘
       │ 1. Navigate to /mcp-tools
       │ 2. Click "Connect to MCP"
       ▼
┌────────────────────────────────┐
│   POST /api/mcp/auth/connect   │
│   • Generates OAuth state      │
│   • Returns connection URL     │
└──────┬─────────────────────────┘
       │ 3. Display instructions:
       │    - Create Cloudflare API token
       │    - Copy Account ID
       ▼
┌────────────────────────────────┐
│    Admin follows instructions  │
│    • Creates API token         │
│    • Copies Account ID         │
└──────┬─────────────────────────┘
       │ 4. Submit credentials
       │    POST /api/mcp/auth/callback
       │    { apiToken: "...", accountId: "..." }
       ▼
┌────────────────────────────────┐
│  /api/mcp/auth/callback.ts     │
│  • Validates API token         │
│  • Tests connection            │
│  • Stores token in KV          │
└──────┬─────────────────────────┘
       │ 5. Success!
       │    Token stored: mcp_token:{userId}
       ▼
┌────────────────────────────────┐
│   MCP features now available   │
└────────────────────────────────┘
```

### Subsequent Requests

```
┌──────────────┐
│    Admin     │
└──────┬───────┘
       │ 1. Any MCP request
       │    (includes session cookie)
       ▼
┌────────────────────────────────┐
│   requireAdminRole()           │
│   • Validates session          │
│   • Checks admin role          │
└──────┬─────────────────────────┘
       │ 2. Session valid, admin=true
       ▼
┌────────────────────────────────┐
│  createAuthenticatedMCPClient()│
│  • Retrieves token from KV     │
│  • Creates MCPClient instance  │
└──────┬─────────────────────────┘
       │ 3. Token retrieved
       ▼
┌────────────────────────────────┐
│   MCP Client makes request     │
│   with Cloudflare API token    │
└────────────────────────────────┘
```

---

## API Endpoints

### MCP Server Endpoints (for External Clients)

| Endpoint | Method | Protocol | Purpose |
|----------|--------|----------|---------|
| `/api/mcp/sse` | GET | SSE | Establish SSE connection for MCP protocol |
| `/api/mcp/sse` | POST | HTTP | Handle MCP method calls (tools/call, etc.) |

**Supported MCP Methods:**
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `resources/list` - List available resources
- `resources/read` - Read a resource

**Available Tools:**
- `d1_list_databases` - List D1 databases
- `d1_query` - Execute SQL query
- `kv_list_namespaces` - List KV namespaces
- `r2_list_buckets` - List R2 buckets
- `workers_list` - List Workers
- `builds_list` - List deployments

### REST API Endpoints (for Web Dashboard)

#### Authentication
- `POST /api/mcp/auth/connect` - Initiate MCP connection
- `POST /api/mcp/auth/callback` - Save API token
- `GET /api/mcp/auth/status` - Check connection status
- `POST /api/mcp/auth/disconnect` - Disconnect MCP

#### D1 Operations
- `GET /api/mcp/d1/list` - List databases
- `POST /api/mcp/d1/query` - Execute query
- `GET /api/mcp/d1/info?id={uuid}` - Get database info

#### KV Operations
- `GET /api/mcp/kv/list` - List namespaces

#### R2 Operations
- `GET /api/mcp/r2/list` - List buckets

#### Workers Operations
- `GET /api/mcp/workers/list` - List Workers

#### Builds Operations
- `GET /api/mcp/builds/list?limit={n}&worker={name}` - List builds
- `GET /api/mcp/builds/logs?id={uuid}` - Get build logs

---

## Security Model

### Layer 1: Network Level
```
┌────────────────────────────────┐
│   HTTPS/TLS Encryption         │
│   • All traffic encrypted      │
│   • Certificate validation     │
└────────────────────────────────┘
```

### Layer 2: Authentication
```
┌────────────────────────────────┐
│   Session-based Auth           │
│   • Session cookie required    │
│   • Session validated in KV    │
│   • userId extracted           │
└────────────────────────────────┘
```

### Layer 3: Authorization
```
┌────────────────────────────────┐
│   RBAC (Role-Based Access)     │
│   • requireAdminRole() check   │
│   • Only admin users allowed   │
│   • Role verified in D1        │
└────────────────────────────────┘
```

### Layer 4: MCP Token Validation
```
┌────────────────────────────────┐
│   Cloudflare Token Check       │
│   • Token retrieved from KV    │
│   • Token validated on use     │
│   • Expiry checked             │
└────────────────────────────────┘
```

### Layer 5: Input Validation
```
┌────────────────────────────────┐
│   Request Validation           │
│   • SQL injection prevention   │
│   • UUID format validation     │
│   • Parameter sanitization     │
│   • Limit clamping (1-100)     │
└────────────────────────────────┘
```

### Layer 6: Audit Logging
```
┌────────────────────────────────┐
│   Audit Trail                  │
│   • All queries logged to D1   │
│   • User ID recorded           │
│   • Timestamp recorded         │
│   • IP address recorded        │
└────────────────────────────────┘
```

### Security Features Summary

| Feature | Implementation | Location |
|---------|---------------|----------|
| **SQL Injection Prevention** | `validateSQL()` | `mcp-client.ts:600+` |
| **UUID Validation** | Regex pattern | `d1/info.ts:42`, `d1/query.ts:43` |
| **Account ID Validation** | 32-char hex | `auth/callback.ts:60` |
| **Token Length Validation** | 10-500 chars | `auth/callback.ts:45` |
| **Worker Name Sanitization** | Alphanumeric only | `builds/list.ts:36` |
| **Build ID Validation** | Alphanumeric + hyphens | `builds/logs.ts:28` |
| **Limit Clamping** | 1-100 range | `builds/list.ts:33` |
| **Admin-Only Access** | `requireAdminRole()` | All MCP endpoints |
| **Audit Logging** | D1 insert | `d1/query.ts:80+` |

---

## Performance Considerations

### 1. Token Management

**Problem**: Repeated KV reads for token retrieval

**Solution**: In-memory caching (future enhancement)
```typescript
const tokenCache = new Map<string, { token: string; expiresAt: number }>();
```

### 2. MCP Request Retries

**Implementation**: Exponential backoff
```typescript
const delays = [2000, 4000, 8000]; // 2s, 4s, 8s
for (let i = 0; i < retries; i++) {
  try {
    return await makeRequest();
  } catch (error) {
    if (i < retries - 1) await sleep(delays[i]);
  }
}
```

### 3. SQL Query Limits

**Enforcement**: Maximum 1000 rows without explicit LIMIT
```typescript
if (!sql.includes('LIMIT') && !sql.startsWith('SELECT COUNT(')) {
  sql += ' LIMIT 1000';
}
```

### 4. SSE Connection Management

**Keepalive**: 30-second heartbeat to prevent connection timeout
```typescript
setInterval(() => {
  controller.enqueue(encoder.encode(': keepalive\n\n'));
}, 30000);
```

### 5. Request Timeouts

**Default**: 30 seconds for all MCP requests
```typescript
const timeout = options.timeout || 30000;
```

---

## Scalability Patterns

### Horizontal Scaling

✅ **Stateless Architecture**
- No local state stored in Workers
- All state in KV/D1
- Can scale to unlimited concurrent requests

✅ **Global Distribution**
- Workers run on Cloudflare's global network
- Low latency worldwide
- Automatic failover

### Vertical Scaling

✅ **Efficient Resource Usage**
- Minimal memory footprint
- Fast cold starts (<10ms)
- CPU-efficient TypeScript

### Rate Limiting (Future Enhancement)

```typescript
// Per-user rate limiting
const rateLimitKey = `ratelimit:mcp:${userId}`;
const count = await SESSIONS.get(rateLimitKey);
if (count && parseInt(count) > 100) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

---

## Error Handling

### Error Hierarchy

```
┌─────────────────────────────────────┐
│        Application Errors           │
├─────────────────────────────────────┤
│  • Network Errors (retryable)       │
│  • Timeout Errors (retryable)       │
│  • Authentication Errors            │
│  • Authorization Errors             │
│  • Validation Errors                │
│  • SQL Errors                       │
│  • MCP Protocol Errors              │
└─────────────────────────────────────┘
```

### Error Response Format

**REST API:**
```json
{
  "error": "Human-readable error message",
  "details": "Technical details (in development only)",
  "code": "ERROR_CODE"
}
```

**MCP Protocol:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Internal error",
    "data": "Additional error details"
  },
  "id": "request-id"
}
```

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `-32600` | Invalid Request | Fix JSON-RPC format |
| `-32601` | Method Not Found | Check method name |
| `-32602` | Invalid Params | Check parameters |
| `-32603` | Internal Error | Check server logs |
| `-32001` | MCP Not Connected | Connect MCP first |

---

## Monitoring and Observability

### Logging Points

1. **Authentication**: All auth attempts logged
2. **MCP Requests**: All requests to Cloudflare logged
3. **SQL Queries**: All queries logged to audit table
4. **Errors**: All errors logged with stack traces
5. **Performance**: Request duration tracked

### Metrics to Track (Future)

- Request rate (requests/minute)
- Error rate (errors/total requests)
- P50, P95, P99 latency
- Token refresh rate
- SSE connection count
- Query execution time

### Health Checks

```bash
# MCP Server health
curl https://your-domain.workers.dev/api/mcp/auth/status

# Database health
curl -X POST https://your-domain.workers.dev/api/mcp/d1/query \
  -d '{"databaseId":"...","sql":"SELECT 1"}'
```

---

## Deployment Architecture

```
┌────────────────────────────────────────────────────────┐
│              Cloudflare Global Network                 │
│  ┌──────────────────────────────────────────────────┐ │
│  │         SymbolAI Worker (Astro SSR)              │ │
│  │  • Runs on ~300+ edge locations globally         │ │
│  │  • Automatic scaling                             │ │
│  │  • 0ms cold starts (after first request)         │ │
│  └──────────────────────┬───────────────────────────┘ │
│                         │                              │
│  ┌──────────────────────┼───────────────────────────┐ │
│  │            Cloudflare Bindings                   │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │ │
│  │  │   D1     │  │   KV     │  │   R2     │       │ │
│  │  │Database  │  │ Storage  │  │ Storage  │       │ │
│  │  └──────────┘  └──────────┘  └──────────┘       │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Production Considerations

✅ **Environment Variables**
```toml
# wrangler.toml
[vars]
ENVIRONMENT = "production"

# Secrets (set via: wrangler secret put)
# ANTHROPIC_API_KEY
# (MCP tokens stored in KV, not env vars)
```

✅ **Database Migrations**
```bash
# Run migrations before deploy
wrangler d1 execute DB --file=migrations/001_create_mcp_audit.sql
```

✅ **Monitoring**
```bash
# View real-time logs
wrangler tail symbolai-worker --format pretty
```

✅ **Rollback Strategy**
```bash
# Rollback to previous version
wrangler rollback symbolai-worker
```

---

## Future Enhancements

### Phase 2: Performance
- [ ] Token caching in memory
- [ ] Connection pooling for MCP requests
- [ ] Query result caching
- [ ] Batch request support

### Phase 3: Features
- [ ] Scheduled queries
- [ ] Query templates library
- [ ] Visual query builder
- [ ] Real-time analytics dashboard
- [ ] Export to CSV/Excel

### Phase 4: Security
- [ ] Per-user rate limiting
- [ ] IP whitelisting
- [ ] Query approval workflow
- [ ] Encrypted audit logs
- [ ] Compliance reporting

### Phase 5: Collaboration
- [ ] Share queries with team
- [ ] Comment on queries
- [ ] Query version history
- [ ] Role-based query access

---

## References

### Internal Documentation
- [MCP Integration Guide](./MCP_INTEGRATION_GUIDE.md)
- [MCP Client Configuration](./MCP_CLIENT_CONFIGURATION.md)
- [MCP Client Library README](./symbolai-worker/src/lib/MCP_CLIENT_README.md)
- [RBAC System](./RBAC_SYSTEM.md)

### External Resources
- [Model Context Protocol Specification](https://modelcontextprotocol.io/docs/specification)
- [Cloudflare MCP Servers](https://github.com/cloudflare/mcp-server-cloudflare)
- [mcp-remote Client](https://github.com/anthropics/mcp-remote)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers)

---

**Last Updated**: 2025-11-02

**Version**: 1.0.0

**Status**: ✅ Production Ready
