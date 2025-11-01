# 🛡️ Cloudflare Rate Limiting Setup Guide

## Overview

This guide provides step-by-step instructions for setting up 3-tier rate limiting protection for the SymbolAI application.

**Estimated Time:** 10-15 minutes
**Difficulty:** Easy
**Cost:** Free (included in Cloudflare plan)

---

## 🎯 Protection Strategy

We implement 3 tiers of protection:

```
Tier 1: Cloudflare Dashboard Rules (Edge Protection)
        ↓ Immediate, no code changes
        ↓ Blocks at CDN level

Tier 2: KV-based Rate Limiting (Application Level)
        ↓ Fine-grained control
        ↓ Per-endpoint limits

Tier 3: Analytics & Monitoring
        ↓ Track violations
        ↓ Adjust limits
```

---

## 📋 TIER 1: Cloudflare Dashboard Setup (10 minutes)

### Step 1: Access Cloudflare Dashboard

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Select your domain: `symbolai.net`
3. Navigate to: **Security** → **WAF** → **Rate limiting rules**

### Step 2: Create Rule #1 - Login Protection

**Rule Name:** `Login Brute Force Protection`

**Configuration:**
```yaml
When incoming requests match:
  Field: URI Path
  Operator: equals
  Value: /api/auth/login

Then:
  Action: Block
  Rate: 5 requests per 1 minute
  Duration: 10 minutes
  Counting method: Count by IP address
```

**Click "Deploy"**

**What this does:**
- Allows max 5 login attempts per minute per IP
- Blocks the IP for 10 minutes if exceeded
- Prevents brute force attacks on login

---

### Step 3: Create Rule #2 - General API Protection

**Rule Name:** `API General Rate Limit`

**Configuration:**
```yaml
When incoming requests match:
  Field: URI Path
  Operator: contains
  Value: /api/

Then:
  Action: Managed Challenge (CAPTCHA)
  Rate: 100 requests per 1 minute
  Duration: 1 minute
  Counting method: Count by IP address

Exclude:
  - /api/auth/login (already protected by Rule #1)
```

**Click "Deploy"**

**What this does:**
- Allows 100 API requests per minute per IP
- Shows CAPTCHA if exceeded
- General protection for all API endpoints

---

### Step 4: Create Rule #3 - Expensive Endpoints

**Rule Name:** `AI and MCP Protection`

**Configuration:**
```yaml
When incoming requests match:
  Field: URI Path
  Operator: is in
  Values:
    - /api/ai/chat
    - /api/ai/analyze
    - /api/ai/mcp-chat
    - /api/mcp/d1/query

Then:
  Action: Block
  Rate: 10 requests per 1 minute
  Duration: 5 minutes
  Counting method: Count by IP address
```

**Click "Deploy"**

**What this does:**
- Limits expensive AI/MCP operations to 10 per minute
- Blocks for 5 minutes if exceeded
- Prevents API quota exhaustion

---

### Step 5: Create Rule #4 - Email Endpoints

**Rule Name:** `Email Sending Rate Limit`

**Configuration:**
```yaml
When incoming requests match:
  Field: URI Path
  Operator: contains
  Value: /api/email/

Then:
  Action: Block
  Rate: 20 requests per 1 hour
  Duration: 30 minutes
  Counting method: Count by IP address
```

**Click "Deploy"**

**What this does:**
- Limits email operations to 20 per hour
- Prevents email spam/abuse
- Protects Resend API quota

---

## 📊 Verification

### Test the Rules

1. **Test Login Rate Limit:**
   ```bash
   # Try 6 login attempts rapidly
   for i in {1..6}; do
     curl -X POST https://symbolai.net/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"username":"test","password":"test"}'
     echo "Attempt $i"
   done
   ```

   **Expected:** First 5 succeed, 6th gets blocked (429 or 403)

2. **Test API Rate Limit:**
   ```bash
   # Try 101 API requests
   for i in {1..101}; do
     curl https://symbolai.net/api/branches/list
   done
   ```

   **Expected:** First 100 succeed, 101st shows CAPTCHA

3. **Test AI Rate Limit:**
   ```bash
   # Try 11 AI requests
   for i in {1..11}; do
     curl -X POST https://symbolai.net/api/ai/chat \
       -H "Content-Type: application/json" \
       -d '{"message":"test"}'
   done
   ```

   **Expected:** First 10 succeed, 11th gets blocked

---

## 📈 Monitoring

### View Rate Limit Events

1. Go to **Security** → **Events**
2. Filter by:
   - Action: Block, Challenge
   - Source: Rate limiting rule
3. Review blocked IPs and patterns

### Adjust Limits

If you see legitimate users being blocked:

1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Click on the rule name
3. Adjust the rate or duration
4. Click "Save"

**Recommended Adjustments:**

| Endpoint | Initial Limit | If Too Strict | If Too Loose |
|----------|---------------|---------------|--------------|
| Login | 5/min | → 10/min | → 3/min |
| API General | 100/min | → 200/min | → 50/min |
| AI/MCP | 10/min | → 20/min | → 5/min |
| Email | 20/hour | → 50/hour | → 10/hour |

---

## 🚨 Alert Configuration

### Set up Email Alerts

1. Go to **Notifications**
2. Click "Add"
3. Select "Security Events"
4. Configure:
   - **Event Type:** Rate Limiting triggered
   - **Threshold:** More than 10 events in 5 minutes
   - **Email:** your-email@example.com

---

## 🔧 Advanced Configuration

### Country-Based Rules

Block specific countries if needed:

```yaml
When incoming requests match:
  Field: Country
  Operator: is in
  Values: [CN, RU, KP]  # Example countries

AND

  Field: URI Path
  Operator: contains
  Value: /api/

Then:
  Action: Block
```

### IP Whitelist

Allow unlimited access for specific IPs:

```yaml
When incoming requests match:
  Field: IP Address
  Operator: is in
  Values:
    - 1.2.3.4
    - 5.6.7.8

Then:
  Action: Skip (Rate Limiting)
```

---

## 📊 Dashboard Summary

After setup, your rules should look like:

| Rule Name | Path | Rate | Action | Status |
|-----------|------|------|--------|--------|
| Login Brute Force Protection | `/api/auth/login` | 5/min | Block | ✅ Enabled |
| API General Rate Limit | `/api/*` | 100/min | Challenge | ✅ Enabled |
| AI and MCP Protection | `/api/ai/*`, `/api/mcp/*` | 10/min | Block | ✅ Enabled |
| Email Sending Rate Limit | `/api/email/*` | 20/hour | Block | ✅ Enabled |

---

## 🔄 Rollback Plan

If rate limiting causes issues:

1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Click the three dots (⋮) next to the rule
3. Click "Disable" or "Delete"

**Or temporarily disable all:**
1. Click "Manage rules"
2. Toggle off all rules
3. Investigate the issue
4. Re-enable after fixing

---

## 📝 Best Practices

### ✅ Do:
- Start with conservative limits
- Monitor for 24-48 hours
- Adjust based on real traffic
- Set up alerts
- Whitelist known IPs (CI/CD, monitoring)

### ❌ Don't:
- Set limits too low (blocks legitimate users)
- Forget to exclude health check endpoints
- Ignore alert notifications
- Use same limits for all endpoints

---

## 🆘 Troubleshooting

### Issue: Legitimate users blocked

**Solution:**
1. Check Security Events for the blocked IP
2. Verify it's legitimate traffic
3. Either:
   - Increase the rate limit
   - Add IP to whitelist
   - Reduce the block duration

### Issue: Bots still getting through

**Solution:**
1. Lower the rate limit
2. Change action from "Challenge" to "Block"
3. Add Bot Fight Mode (Cloudflare feature)

### Issue: CAPTCHA annoying users

**Solution:**
1. Increase the rate limit threshold
2. Change from "Challenge" to "Log" (monitoring only)
3. Use "JS Challenge" instead of CAPTCHA

---

## 📊 Expected Results

After implementing Tier 1:

```yaml
Security Improvement:
  ✅ Login brute force: BLOCKED
  ✅ API abuse: LIMITED
  ✅ DoS attacks: MITIGATED
  ✅ Cost explosion: PREVENTED

Performance Impact:
  - Legitimate users: NO IMPACT
  - Bots/attackers: BLOCKED
  - CDN overhead: MINIMAL

Cost:
  - Cloudflare charges: FREE (included)
  - API costs: REDUCED (blocked requests don't reach API)
```

---

## 🎯 Next Steps

After completing Tier 1:

1. ✅ Verify all rules are working
2. ✅ Monitor for 24 hours
3. ✅ Check Security Events dashboard
4. ✅ Adjust limits if needed
5. → Move to **Tier 2** (KV-based rate limiting) for fine-grained control

---

## 📚 Resources

- [Cloudflare Rate Limiting Documentation](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Cloudflare Security Events](https://developers.cloudflare.com/fundamentals/get-started/basic-tasks/view-security-events/)
- [Best Practices for Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/)

---

## ✅ Completion Checklist

- [ ] Accessed Cloudflare Dashboard
- [ ] Created Login Protection Rule
- [ ] Created General API Rule
- [ ] Created AI/MCP Protection Rule
- [ ] Created Email Protection Rule
- [ ] Tested all rules
- [ ] Set up monitoring alerts
- [ ] Documented current limits
- [ ] Verified no legitimate users blocked

**Time Spent:** _____ minutes
**Date Completed:** ___________
**Completed By:** ___________

---

**🎉 Congratulations! Tier 1 Protection is now active!**
