# MCP Agent Worker

A Cloudflare Worker implementation using the **Agents SDK** and **MCP (Model Context Protocol) Client Manager**. This project provides a React-based frontend for managing and interacting with MCP servers.

## Features

- 🚀 **Cloudflare Agents SDK** - Built on top of Cloudflare's Agents framework
- 🔌 **MCP Client Manager** - Manage multiple MCP server connections
- ⚛️ **React Frontend** - Modern UI for server management
- 🔄 **Real-time Updates** - WebSocket-based state synchronization
- 🔐 **OAuth Support** - Built-in authentication flow for MCP servers
- 📊 **Server Monitoring** - View tools, prompts, and resources from connected servers

## Architecture

### Backend (Worker)

The worker is built using the Cloudflare Agents SDK:

```typescript
import { Agent, routeAgentRequest } from "agents";
import { MCPClientManager } from "agents/mcp/client";

export class MyAgent extends Agent<Env, never> {
  mcp = new MCPClientManager("my-agent", "1.0.0");

  async onRequest(request: Request): Promise<Response> {
    // Handle API requests
  }
}
```

**Key Components:**
- `MyAgent` - Main agent class extending `Agent<Env, never>`
- `MCPClientManager` - Manages MCP server connections
- `addMcpServer()` - Add new MCP server connections
- `getMcpServers()` - Get current server state

### Frontend (React)

The frontend provides a user interface for:
- Adding new MCP servers
- Viewing server connection status
- Managing OAuth authentication
- Displaying available tools, prompts, and resources

**Key Hooks:**
- `useAgent()` - Connect to the agent and receive real-time updates
- `agentFetch()` - Make requests to the agent

## Project Structure

```
mcp-agent-worker/
├── src/
│   ├── index.ts        # Worker entry point
│   ├── App.tsx         # React application
│   ├── styles.css      # Application styles
│   └── index.html      # HTML template
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript configuration
├── wrangler.toml       # Cloudflare Workers configuration
└── README.md          # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for deployment)
- Wrangler CLI

### Installation

1. Install dependencies:

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

This will start the worker locally on `http://localhost:8787`.

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

For production deployment:

```bash
wrangler deploy --env production
```

## Configuration

### Environment Variables

Update `wrangler.toml` to configure:

```toml
[vars]
HOST = "http://localhost:8787"  # Local development

[env.production.vars]
HOST = "https://your-domain.com"  # Production
```

### Durable Objects

The agent uses Durable Objects for state management:

```toml
[[durable_objects.bindings]]
name = "MyAgent"
class_name = "MyAgent"
```

## API Endpoints

### Add MCP Server

**POST** `/add-mcp`

Add a new MCP server connection.

**Request Body:**
```json
{
  "name": "server-name",
  "url": "https://mcp-server-url.com"
}
```

**Response:**
```
Ok (200)
```

## MCP Server State

The application manages MCP server state including:

- **Servers** - Connected MCP servers with authentication status
- **Tools** - Available tools from all connected servers
- **Prompts** - Available prompts from all connected servers
- **Resources** - Available resources from all connected servers

### Server States

- `connecting` - Initial connection in progress
- `authenticating` - OAuth flow required
- `ready` - Server connected and ready
- `error` - Connection failed

## Frontend Usage

### Adding a Server

1. Enter the server name
2. Enter the server URL
3. Click "Add MCP Server"
4. If authentication is required, click "Authorize" and complete OAuth flow

### Viewing Server Data

The UI displays:
- **Server List** - All connected servers with status
- **Tools** - Available MCP tools with schemas
- **Prompts** - Available prompts with metadata
- **Resources** - Available resources with URIs

## Development Notes

### Session Management

The app uses `nanoid` to generate unique session IDs stored in localStorage:

```typescript
let sessionId = localStorage.getItem("sessionId");
if (!sessionId) {
  sessionId = nanoid(8);
  localStorage.setItem("sessionId", sessionId);
}
```

### Real-time Updates

The `useAgent` hook provides real-time updates via WebSocket:

```typescript
const agent = useAgent({
  agent: "my-agent",
  name: sessionId!,
  onMcpUpdate: (mcpServers: MCPServersState) => {
    setMcpState(mcpServers);
  },
});
```

## Troubleshooting

### Worker fails to start

- Ensure all dependencies are installed: `npm install`
- Check TypeScript compilation: `npm run build`
- Verify wrangler.toml configuration

### MCP Server connection fails

- Verify server URL is accessible
- Check server supports MCP protocol
- Review authentication requirements

### OAuth popup blocked

- Enable popups for the application domain
- Check browser console for errors

## References

- [Cloudflare Agents SDK](https://developers.cloudflare.com/workers/agents/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

## License

MIT

## Support

For issues and questions:
- Check the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- Review [MCP specification](https://spec.modelcontextprotocol.io/)
- Open an issue in the repository
