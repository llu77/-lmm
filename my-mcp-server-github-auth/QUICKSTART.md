# MCP Server - Quick Start Guide

## 🚀 Deployment Commands

### 1. Verify Setup
```bash
./verify-setup.sh
```
✓ Checks all files, bindings, and configuration

### 2. Authenticate with Cloudflare
```bash
npx wrangler login
```

### 3. Set Secrets
```bash
# GitHub OAuth
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET

# Cookie encryption (generate: openssl rand -hex 32)
npx wrangler secret put COOKIE_ENCRYPTION_KEY
```

### 4. Apply Database Schema
```bash
npx wrangler d1 execute symbolai-financial-db --file=./schema.sql
```

### 5. Deploy Worker
```bash
npx wrangler deploy
```

---

## 📊 Monitoring Commands

### Check Logs (Real-time)
```bash
npx wrangler tail
```

### Query Authentication Events
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM auth_events ORDER BY timestamp DESC LIMIT 10"
```

### Query All Events
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT COUNT(*) as total FROM Uu_sink"
```

### User Activity Summary
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM user_activity_summary ORDER BY total_events DESC"
```

### Recent Auth Failures (Security)
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM recent_auth_failures"
```

### Tool Performance Metrics
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM tool_performance ORDER BY invocations DESC"
```

### Daily Statistics
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM daily_event_stats WHERE date >= date('now', '-7 days')"
```

---

## 🧪 Testing Commands

### Test Pipeline Ingest
```bash
curl -X POST https://7e02e214a91249d38d81289cf7649b99.ingest.cloudflare.com \
  -H "Content-Type: application/json" \
  -d '[{"user_id": {"test": "data"}, "event_name": "test"}]'
```

### Test GitHub OAuth Endpoint
```bash
curl -I https://<your-worker>.workers.dev/authorize?client_id=test&redirect_uri=http://localhost&response_type=code
```

### Test SSH Auth Endpoint
```bash
curl -I https://<your-worker>.workers.dev/ssh-authorize?client_id=test&redirect_uri=http://localhost&response_type=code
```

### Test MCP Endpoint
```bash
curl https://<your-worker>.workers.dev/mcp
```

---

## 🔧 Maintenance Commands

### List Deployments
```bash
npx wrangler deployments list
```

### Rollback to Previous Version
```bash
npx wrangler rollback <deployment-id>
```

### Update Dependencies
```bash
npm update
npx wrangler deploy
```

### Clean Old Events (90 days)
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="DELETE FROM Uu_sink WHERE created_at < datetime('now', '-90 days')"
```

---

## 🔐 Security Checks

### Failed Login Attempts (Last Hour)
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT COUNT(*) as failures FROM auth_events WHERE event_name LIKE '%_failure' AND timestamp > datetime('now', '-1 hour')"
```

### Suspicious Activity (Multiple IPs)
```bash
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT user_id, COUNT(DISTINCT json_extract(metadata, '$.ip_address')) as ip_count FROM auth_events GROUP BY user_id HAVING ip_count > 3"
```

---

## 📍 Important URLs

### Worker
```
https://<your-worker-name>.workers.dev
```

### Pipeline Ingest
```
https://7e02e214a91249d38d81289cf7649b99.ingest.cloudflare.com
```

### Endpoints
- GitHub OAuth: `/authorize` → `/callback`
- SSH Key Auth: `/ssh-authorize`
- MCP (new): `/mcp`
- MCP (legacy): `/sse`

---

## 🆔 Resource IDs

### KV Namespace
```
OAUTH_KV: 57a4eb48d4f047e7aea6b4692e174894
```

### D1 Database
```
symbolai-financial-db: 3897ede2-ffc0-4fe8-8217-f9607c89bef2
```

### Pipeline
```
UU_STREAM: 7e02e214a91249d38d81289cf7649b99
```

### VPC Service
```
VPC_SERVICE: 019a6a59-cbb4-7031-9840-e79c64aeae7f
```

### SSH Key Auth
```
Client ID: 20b80e2b331f2ee4c6d32008bf496614.access
Fingerprint: 671f73b3d352e97f08a80272a651dba35568eccace91213f7f04d00f4de37bc2
```

---

## 🎯 Troubleshooting

### Worker Not Responding
```bash
npx wrangler tail  # Check logs
npx wrangler deployments list  # Check deployment status
```

### Events Not Appearing in D1
```bash
# Check pipeline status in dashboard
# Verify sink query: INSERT INTO Uu_sink SELECT * FROM Uu_stream;

# Test direct ingest
curl -X POST https://7e02e214a91249d38d81289cf7649b99.ingest.cloudflare.com \
  -H "Content-Type: application/json" \
  -d '[{"user_id": {"test": "data"}, "event_name": "test"}]'

# Check if events arrived
npx wrangler d1 execute symbolai-financial-db \
  --command="SELECT * FROM Uu_sink ORDER BY created_at DESC LIMIT 5"
```

### Authentication Failing
```bash
# Check secrets are set
npx wrangler secret list

# Check logs
npx wrangler tail | grep "auth"
```

---

## 📚 Documentation

- `README.md` - Main documentation
- `SSH_KEY_AUTH.md` - SSH authentication guide
- `PIPELINES_SETUP.md` - Event streaming guide
- `DEPLOYMENT.md` - Complete deployment guide
- `DEPLOYMENT_SUMMARY.md` - Implementation overview

---

## ⚡ One-Liner Deployment

```bash
npx wrangler login && \
npx wrangler secret put GITHUB_CLIENT_ID && \
npx wrangler secret put GITHUB_CLIENT_SECRET && \
npx wrangler secret put COOKIE_ENCRYPTION_KEY && \
npx wrangler d1 execute symbolai-financial-db --file=./schema.sql && \
npx wrangler deploy
```

---

## 🎉 Success Checklist

After deployment:
- [ ] Worker is live and responding
- [ ] GitHub OAuth flow works
- [ ] SSH auth configured (optional)
- [ ] Events streaming to pipeline
- [ ] Events appearing in D1
- [ ] All views working
- [ ] No errors in logs

---

**Need help?** See full documentation in `DEPLOYMENT.md`
