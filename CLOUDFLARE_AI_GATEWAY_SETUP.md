# Cloudflare AI Gateway Setup Guide

## Overview
This document provides configuration details for Cloudflare AI Gateway integration with Anthropic Claude API.

## Configuration

### AI Gateway Settings
- **Account ID**: `85b01d19439ca53d3cfa740d2621a2bd`
- **Gateway Name**: `default`
- **Provider**: Anthropic (Claude)
- **Gateway URL**: `https://gateway.ai.cloudflare.com/v1/85b01d19439ca53d3cfa740d2621a2bd/default/anthropic`

### Environment Variables
The following environment variables need to be set in Cloudflare Workers:

```bash
# Set the Anthropic API key (required)
wrangler secret put ANTHROPIC_API_KEY
# When prompted, enter your Anthropic API key
```

### API Key Configuration
The Anthropic API key token has been provided: `dXZnfE6kp6yeDIRY9qjMdzxLIbI0po8dLdUMCK6X`

To set this in Cloudflare Workers:
```bash
cd symbolai-worker
echo "dXZnfE6kp6yeDIRY9qjMdzxLIbI0po8dLdUMCK6X" | wrangler secret put ANTHROPIC_API_KEY
```

## Testing the Configuration

### Test with curl
```bash
curl -X POST https://gateway.ai.cloudflare.com/v1/85b01d19439ca53d3cfa740d2621a2bd/default/anthropic/v1/messages \
  --header 'x-api-key: dXZnfE6kp6yeDIRY9qjMdzxLIbI0po8dLdUMCK6X' \
  --header 'anthropic-version: 2023-06-01' \
  --header 'Content-Type: application/json' \
  --data '{"model": "claude-3-opus-20240229", "max_tokens": 1024, "messages": [{"role": "user", "content": "What is Cloudflare?"}]}'
```

### Test through Application API
After deployment, test the AI features through:

1. **Chat API** - `/api/ai/chat`
   ```bash
   curl -X POST https://symbolai.net/api/ai/chat \
     --header 'Content-Type: application/json' \
     --header 'Cookie: session=YOUR_SESSION_TOKEN' \
     --data '{"message": "ما هي خدمات كلاودفلير؟"}'
   ```

2. **Financial Analysis** - `/api/ai/analyze`
   ```bash
   curl -X POST https://symbolai.net/api/ai/analyze \
     --header 'Content-Type: application/json' \
     --header 'Cookie: session=YOUR_SESSION_TOKEN' \
     --data '{"startDate": "2024-01-01", "endDate": "2024-01-31", "branchId": "branch_1010"}'
   ```

## Configuration Changes Made

### 1. Updated AI Gateway Name
**File**: `symbolai-worker/wrangler.toml`
- **Before**: `AI_GATEWAY_NAME = "symbolai-gateway"`
- **After**: `AI_GATEWAY_NAME = "default"`

This matches the gateway name in your Cloudflare AI Gateway configuration.

### 2. Verified AI Gateway Account ID
The account ID `85b01d19439ca53d3cfa740d2621a2bd` is already correctly configured in `wrangler.toml`.

## How It Works

### AI Integration Flow
```
User Request → Astro API Endpoint → ai.ts Helper Functions → 
Cloudflare AI Gateway → Anthropic Claude API → Response
```

### Benefits of Using AI Gateway
1. **Caching**: Reduces API calls and costs
2. **Rate Limiting**: Protects against abuse
3. **Analytics**: Track usage and costs
4. **Logging**: Monitor API calls and errors
5. **Cost Management**: Better visibility into AI spending

## AI Features in the Application

### 1. Financial Analysis (`analyzeFinancialData`)
- Analyzes revenue, expenses, and profit
- Provides insights and recommendations in Arabic
- Located in: `src/lib/ai.ts`

### 2. Smart Notifications (`generateSmartNotification`)
- AI-generated notifications for financial events
- Categorizes severity (low, medium, high, critical)

### 3. Expense Categorization (`categorizeExpense`)
- Automatically categorizes expenses
- Uses AI to understand Arabic expense descriptions

### 4. Payroll Summaries (`generatePayrollSummary`)
- Generates executive summaries for payroll
- Creates professional Arabic summaries

### 5. Chat Interface
- General-purpose AI assistant for financial queries
- Available at: `src/pages/api/ai/chat.ts`

## Troubleshooting

### Issue: "Anthropic API error: 401"
**Solution**: Verify the ANTHROPIC_API_KEY secret is set correctly
```bash
wrangler secret put ANTHROPIC_API_KEY
```

### Issue: "AI Gateway error: Invalid gateway name"
**Solution**: Ensure `AI_GATEWAY_NAME` matches your Cloudflare configuration (now set to `default`)

### Issue: "Missing AI_GATEWAY_ACCOUNT_ID"
**Solution**: Verify the account ID in `wrangler.toml` matches your Cloudflare account

### Issue: Response is slow or times out
**Solution**: 
- Check AI Gateway logs in Cloudflare Dashboard
- Verify Anthropic API key is valid
- Consider using Workers AI as fallback (automatically handled)

## Deployment Commands

### Deploy to Production
```bash
cd symbolai-worker

# Build the project
npm run build

# Deploy to Cloudflare Workers
wrangler deploy

# Verify deployment
wrangler tail --format pretty
```

### Set Secrets in Production
```bash
# Set Anthropic API key
wrangler secret put ANTHROPIC_API_KEY

# Verify environment variables
wrangler secret list
```

## Monitoring

### View AI Gateway Logs
1. Go to Cloudflare Dashboard
2. Navigate to AI Gateway
3. Select your gateway: `default`
4. View analytics and logs

### View Worker Logs
```bash
# Real-time logs
wrangler tail --format pretty

# Filter for AI-related logs
wrangler tail --format pretty | grep -i "ai\|anthropic\|claude"
```

## API Models Available

### Anthropic Claude (via AI Gateway)
- `claude-3-5-sonnet-20241022` (default) - Best quality, recommended
- `claude-3-opus-20240229` - Highest capability
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fast responses

### Cloudflare Workers AI (fallback)
- `@cf/meta/llama-3-8b-instruct` (default fallback)
- `@cf/mistral/mistral-7b-instruct`
- Free tier available

## Cost Optimization

### Tips to Reduce AI Costs
1. **Use Caching**: AI Gateway automatically caches similar requests
2. **Fallback to Workers AI**: Free alternative for simple queries
3. **Optimize Prompts**: Shorter prompts = lower costs
4. **Set Token Limits**: Use `maxTokens` parameter wisely
5. **Monitor Usage**: Check Cloudflare AI Gateway analytics regularly

## Security Best Practices

### API Key Security
- ✅ **DO**: Store API key in Wrangler secrets (encrypted)
- ✅ **DO**: Use AI Gateway for additional security layer
- ✅ **DO**: Monitor API usage for anomalies
- ❌ **DON'T**: Hardcode API keys in source code
- ❌ **DON'T**: Commit API keys to git repository
- ❌ **DON'T**: Share API keys in plain text

### Access Control
- All AI endpoints require authentication (session token)
- User permissions are checked before AI calls
- Branch isolation is enforced for data access

## Support and Resources

### Cloudflare Documentation
- [AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)
- [Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

### Anthropic Documentation
- [Claude API Docs](https://docs.anthropic.com/claude/reference/)
- [Model Comparison](https://docs.anthropic.com/claude/docs/models-overview)
- [Best Practices](https://docs.anthropic.com/claude/docs/best-practices)

## Status
✅ **Configuration Updated**: AI Gateway name changed to `default`
✅ **Account ID Verified**: `85b01d19439ca53d3cfa740d2621a2bd`
✅ **API Key Documented**: Token provided for setup
⏳ **Pending**: Set ANTHROPIC_API_KEY secret in Cloudflare Workers
⏳ **Pending**: Deploy and test configuration

---

**Last Updated**: 2025-11-13
**Configuration Version**: 1.0
