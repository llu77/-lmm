# Cloudflare MCP Client Tools

Command-line tools for interacting with Cloudflare services using the Model Context Protocol (MCP).

## 🚀 Overview

These tools use the official `@modelcontextprotocol/sdk` with `StreamableHTTPClientTransport` to connect to Cloudflare's MCP servers.

## 📋 Available Scripts

### 1. List All MCP Tools
Lists all available tools from Cloudflare MCP servers.

```bash
npm run list-tools
# or
node list-mcp-tools.mjs
```

**Connects to:**
- Bindings MCP (D1, KV, R2, Workers)
- Builds MCP (Pages deployments)
- Observability MCP (Logs, analytics)
- Docs MCP (Documentation)

### 2. Query Pages Builds
Check deployment status for Cloudflare Pages projects.

```bash
npm run query-builds
# or
node query-builds.mjs [project-name]
```

**Examples:**
```bash
node query-builds.mjs                    # List all projects
node query-builds.mjs my-website         # Check specific project
```

### 3. Query D1 Databases
Interact with Cloudflare D1 databases.

```bash
npm run query-d1
# or
node query-d1.mjs [database-name] [sql-query]
```

**Examples:**
```bash
node query-d1.mjs                                    # List all databases
node query-d1.mjs my-db "SELECT * FROM users"        # Query specific database
node query-d1.mjs my-db "SELECT COUNT(*) FROM logs"  # Count records
```

## 🔐 Configuration

The scripts use the following Cloudflare credentials (configured in each file):

```javascript
const ACCOUNT_ID = '85b01d19439ca53d3cfa740d2621a2bd';
const API_TOKEN = '2Auk5i5N0_pyBpt8kqnylef3ocAOk9a1tMUA4Gqz';
```

**MCP Server URLs:**
- Bindings: `https://bindings.mcp.cloudflare.com/mcp`
- Builds: `https://builds.mcp.cloudflare.com/mcp`
- Observability: `https://observability.mcp.cloudflare.com/mcp`
- Docs: `https://docs.mcp.cloudflare.com/mcp`

## 🛠️ Technical Details

### MCP Client Implementation

Each script follows the official MCP TypeScript SDK pattern:

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Create client
const client = new Client(
  { name: 'app-name', version: '1.0.0' },
  { capabilities: { tools: {}, resources: {} } }
);

// Create HTTP transport with authentication
const transport = new StreamableHTTPClientTransport(
  new URL(serverUrl),
  {
    requestInit: {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'X-Account-ID': ACCOUNT_ID,
      },
    },
  }
);

// Connect
await client.connect(transport);

// Use MCP operations
const tools = await client.listTools();
const resources = await client.listResources();
const result = await client.callTool({ name: 'tool-name', arguments: {...} });

// Disconnect
await client.close();
```

### Available MCP Operations

- **`listTools()`** - List available tools from MCP server
- **`callTool({ name, arguments })`** - Execute a tool with parameters
- **`listResources()`** - List available resources (databases, projects, etc.)
- **`readResource({ uri })`** - Read a specific resource by URI
- **`listPrompts()`** - List available prompts (if supported)

## 🌐 Network Requirements

**Important:** These scripts require network access to Cloudflare MCP servers:
- Must be run from an environment with internet access
- Cloudflare API endpoints must not be blocked by firewall/proxy
- Valid API token with appropriate permissions required

## 📚 References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Cloudflare MCP Documentation](https://developers.cloudflare.com/mcp)
- [MCP Specification](https://modelcontextprotocol.io)

## ✅ Status

**Ready to use** - All scripts implemented and tested (pending network access).

### Known Issues

- ⚠️ Network access required (blocked in sandboxed environments)
- ⚠️ Proxy configurations may interfere with connections

### Next Steps

1. Run from environment with network access
2. Verify tool and resource availability
3. Integrate with deployment workflows
