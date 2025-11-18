#!/bin/bash

# Cloudflare D1 Database Connection Verification Script
# Run this script from a machine with internet access

set -e

echo "╔════════════════════════════════════════════════════╗"
echo "║   Cloudflare D1 Database Verification              ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLOUDFLARE_API_TOKEN="GMoMcGHgwgwJ1tzs58elGtYs5kVMPJsRjrBpqDNk"
ACCOUNT_ID="85b01d19439ca53d3cfa740d2621a2bd"
DATABASE_ID="3897ede2-ffc0-4fe8-8217-f9607c89bef2"

export CLOUDFLARE_API_TOKEN

echo "📋 Configuration:"
echo "  Account ID: $ACCOUNT_ID"
echo "  Database ID: $DATABASE_ID"
echo ""

# Step 1: Verify API Token
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Step 1: Verifying API Token..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOKEN_RESPONSE=$(curl -s "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")

if echo "$TOKEN_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✓ API Token is valid${NC}"
else
  echo -e "${RED}✗ API Token verification failed${NC}"
  echo "$TOKEN_RESPONSE"
  exit 1
fi
echo ""

# Step 2: List D1 Databases
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Step 2: Listing D1 Databases..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx wrangler d1 list

echo ""

# Step 3: Check Database Tables
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  Step 3: Checking Database Tables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx wrangler d1 execute DB --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo ""

# Step 4: Verify Users and Permissions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👥 Step 4: Verifying Users and Permissions..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx wrangler d1 execute DB --remote \
  --command="SELECT u.username, u.full_name, u.role_id, u.branch_id, r.can_view_all_branches FROM users_new u LEFT JOIN roles r ON u.role_id = r.id WHERE u.role_id IN ('role_admin', 'role_supervisor');"

echo ""

# Step 5: Verify Branches
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏢 Step 5: Verifying Branches..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npx wrangler d1 execute DB --remote \
  --command="SELECT id, name, name_ar, manager_name, is_active FROM branches WHERE id IN ('branch_1010', 'branch_2020');"

echo ""

# Step 6: Check if migrations need to be applied
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Step 6: Checking if migrations are applied..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ADMIN_CHECK=$(npx wrangler d1 execute DB --remote \
  --command="SELECT password FROM users_new WHERE username = 'admin';" 2>&1)

EXPECTED_HASH="d3d95716f02dea05fde0c75ce8d0aee0016718722d67d8ba5b44ab25feee0ccf"

if echo "$ADMIN_CHECK" | grep -q "$EXPECTED_HASH"; then
  echo -e "${GREEN}✓ Admin password is already updated (Omar101010)${NC}"
else
  echo -e "${YELLOW}⚠ Admin password needs to be updated${NC}"
  echo ""
  echo "Run these commands to apply migrations:"
  echo "  npx wrangler d1 execute DB --remote --file=./migrations/006_update_admin_password.sql"
  echo "  npx wrangler d1 execute DB --remote --file=./migrations/007_update_supervisors_names.sql"
fi

echo ""

# Step 7: Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Verification Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✓ Components Verified:"
echo "  • API Token: Valid"
echo "  • Database: Connected"
echo "  • Tables: Listed"
echo "  • Users: Checked"
echo "  • Branches: Checked"
echo ""
echo "🔑 Login Credentials:"
echo "  Admin: admin / Omar101010"
echo "  Supervisor Tuwaiq: supervisor_tuwaiq / tuwaiq2020"
echo "  Supervisor Laban: supervisor_laban / laban1010"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Verification Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
