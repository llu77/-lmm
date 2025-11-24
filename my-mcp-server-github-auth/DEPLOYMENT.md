# MCP Server Deployment Guide

Complete guide for deploying the MCP server with SSH Key Authentication and Event Streaming.

## 🚀 Quick Start

Use the automated deployment script:

```bash
cd my-mcp-server-github-auth
./deploy.sh
```

Or follow the manual steps below.

---

## 📋 Prerequisites

1. **Cloudflare Account**
   - Sign up at https://dash.cloudflare.com
   - Get your Account ID from the dashboard

2. **GitHub OAuth App** (for GitHub auth)
   - Create at: https://github.com/settings/developers
   - Homepage URL: `https://<your-worker>.workers.dev`
   - Callback URL: `https://<your-worker>.workers.dev/callback`
   - Save Client ID and Client Secret

3. **Cloudflare Access** (for SSH auth)
   - Configure SSH short-lived certificates
   - Note your Access Application Client ID

4. **Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

---

## 🔧 Configuration

### 1. Environment Bindings

Already configured in `wrangler.jsonc`:

```json
{
  "kv_namespaces": [{
    "binding": "OAUTH_KV",
    "id": "57a4eb48d4f047e7aea6b4692e174894"
  }],
  "d1_databases": [{
    "binding": "DB",
    "database_name": "symbolai-financial-db",
    "database_id": "3897ede2-ffc0-4fe8-8217-f9607c89bef2"
  }],
  "pipelines": [{
    "pipeline": "7e02e214a91249d38d81289cf7649b99",
    "binding": "UU_STREAM"
  }],
  "ai": {
    "binding": "AI"
  },
  "vpc_services": [{
    "binding": "VPC_SERVICE",
    "service_id": "019a6a59-cbb4-7031-9840-e79c64aeae7f",
    "remote": true
  }]
}
```

### 2. Secrets

Set the following secrets (never commit these!):

```bash
# GitHub OAuth credentials
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

# Cookie encryption (generate with: openssl rand -hex 32)
wrangler secret put COOKIE_ENCRYPTION_KEY
```

### 3. D1 Database

Apply the database schema:

```bash
npx wrangler d1 execute symbolai-financial-db --file=./schema.sql
```

Verify the schema was applied:

```bash
npx wrangler d1 execute symbolai-financial-db --command="SELECT name FROM sqlite_master WHERE type='table'"
```

Expected output:
- `Uu_sink`

### 4. Cloudflare Pipeline

Configure the pipeline sink:

1. Go to **Cloudflare Dashboard** → **Pipelines**
2. Find pipeline: `7e02e214a91249d38d81289cf7649b99`
3. Add this sink query:
   ```sql
   INSERT INTO Uu_sink SELECT * FROM Uu_stream;
   ```

This query runs continuously and streams events to D1.

---

## 🚢 Deployment

### Deploy to Production

```bash
npx wrangler deploy
```

This will:
- Build and bundle your worker
- Upload to Cloudflare Workers
- Activate all bindings (KV, D1, Pipeline, AI)
- Output your worker URL

### Deploy to Preview/Staging

```bash
npx wrangler deploy --env preview
```

---

## ✅ Post-Deployment Verification

### 1. Test Health Check

```bash
curl https://<your-worker>.workers.dev/
```

### 2. Test Authentication Endpoints

**GitHub OAuth:**
```bash
curl -I https://<your-worker>.workers.dev/authorize?client_id=test&redirect_uri=http://localhost&response_type=code&scope=openid
```

**SSH Key Auth:**
```bash
curl -I https://<your-worker>.workers.dev/ssh-authorize?client_id=test&redirect_uri=http://localhost&response_type=code&scope=openid \
  -H "CF-Access-JWT-Assertion: <your-jwt>" \
  -H "CF-Access-Client-Id: 20b80e2b331f2ee4c6d32008bf496614.access"
```

### 3. Test MCP Endpoints

**Streamable-HTTP (recommended):**
```bash
curl https://<your-worker>.workers.dev/mcp
```

**SSE (deprecated):**
```bash
curl https://<your-worker>.workers.dev/sse
```

### 4. Test Event Streaming

**Send test event to pipeline:**
```bash
curl -X POST https://7e02e214a91249d38d81289cf7649b99.ingest.cloudflare.com \
  -H "Content-Type: application/json" \
  -d '[{
    "user_id": {"login": "test", "email": "test@example.com"},
    "event_name": "test_event",
    "timestamp": "2025-11-24T15:00:00.000Z"
  }]'
```

**Check if events reached D1:**
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT COUNT(*) as event_count FROM Uu_sink"
```

**View recent events:**
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM Uu_sink ORDER BY created_at DESC LIMIT 10"
```

### 5. Monitor Logs

```bash
npx wrangler tail
```

Filter for specific events:
```bash
npx wrangler tail --format pretty | grep "auth_"
```

---

## 🔐 Authentication Setup

### GitHub OAuth Flow

1. User visits: `https://<your-worker>.workers.dev/authorize`
2. Redirected to GitHub for authentication
3. GitHub redirects back to: `https://<your-worker>.workers.dev/callback`
4. Worker exchanges code for access token
5. User authenticated, token issued

### SSH Key Authentication Flow

1. User visits: `https://<your-worker>.workers.dev/ssh-authorize`
2. Cloudflare Access validates SSH certificate
3. Worker receives CF-Access headers
4. Worker validates JWT and client ID
5. User authenticated, token issued

---

## 📊 Monitoring & Analytics

### View Authentication Events

```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM auth_events ORDER BY timestamp DESC LIMIT 20"
```

### View User Activity

```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM user_activity_summary ORDER BY total_events DESC"
```

### View Tool Performance

```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM tool_performance ORDER BY invocations DESC"
```

### View Recent Failures

```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM recent_auth_failures"
```

### Daily Statistics

```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM daily_event_stats WHERE date >= date('now', '-7 days') ORDER BY date DESC"
```

---

## 🐛 Troubleshooting

### Issue: Secrets not set

**Error:** `Missing required secret: GITHUB_CLIENT_ID`

**Solution:**
```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
```

### Issue: D1 database not found

**Error:** `No such binding: DB`

**Solution:**
```bash
# Verify database exists
npx wrangler d1 list | grep symbolai-financial-db

# If not, create it
npx wrangler d1 create symbolai-financial-db

# Update wrangler.jsonc with the new database_id
```

### Issue: Pipeline not receiving events

**Symptoms:** Events not appearing in D1

**Solution:**
1. Check pipeline configuration in dashboard
2. Verify sink query is active: `INSERT INTO Uu_sink SELECT * FROM Uu_stream;`
3. Test direct ingest:
   ```bash
   curl -X POST https://7e02e214a91249d38d81289cf7649b99.ingest.cloudflare.com \
     -H "Content-Type: application/json" \
     -d '[{"user_id": {"test": "data"}, "event_name": "test"}]'
   ```
4. Check worker logs: `npx wrangler tail`

### Issue: Authentication fails

**GitHub OAuth:**
- Verify GitHub OAuth app callback URL
- Check GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
- Review logs: `npx wrangler tail | grep "auth"`

**SSH Key Auth:**
- Verify CF-Access headers are present
- Check client ID matches: `20b80e2b331f2ee4c6d32008bf496614.access`
- Ensure Cloudflare Access application is configured
- Verify JWT token is valid

### Issue: Type errors during development

**Error:** `Cannot find type definition file for 'node'`

**Solution:**
```bash
npm install --save-dev @types/node
```

---

## 🔄 Updates & Maintenance

### Update Dependencies

```bash
npm update
npx wrangler deploy
```

### Rollback Deployment

```bash
# View deployment history
npx wrangler deployments list

# Rollback to specific version
npx wrangler rollback <deployment-id>
```

### Database Migrations

When updating schema:

1. Create migration file: `schema-v2.sql`
2. Test locally first
3. Apply to production:
   ```bash
   npx wrangler d1 execute symbolai-financial-db --file=./schema-v2.sql
   ```

### Clean Old Events

```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="DELETE FROM Uu_sink WHERE created_at < datetime('now', '-90 days')"
```

---

## 📈 Performance Optimization

### Enable Smart Placement

In `wrangler.jsonc`:
```json
{
  "placement": { "mode": "smart" }
}
```

### Batch Event Streaming

Use `EventBatcher` for high volume:
```typescript
const batcher = new EventBatcher(env.UU_STREAM, {
  batchSize: 50,
  flushInterval: 5000
});
```

### Database Indexes

Already included in schema:
- `idx_user_id`
- `idx_event_name`
- `idx_timestamp`
- `idx_user_event`

---

## 🔒 Security Best Practices

1. **Never commit secrets**
   - Use `wrangler secret` for sensitive data
   - Keep `.dev.vars` in `.gitignore`

2. **Rotate credentials regularly**
   - Update GitHub OAuth secrets
   - Regenerate cookie encryption key

3. **Monitor authentication failures**
   ```bash
   npx wrangler d1 execute symbolai-financial-db \
     --command="SELECT COUNT(*) FROM recent_auth_failures WHERE timestamp > datetime('now', '-1 hour')"
   ```

4. **Rate limiting**
   - Consider implementing rate limits in code
   - Use Cloudflare WAF for DDoS protection

5. **CORS configuration**
   - Restrict allowed origins
   - Use strict CORS policies

---

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Pipelines Documentation](https://developers.cloudflare.com/pipelines/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [OAuth 2.1 Specification](https://oauth.net/2.1/)

---

## 🆘 Support

- **Documentation**: See README.md, SSH_KEY_AUTH.md, PIPELINES_SETUP.md
- **Issues**: https://github.com/llu77/-lmm/issues
- **Cloudflare Community**: https://community.cloudflare.com/

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] Worker is deployed and accessible
- [ ] GitHub OAuth flow works
- [ ] SSH Key authentication works (if configured)
- [ ] Events are streaming to pipeline
- [ ] Events appear in D1 database
- [ ] D1 views are working
- [ ] MCP tools are accessible
- [ ] Logs show no errors

Once all checked, your MCP server is fully operational! 🚀
