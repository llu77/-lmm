# MCP Server GitHub Auth - Deployment Guide

This guide provides step-by-step instructions for deploying the MCP Server with GitHub OAuth authentication to Cloudflare Workers.

## Prerequisites

- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler` or use `npx wrangler`)
- GitHub OAuth App created (see setup instructions below)
- Node.js 18.20.8+ and npm 9+

## GitHub OAuth App Setup

Before deploying, you need to create a GitHub OAuth App:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App" or "New GitHub App"
3. Fill in the application details:
   - **Application name**: Your MCP Server name (e.g., "My MCP Server")
   - **Homepage URL**: `https://my-mcp-server-github-auth.<your-subdomain>.workers.dev`
   - **Authorization callback URL**: `https://my-mcp-server-github-auth.<your-subdomain>.workers.dev/callback`
4. Click "Register application"
5. Note down your **Client ID**
6. Generate a new **Client Secret** and note it down

For local development, create a separate OAuth App with:
- Homepage URL: `http://localhost:8788`
- Authorization callback URL: `http://localhost:8788/callback`

## Deployment Steps

### 1. Navigate to the MCP Server Directory

```bash
cd my-mcp-server-github-auth
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser window for you to authenticate with Cloudflare.

### 4. Set Required Secrets

Set the following secrets (Wrangler will prompt you to enter each value):

```bash
# Set GitHub OAuth Client ID
npx wrangler secret put GITHUB_CLIENT_ID

# Set GitHub OAuth Client Secret
npx wrangler secret put GITHUB_CLIENT_SECRET

# Set Cookie Encryption Key (generate with: openssl rand -hex 32)
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

**Note**: When setting secrets, enter the actual values when prompted by Wrangler. Do not include quotes.

### 5. Create and Initialize D1 Database

The D1 database is used for storing session data, tool usage logs, and audit trails.

```bash
# Create the D1 database (if not already created)
npx wrangler d1 create symbolai-financial-db

# Initialize the database schema
npx wrangler d1 execute symbolai-financial-db --file=./schema.sql
```

**Note**: If the database already exists, you can skip the creation step and just run the schema initialization.

### 6. Deploy the Worker

```bash
npx wrangler deploy
```

This will build and deploy your MCP server to Cloudflare Workers.

### 7. Verify Deployment

After deployment, Wrangler will output the URL of your worker. It should look like:

```
https://my-mcp-server-github-auth.<your-subdomain>.workers.dev
```

Test the deployment by visiting the URL or using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

Enter your worker URL with the SSE endpoint: `https://my-mcp-server-github-auth.<your-subdomain>.workers.dev/sse`

## Complete Deployment Command

For convenience, you can run all deployment steps in sequence (after setting up your GitHub OAuth App):

```bash
cd my-mcp-server-github-auth && \
npx wrangler login && \
npx wrangler secret put GITHUB_CLIENT_ID && \
npx wrangler secret put GITHUB_CLIENT_SECRET && \
npx wrangler secret put COOKIE_ENCRYPTION_KEY && \
npx wrangler d1 execute symbolai-financial-db --file=./schema.sql && \
npx wrangler deploy
```

## Local Development

For local development:

1. Create a `.dev.vars` file based on `.dev.vars.example`:

```bash
cp .dev.vars.example .dev.vars
```

2. Edit `.dev.vars` and add your development OAuth credentials:

```env
GITHUB_CLIENT_ID=your_development_github_client_id
GITHUB_CLIENT_SECRET=your_development_github_client_secret
COOKIE_ENCRYPTION_KEY=your_random_encryption_key
```

3. Start the development server:

```bash
npm run dev
# or
npx wrangler dev
```

The server will be available at `http://localhost:8788`

## Testing with MCP Inspector

To test your deployed MCP server:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Run the inspector
mcp-inspector
```

Then enter your server URL: `https://my-mcp-server-github-auth.<your-subdomain>.workers.dev/sse`

## Connecting to Claude Desktop

To use your MCP server with Claude Desktop:

1. Open Claude Desktop settings
2. Navigate to Developer → Edit Config
3. Add your server configuration:

```json
{
  "mcpServers": {
    "github-mcp": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://my-mcp-server-github-auth.<your-subdomain>.workers.dev/sse"
      ]
    }
  }
}
```

4. Restart Claude Desktop
5. Complete the OAuth authentication flow when prompted

## Updating the Deployment

To update your deployment after making changes:

```bash
cd my-mcp-server-github-auth
npx wrangler deploy
```

## Database Migrations

If you need to update the database schema:

1. Create a new migration SQL file
2. Execute it against your D1 database:

```bash
npx wrangler d1 execute symbolai-financial-db --file=./migrations/your-migration.sql
```

## Monitoring and Logs

View real-time logs from your worker:

```bash
npx wrangler tail
```

View logs in the Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select your worker
3. Click on "Logs" tab

## Troubleshooting

### Secret Not Found

If you get errors about missing secrets, ensure you've set all required secrets:

```bash
npx wrangler secret list
```

You should see: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, COOKIE_ENCRYPTION_KEY

### Database Errors

If you encounter database errors, verify the database exists and schema is applied:

```bash
# List databases
npx wrangler d1 list

# Test database connection
npx wrangler d1 execute symbolai-financial-db --command="SELECT 1"

# Re-apply schema if needed
npx wrangler d1 execute symbolai-financial-db --file=./schema.sql
```

### OAuth Callback Errors

Ensure your GitHub OAuth App's callback URL matches your deployed worker URL:
- Production: `https://my-mcp-server-github-auth.<your-subdomain>.workers.dev/callback`
- Development: `http://localhost:8788/callback`

## Security Considerations

- Never commit secrets or `.dev.vars` to version control
- Use strong, random values for `COOKIE_ENCRYPTION_KEY` (32+ characters)
- Regularly rotate your GitHub OAuth Client Secret
- Monitor audit logs for suspicious activity
- Keep dependencies up to date: `npm update`

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)

## Support

For issues and questions:
- Check the [README.md](./README.md) for general information
- Review the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- Open an issue on the repository

---

**Last Updated**: November 2025
**Version**: 1.0.0
