#!/bin/bash

# ============================================
# Cloudflare Secrets Setup Script
# ============================================
# This script helps you configure all required secrets
# ============================================

set -e  # Exit on error

echo "🔐 Setting up Cloudflare Secrets..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler is not installed"
    echo "   Install: npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Cloudflare"
    echo "   Run: wrangler login"
    exit 1
fi

echo "✅ Wrangler is installed and authenticated"
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local description=$2
    local required=$3
    local example=$4

    echo "============================================"
    echo "Setting: $secret_name"
    echo "Description: $description"
    if [ "$example" != "" ]; then
        echo "Example: $example"
    fi
    echo "============================================"

    if [ "$required" = "yes" ]; then
        echo "⚠️  REQUIRED - System won't work without this"
    else
        echo "ℹ️  OPTIONAL - Skip if you don't need this feature"
    fi

    echo ""
    read -p "Do you want to set $secret_name now? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        wrangler secret put "$secret_name"
        echo "✅ $secret_name configured successfully!"
    else
        echo "⏭️  Skipped $secret_name"
    fi

    echo ""
}

# Required Secrets
echo "============================================"
echo "📋 REQUIRED SECRETS"
echo "============================================"
echo ""

# SESSION_SECRET
echo "🔑 Generating a random SESSION_SECRET for you..."
SESSION_SECRET=$(openssl rand -base64 32)
echo ""
echo "Generated SECRET: $SESSION_SECRET"
echo ""
echo "You can use this or provide your own."
echo ""

read -p "Use the generated secret? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "$SESSION_SECRET" | wrangler secret put SESSION_SECRET
    echo "✅ SESSION_SECRET configured!"
else
    wrangler secret put SESSION_SECRET
fi

echo ""

# Optional Secrets
echo "============================================"
echo "📋 OPTIONAL SECRETS"
echo "============================================"
echo ""

set_secret "ANTHROPIC_API_KEY" \
    "For AI Assistant feature" \
    "no" \
    "sk-ant-api03-..."

set_secret "RESEND_API_KEY" \
    "For sending emails" \
    "no" \
    "re_..."

set_secret "RESEND_WEBHOOK_SECRET" \
    "For email webhook verification" \
    "no" \
    "whsec_..."

set_secret "ZAPIER_WEBHOOK_URL" \
    "For Zapier integrations" \
    "no" \
    "https://hooks.zapier.com/..."

echo "============================================"
echo "✅ Secrets setup complete!"
echo "============================================"
echo ""
echo "To view configured secrets:"
echo "  wrangler secret list"
echo ""
echo "To update a secret:"
echo "  wrangler secret put SECRET_NAME"
echo ""
echo "To delete a secret:"
echo "  wrangler secret delete SECRET_NAME"
echo ""
echo "Next steps:"
echo "1. Run: npm run build (to test build)"
echo "2. Run: wrangler deploy (to deploy)"
echo ""
