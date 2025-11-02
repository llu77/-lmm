# 🚀 SymbolAI MCP Server - Deployment Guide

## 📋 Prerequisites

✅ GitHub OAuth App Created:
- **Client ID**: `Ov23lipQSLmCU6xDfHlg`
- **Enterprise**: `https://github.com/enterprises/symbolaico`
- **Client Secret**: (Get from GitHub OAuth App Settings)

✅ Cloudflare Account:
- **Account ID**: `85b01d19439ca53d3cfa740d2621a2bd`
- **API Token**: Ready with required permissions

---

## 🔧 Step 1: Complete GitHub OAuth App Setup

### For Local Development:

1. Go to: https://github.com/settings/applications/new
2. Create OAuth App with:
   ```
   Application name: SymbolAI MCP Server (Local)
   Homepage URL: http://localhost:8788
   Authorization callback URL: http://localhost:8788/callback
   ```
3. Note your **Client Secret**

### For Production:

1. Create another OAuth App:
   ```
   Application name: SymbolAI MCP Server (Production)
   Homepage URL: https://my-mcp-server-github-auth.<your-subdomain>.workers.dev
   Authorization callback URL: https://my-mcp-server-github-auth.<your-subdomain>.workers.dev/callback
   ```
2. Note the production **Client ID** and **Client Secret**

---

## 🔐 Step 2: Configure Secrets

### Local Development (.dev.vars):

File already created at `.dev.vars`:
```bash
GITHUB_CLIENT_ID=Ov23lipQSLmCU6xDfHlg
GITHUB_CLIENT_SECRET=<your-github-client-secret>
COOKIE_ENCRYPTION_KEY=a75f688be1404651e9f025cbcadbe25ff88da26073e2b0a27358ba974256dda1
```

**Action needed**: Replace `<your-github-client-secret>` with actual secret from GitHub

### Production Secrets:

Run these commands (requires network access):

```bash
# Set GitHub OAuth credentials
npx wrangler secret put GITHUB_CLIENT_ID
# Enter: <production-client-id>

npx wrangler secret put GITHUB_CLIENT_SECRET
# Enter: <production-client-secret>

npx wrangler secret put COOKIE_ENCRYPTION_KEY
# Enter: a75f688be1404651e9f025cbcadbe25ff88da26073e2b0a27358ba974256dda1
```

---

## 🗄️ Step 3: Create KV Namespace

### Create KV:

```bash
npx wrangler kv namespace create "OAUTH_KV"
```

Expected output:
```
🌀 Creating namespace with title "my-mcp-server-github-auth-OAUTH_KV"
✨ Success!
Add the following to your wrangler.jsonc:

[[kv_namespaces]]
binding = "OAUTH_KV"
id = "<YOUR_KV_ID>"
```

### Update wrangler.jsonc:

Add the KV namespace configuration:

```jsonc
{
  "name": "my-mcp-server-github-auth",
  "main": "src/index.ts",
  "compatibility_date": "2024-11-11",
  "compatibility_flags": ["nodejs_compat"],

  // Add this:
  "kv_namespaces": [
    {
      "binding": "OAUTH_KV",
      "id": "<YOUR_KV_ID_FROM_ABOVE>"
    }
  ]
}
```

---

## 🚀 Step 4: Deploy to Cloudflare

### Build and Deploy:

```bash
npm install
npm run deploy
```

Expected output:
```
✨ Compiled Worker successfully
🌍 Uploading...
✨ Success! Uploaded to Cloudflare
🌎 Published my-mcp-server-github-auth
   https://my-mcp-server-github-auth.<your-subdomain>.workers.dev
```

---

## 🧪 Step 5: Test Your MCP Server

### Using MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

1. Enter URL: `https://my-mcp-server-github-auth.<your-subdomain>.workers.dev/sse`
2. Click "Connect"
3. Browser opens → Authenticate with GitHub
4. Grant permissions
5. Inspector shows available tools

### Expected Tools:

- ✅ `add` - Add two numbers
- ✅ `userInfoOctokit` - Get GitHub user info
- ✅ `generateImage` - Generate image (if authorized)

---

## 🔌 Step 6: Connect to Claude Desktop

### Edit Claude Desktop Config:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add:

```json
{
  "mcpServers": {
    "symbolai-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://my-mcp-server-github-auth.<your-subdomain>.workers.dev/sse"
      ]
    }
  }
}
```

### Restart Claude Desktop

1. Restart the app
2. Browser opens for OAuth
3. Authenticate with GitHub
4. Tools appear in Claude 🔨

### Test in Claude:

```
"Use the add tool to calculate 23 + 19"
"Get my GitHub user info"
```

---

## 📊 Step 7: Monitor and Debug

### View Logs:

```bash
npx wrangler tail
```

### Check Deployments:

```bash
npx wrangler deployments list
```

### View in Dashboard:

```
https://dash.cloudflare.com/85b01d19439ca53d3cfa740d2621a2bd/workers/services/view/my-mcp-server-github-auth
```

---

## 🛠️ Troubleshooting

### Problem: "OAuth failed"

**Solution**:
- Check Client ID and Secret are correct
- Verify callback URL matches exactly
- Ensure KV namespace is configured

### Problem: "Cannot connect to MCP server"

**Solution**:
- Check deployment succeeded: `wrangler deployments list`
- Verify URL is correct (check for `/sse` endpoint)
- Check browser console for errors

### Problem: "Tools not showing"

**Solution**:
- Restart Claude Desktop
- Complete OAuth flow in browser
- Check MCP Inspector first to verify tools exist

---

## ✅ Checklist

- [ ] GitHub OAuth App created (Local)
- [ ] GitHub OAuth App created (Production)
- [ ] `.dev.vars` file configured with secrets
- [ ] Production secrets set via wrangler
- [ ] KV namespace created
- [ ] `wrangler.jsonc` updated with KV ID
- [ ] Deployed to Cloudflare Workers
- [ ] Tested with MCP Inspector
- [ ] Added to Claude Desktop config
- [ ] Successfully authenticated
- [ ] Tools working in Claude

---

## 📚 Resources

- **MCP Documentation**: https://modelcontextprotocol.io
- **Cloudflare Workers**: https://developers.cloudflare.com/workers
- **GitHub OAuth**: https://docs.github.com/en/apps/oauth-apps
- **Project README**: `./README.md`

---

**Status**: Ready for deployment ✅

**Next Action**: Get GitHub Client Secret and deploy!
