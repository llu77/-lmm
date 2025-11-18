#!/bin/bash

# Setup Cloudflare Secrets Script
# This script helps you set all required secrets for the SymbolAI Worker

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║   SymbolAI Worker - Secrets Configuration         ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script will guide you through setting up all required secrets.${NC}"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}✗ Wrangler CLI not found${NC}"
    echo "Please install it first: npm install -g wrangler"
    exit 1
fi

echo -e "${GREEN}✓ Wrangler CLI found${NC}"
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local description=$2
    local required=$3
    local example=$4
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}Setting: ${secret_name}${NC}"
    echo "Description: $description"
    
    if [ "$required" = "required" ]; then
        echo -e "${RED}Status: Required${NC}"
    else
        echo -e "${YELLOW}Status: Optional${NC}"
    fi
    
    if [ -n "$example" ]; then
        echo "Example: $example"
    fi
    
    echo ""
    read -p "Do you want to set this secret now? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx wrangler secret put "$secret_name"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ $secret_name set successfully${NC}"
        else
            echo -e "${RED}✗ Failed to set $secret_name${NC}"
        fi
    else
        echo -e "${YELLOW}⊘ Skipped $secret_name${NC}"
    fi
    echo ""
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Starting Secrets Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. RESEND_API_KEY
set_secret "RESEND_API_KEY" \
    "Resend email service API key for sending emails" \
    "required" \
    "re_xxxxxxxxxxxxxxxxxxxxx (get from https://resend.com/api-keys)"

# 2. SESSION_SECRET
set_secret "SESSION_SECRET" \
    "Secret key for session encryption (recommended for production)" \
    "optional" \
    "Generate with: openssl rand -base64 32"

# 3. ANTHROPIC_API_KEY
set_secret "ANTHROPIC_API_KEY" \
    "Anthropic Claude API key for AI features (optional)" \
    "optional" \
    "sk-ant-xxxxxxxxxxxxxxxxxxxxx (get from https://console.anthropic.com/)"

# 4. ZAPIER_WEBHOOK_URL
set_secret "ZAPIER_WEBHOOK_URL" \
    "Zapier webhook URL for automation integrations (optional)" \
    "optional" \
    "https://hooks.zapier.com/hooks/catch/XXXXX/YYYYY/"

# 5. RESEND_WEBHOOK_SECRET
set_secret "RESEND_WEBHOOK_SECRET" \
    "Resend webhook signature validation secret (optional)" \
    "optional" \
    "whsec_xxxxxxxxxxxxxxxxxxxxx (from Resend webhook settings)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secrets Configuration Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# List all configured secrets
echo "📋 Currently configured secrets:"
echo ""
npx wrangler secret list

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Build the application: npm run build"
echo "2. Deploy to Cloudflare: npx wrangler deploy"
echo "3. Test the application: https://symbolai.net"
echo ""
echo "📚 For more information, see:"
echo "  - ENVIRONMENT_VARIABLES_VERIFICATION.md"
echo "  - https://developers.cloudflare.com/workers/configuration/secrets/"
echo ""
