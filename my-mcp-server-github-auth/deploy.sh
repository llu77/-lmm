#!/bin/bash

# MCP Server Deployment Script
# This script sets up and deploys the MCP server with all features

set -e  # Exit on error

echo "=========================================="
echo "MCP Server Deployment Script"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler is not installed"
    print_info "Install with: npm install -g wrangler"
    exit 1
fi

print_success "Wrangler is installed"

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    print_warning "Not logged in to Cloudflare"
    print_info "Running: wrangler login"
    wrangler login
fi

print_success "Logged in to Cloudflare"
echo ""

# Step 1: Set up secrets
echo "=========================================="
echo "Step 1: Set up Secrets"
echo "=========================================="
echo ""

print_info "You need to configure the following secrets:"
echo "  1. GITHUB_CLIENT_ID"
echo "  2. GITHUB_CLIENT_SECRET"
echo "  3. COOKIE_ENCRYPTION_KEY"
echo ""

read -p "Have you already set up secrets? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Setting up secrets..."
    print_info "1. GitHub Client ID:"
    wrangler secret put GITHUB_CLIENT_ID

    print_info "2. GitHub Client Secret:"
    wrangler secret put GITHUB_CLIENT_SECRET

    print_info "3. Cookie Encryption Key (generate with: openssl rand -hex 32):"
    wrangler secret put COOKIE_ENCRYPTION_KEY

    print_success "Secrets configured"
else
    print_success "Secrets already configured"
fi
echo ""

# Step 2: Set up KV namespace
echo "=========================================="
echo "Step 2: KV Namespace"
echo "=========================================="
echo ""

KV_ID="57a4eb48d4f047e7aea6b4692e174894"
print_info "KV Namespace ID: $KV_ID"
print_success "KV namespace configured in wrangler.jsonc"
echo ""

# Step 3: Set up D1 database
echo "=========================================="
echo "Step 3: D1 Database Setup"
echo "=========================================="
echo ""

DB_NAME="symbolai-financial-db"
DB_ID="3897ede2-ffc0-4fe8-8217-f9607c89bef2"

print_info "Database: $DB_NAME"
print_info "Database ID: $DB_ID"
echo ""

read -p "Apply D1 database schema? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Applying schema.sql..."
    npx wrangler d1 execute $DB_NAME --file=./schema.sql
    print_success "Database schema applied"
else
    print_warning "Skipped database schema application"
fi
echo ""

# Step 4: Set up Cloudflare Pipeline
echo "=========================================="
echo "Step 4: Cloudflare Pipeline"
echo "=========================================="
echo ""

PIPELINE_ID="7e02e214a91249d38d81289cf7649b99"
print_info "Pipeline ID: $PIPELINE_ID"
print_info "Binding: UU_STREAM"
print_info "Ingest URL: https://$PIPELINE_ID.ingest.cloudflare.com"
echo ""

print_warning "You need to configure the pipeline manually:"
echo "  1. Go to Cloudflare Dashboard → Pipelines"
echo "  2. Select pipeline: $PIPELINE_ID"
echo "  3. Add sink query: INSERT INTO Uu_sink SELECT * FROM Uu_stream;"
echo ""

read -p "Have you configured the pipeline sink? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_success "Pipeline configured"
else
    print_warning "Remember to configure pipeline sink before deploying"
fi
echo ""

# Step 5: Verify configuration
echo "=========================================="
echo "Step 5: Verify Configuration"
echo "=========================================="
echo ""

print_info "Checking wrangler.jsonc..."
if grep -q "UU_STREAM" wrangler.jsonc; then
    print_success "Pipeline binding found"
else
    print_error "Pipeline binding not found in wrangler.jsonc"
fi

if grep -q "symbolai-financial-db" wrangler.jsonc; then
    print_success "D1 database binding found"
else
    print_error "D1 database binding not found in wrangler.jsonc"
fi

if grep -q "OAUTH_KV" wrangler.jsonc; then
    print_success "KV namespace binding found"
else
    print_error "KV namespace binding not found in wrangler.jsonc"
fi
echo ""

# Step 6: Deploy
echo "=========================================="
echo "Step 6: Deploy to Cloudflare"
echo "=========================================="
echo ""

read -p "Deploy now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deploying..."
    npx wrangler deploy
    print_success "Deployment complete!"
    echo ""
    print_info "Your MCP server is now live!"
    print_info "Test with: npx @modelcontextprotocol/inspector@latest"
else
    print_warning "Deployment skipped"
    print_info "Deploy manually with: npx wrangler deploy"
fi
echo ""

# Step 7: Post-deployment verification
echo "=========================================="
echo "Step 7: Post-Deployment Checks"
echo "=========================================="
echo ""

print_info "After deployment, verify:"
echo "  1. Authentication endpoints:"
echo "     - GET /authorize (GitHub OAuth)"
echo "     - GET /ssh-authorize (SSH Key Auth)"
echo "  2. MCP endpoints:"
echo "     - GET /sse (deprecated)"
echo "     - GET /mcp (Streamable-HTTP)"
echo "  3. Test authentication flow"
echo "  4. Check D1 database for streamed events:"
echo "     npx wrangler d1 execute $DB_NAME --command='SELECT COUNT(*) FROM Uu_sink'"
echo ""

print_success "Deployment script complete!"
echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Test authentication:"
echo "   - GitHub OAuth: https://<your-worker>.workers.dev/authorize"
echo "   - SSH Key Auth: https://<your-worker>.workers.dev/ssh-authorize"
echo ""
echo "2. Monitor events:"
echo "   npx wrangler d1 execute $DB_NAME --command='SELECT * FROM auth_events LIMIT 10'"
echo ""
echo "3. Check pipeline ingest:"
echo "   curl -X POST https://$PIPELINE_ID.ingest.cloudflare.com \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '[{\"user_id\": {\"test\": \"data\"}, \"event_name\": \"test_event\"}]'"
echo ""
echo "4. View logs:"
echo "   npx wrangler tail"
echo ""

print_success "All done! 🎉"
