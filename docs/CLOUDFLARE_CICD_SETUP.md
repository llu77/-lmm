# Cloudflare Workers CI/CD Setup Guide

This guide explains how to set up and use the automated CI/CD pipeline for deploying Cloudflare Workers and Pages.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Workflow Structure](#workflow-structure)
- [Deployment Environments](#deployment-environments)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)

## 🔍 Overview

The CI/CD pipeline automatically deploys your Cloudflare Workers and Pages on:
- **Production deployments**: When code is pushed to the `main` branch
- **Preview deployments**: When pull requests are opened or updated
- **Manual deployments**: Via workflow dispatch in GitHub Actions

### What Gets Deployed

1. **SymbolAI Worker** (`symbolai-worker/`) - Main application worker with D1, KV, R2, and AI bindings
2. **Cloudflare Worker** (`cloudflare-worker/`) - Simple Astro blog worker
3. **Cloudflare Pages** - Static site deployment from build artifacts

## ✅ Prerequisites

Before setting up CI/CD, ensure you have:

1. A Cloudflare account with Workers enabled
2. GitHub repository with admin access
3. Cloudflare API token with appropriate permissions
4. Cloudflare Account ID

## 🔐 GitHub Secrets Configuration

### Required Secrets

You need to add the following secrets to your GitHub repository:

#### 1. Get Your Cloudflare Account ID

```bash
# Login to Cloudflare
wrangler whoami

# Your Account ID will be displayed
```

Alternatively:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select any website or go to Workers & Pages
3. Your Account ID is in the right sidebar

#### 2. Create Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use the **Edit Cloudflare Workers** template, or create a custom token with these permissions:

**Required Permissions:**
- Account > Workers Scripts > Edit
- Account > Workers KV Storage > Edit
- Account > Workers R2 Storage > Edit
- Account > D1 > Edit
- Account > Cloudflare Pages > Edit
- Zone > Workers Routes > Edit (if using routes)

4. Set appropriate **Account Resources** and **Zone Resources**
5. Click **Continue to summary** → **Create Token**
6. **Copy the token immediately** (you won't see it again!)

#### 3. Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `CLOUDFLARE_API_TOKEN` | The API token you created above | `abc123...` |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID | `a1b2c3d4e5f6...` |

### Optional: Environment-Specific Secrets

For better security, you can configure environment-specific secrets:

1. Go to **Settings** → **Environments**
2. Create environments: `production` and `preview`
3. Add secrets to each environment
4. Configure protection rules (e.g., require approval for production deployments)

## 🏗️ Workflow Structure

The CI/CD pipeline consists of 5 jobs:

### 1. Build (`build`)
- Checks out code
- Installs dependencies with npm cache
- Builds both workers
- Uploads build artifacts for deployment jobs

### 2. Deploy SymbolAI Worker (`deploy-symbolai-worker`)
- Downloads build artifacts
- Deploys to production (on main branch push)
- Deploys to preview environment (on pull requests)
- Comments on PR with deployment URL

### 3. Deploy Cloudflare Worker (`deploy-cloudflare-worker`)
- Deploys the simple Astro blog worker
- Supports production and preview environments
- Comments on PR with deployment status

### 4. Deploy Pages (`deploy-pages`)
- Deploys static site to Cloudflare Pages
- Uses branch-based deployments
- Comments on PR with preview URL

### 5. Deployment Summary (`deployment-summary`)
- Generates a summary of all deployments
- Shows status of each deployment job
- Visible in GitHub Actions summary

## 🌍 Deployment Environments

### Production Environment

- **Trigger**: Push to `main` branch
- **Command**: `wrangler deploy`
- **Configuration**: Uses default environment in `wrangler.toml`

### Preview Environment

- **Trigger**: Pull request to `main` branch
- **Command**: `wrangler deploy --env preview`
- **Configuration**: Uses `[env.preview]` section in `wrangler.toml`

**Note**: You need to add preview environment configuration to your `wrangler.toml` files. See [Adding Preview Environment](#adding-preview-environment-configuration) below.

## 🚀 Usage

### Automatic Deployments

#### Deploy to Production
1. Merge your PR to `main` branch
2. GitHub Actions automatically triggers deployment
3. Monitor progress in the **Actions** tab
4. Check deployment summary for URLs and status

#### Deploy to Preview
1. Open a pull request to `main` branch
2. GitHub Actions automatically deploys preview
3. Bot comments on PR with preview URLs
4. Test your changes before merging

### Manual Deployments

1. Go to **Actions** → **Deploy Cloudflare Workers**
2. Click **Run workflow**
3. Select branch and environment
4. Click **Run workflow**

### Path-Based Triggers

The workflow only runs when relevant files change:
- `symbolai-worker/**`
- `cloudflare-worker/**`
- `wrangler.toml`
- `wrangler.json`
- `package.json`
- `.github/workflows/cloudflare-workers-deploy.yml`

This prevents unnecessary deployments and saves build minutes.

## ⚙️ Adding Preview Environment Configuration

To enable preview deployments, add preview environment configurations to your `wrangler.toml` files:

### Example: symbolai-worker/wrangler.toml

```toml
# Add at the end of the file
[env.preview]
name = "symbolai-worker-preview"
# Use preview/staging databases and KV namespaces
[[env.preview.d1_databases]]
binding = "DB"
database_name = "symbolai-financial-db-preview"
database_id = "your-preview-db-id"

[[env.preview.kv_namespaces]]
binding = "KV"
id = "your-preview-kv-id"
```

### Example: cloudflare-worker/wrangler.toml

```toml
[env.preview]
name = "cloudflare-worker-preview"
# Preview-specific configuration
```

## 🔧 Troubleshooting

### Authentication Errors

**Error**: `Authentication error`

**Solution**:
1. Verify `CLOUDFLARE_API_TOKEN` is set correctly
2. Check token hasn't expired
3. Ensure token has required permissions
4. Regenerate token if necessary

### Build Failures

**Error**: `Build failed` or `Out of memory`

**Solution**:
- Already configured: `NODE_OPTIONS='--max-old-space-size=2048'`
- Check build logs for specific errors
- Ensure all dependencies are in `package.json`

### Deployment Failures

**Error**: `Deployment failed`

**Solution**:
1. Check wrangler.toml configuration
2. Verify all bindings (KV, D1, R2) exist
3. Check account limits in Cloudflare dashboard
4. Review deployment logs in GitHub Actions

### Preview Environment Not Working

**Error**: `Unknown environment`

**Solution**:
1. Add `[env.preview]` configuration to `wrangler.toml`
2. Create preview resources in Cloudflare dashboard
3. Update binding IDs in preview environment

### Concurrent Deployment Issues

**Error**: `Resource is locked`

**Solution**:
- Workflow has concurrency control configured
- Wait for current deployment to complete
- Cancel in-progress deployment if needed

## 📊 Monitoring Deployments

### GitHub Actions
- View real-time deployment progress in **Actions** tab
- Check deployment summary for status
- Review logs for detailed information

### Cloudflare Dashboard
- Monitor worker metrics and analytics
- View deployment history
- Check logs and errors

## 🔒 Security Best Practices

1. **API Token Scope**: Use minimum required permissions
2. **Token Rotation**: Rotate API tokens periodically
3. **Environment Secrets**: Use environment-specific secrets for production
4. **Branch Protection**: Enable branch protection rules for `main`
5. **Required Reviews**: Require PR reviews before merging
6. **Secret Scanning**: Enable GitHub secret scanning

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Cloudflare API Token Permissions](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review GitHub Actions logs
3. Check Cloudflare dashboard for errors
4. Consult [Cloudflare Workers Discord](https://discord.gg/cloudflaredev)
5. Open an issue in this repository

---

**Last Updated**: 2025-11-19
**Workflow Version**: 1.0.0
