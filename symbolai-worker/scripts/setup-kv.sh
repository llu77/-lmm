#!/bin/bash

# ============================================
# KV Namespace Setup Script
# ============================================
# This script creates the KV namespace and updates wrangler.toml
# ============================================

set -e  # Exit on error

echo "🚀 Setting up KV Namespace for Sessions..."
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

# Create KV namespace
echo "📦 Creating KV namespace 'SESSIONS'..."
echo ""

OUTPUT=$(wrangler kv:namespace create "SESSIONS" 2>&1)
echo "$OUTPUT"

# Extract ID from output
KV_ID=$(echo "$OUTPUT" | grep -oP 'id = "\K[^"]+' | head -1)

if [ -z "$KV_ID" ]; then
    echo ""
    echo "❌ Error: Failed to extract KV namespace ID"
    echo "   Please check the output above"
    exit 1
fi

echo ""
echo "✅ KV Namespace created successfully!"
echo "   ID: $KV_ID"
echo ""

# Update wrangler.toml
echo "📝 Updating wrangler.toml..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/id = \"PLACEHOLDER_KV_ID\"/id = \"$KV_ID\"/" ../wrangler.toml
else
    # Linux
    sed -i "s/id = \"PLACEHOLDER_KV_ID\"/id = \"$KV_ID\"/" ../wrangler.toml
fi

echo "✅ wrangler.toml updated with KV namespace ID"
echo ""

# Verify
echo "🔍 Verifying configuration..."
grep "id = \"$KV_ID\"" ../wrangler.toml && echo "✅ Configuration verified!" || echo "❌ Verification failed"

echo ""
echo "============================================"
echo "✅ KV Namespace setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Run: ./setup-secrets.sh (to configure secrets)"
echo "2. Run: npm run build (to test build)"
echo "3. Run: wrangler deploy (to deploy)"
echo ""
