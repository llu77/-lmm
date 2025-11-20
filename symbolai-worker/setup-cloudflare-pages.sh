#!/bin/bash

# Cloudflare Pages Setup Script
# This script helps you set up all required configurations for Cloudflare Pages

set -e  # Exit on error

PROJECT_NAME="symbolai-financial-erp"
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BOLD}========================================${NC}"
echo -e "${BOLD}Cloudflare Pages Setup Script${NC}"
echo -e "${BOLD}========================================${NC}\n"

# Step 1: Check if logged in
echo -e "${YELLOW}Step 1/5: Checking Wrangler authentication...${NC}"
if ! npx wrangler whoami &>/dev/null; then
    echo -e "${RED}❌ Not logged in to Cloudflare${NC}"
    echo -e "${YELLOW}Please run: npx wrangler login${NC}"
    echo ""
    read -p "Do you want to login now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx wrangler login
    else
        echo -e "${RED}Exiting. Please login first.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Already logged in${NC}"
    npx wrangler whoami
fi

echo ""

# Step 2: Check if project exists
echo -e "${YELLOW}Step 2/5: Checking if Pages project exists...${NC}"
if npx wrangler pages project list | grep -q "$PROJECT_NAME"; then
    echo -e "${GREEN}✓ Project '$PROJECT_NAME' already exists${NC}"
else
    echo -e "${YELLOW}⚠ Project '$PROJECT_NAME' does not exist${NC}"
    echo -e "${YELLOW}Please create it in Cloudflare Dashboard first:${NC}"
    echo -e "  ${BOLD}https://dash.cloudflare.com/pages${NC}"
    echo ""
    read -p "Press Enter after creating the project..."
fi

echo ""

# Step 3: Add Secrets
echo -e "${YELLOW}Step 3/5: Adding secrets to Cloudflare Pages...${NC}"
echo -e "${BOLD}You will be prompted to enter each secret value.${NC}"
echo ""

# ANTHROPIC_API_KEY
echo -e "${BOLD}1. ANTHROPIC_API_KEY${NC}"
echo "   Get your key from: https://console.anthropic.com/settings/keys"
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name="$PROJECT_NAME" || echo -e "${RED}Failed to add ANTHROPIC_API_KEY${NC}"
echo ""

# RESEND_API_KEY
echo -e "${BOLD}2. RESEND_API_KEY${NC}"
echo "   Get your key from: https://resend.com/api-keys"
npx wrangler pages secret put RESEND_API_KEY --project-name="$PROJECT_NAME" || echo -e "${RED}Failed to add RESEND_API_KEY${NC}"
echo ""

# SESSION_SECRET
echo -e "${BOLD}3. SESSION_SECRET${NC}"
echo "   Generate a random secret (32+ characters)"
echo "   Or press Enter to auto-generate one"
read -p "Enter SESSION_SECRET (leave empty to auto-generate): " SESSION_SECRET
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -base64 32)
    echo "Auto-generated: $SESSION_SECRET"
fi
echo "$SESSION_SECRET" | npx wrangler pages secret put SESSION_SECRET --project-name="$PROJECT_NAME" || echo -e "${RED}Failed to add SESSION_SECRET${NC}"
echo ""

echo -e "${GREEN}✓ All secrets added successfully!${NC}"
echo ""

# Step 4: Deploy
echo -e "${YELLOW}Step 4/5: Would you like to deploy now?${NC}"
read -p "Deploy to Cloudflare Pages? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Building and deploying...${NC}"

    # Install dependencies
    npm ci --legacy-peer-deps --ignore-scripts

    # Build
    NODE_OPTIONS='--max-old-space-size=4096' npm run build

    # Deploy
    npx wrangler pages deploy dist \
        --project-name="$PROJECT_NAME" \
        --branch=main \
        --commit-dirty=true

    echo -e "${GREEN}✓ Deployment complete!${NC}"
else
    echo -e "${YELLOW}Skipping deployment. You can deploy later with:${NC}"
    echo -e "  ${BOLD}npm run build && npx wrangler pages deploy dist --project-name=$PROJECT_NAME${NC}"
fi

echo ""

# Step 5: Next Steps
echo -e "${YELLOW}Step 5/5: Manual Configuration Required${NC}"
echo -e "${BOLD}You still need to configure these in Cloudflare Dashboard:${NC}"
echo ""
echo -e "${BOLD}1. Environment Variables:${NC}"
echo "   Go to: https://dash.cloudflare.com"
echo "   → Pages → $PROJECT_NAME → Settings → Environment variables"
echo ""
echo "   Add these variables:"
echo "   - ENVIRONMENT=production"
echo "   - AI_GATEWAY_ACCOUNT_ID=85b01d19439ca53d3cfa740d2621a2bd"
echo "   - AI_GATEWAY_NAME=symbol"
echo "   - EMAIL_FROM=info@symbolai.net"
echo "   - EMAIL_FROM_NAME=SymbolAI"
echo ""
echo -e "${BOLD}2. Function Bindings:${NC}"
echo "   Go to: Settings → Functions → Bindings"
echo ""
echo "   D1 Database:"
echo "   - Variable: DB"
echo "   - Database: symbolai-financial-db"
echo "   - ID: 3897ede2-ffc0-4fe8-8217-f9607c89bef2"
echo ""
echo "   KV Namespaces:"
echo "   - SESSIONS: 8f91016b728c4a289fdfdec425492aab"
echo "   - CACHE: a497973607cf45bbbee76b64da9ac947"
echo "   - FILES: d9961a2085d44c669bbe6c175f3611c1"
echo "   - RATE_LIMIT: 797b75482e6c4408bb40f6d72f2512af"
echo ""
echo "   R2 Bucket:"
echo "   - Variable: PAYROLL_PDFS"
echo "   - Bucket: symbolai-payrolls"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup script completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "For detailed instructions, see: DEPLOYMENT_GUIDE.md"
