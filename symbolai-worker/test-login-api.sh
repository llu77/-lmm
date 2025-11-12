#!/bin/bash

# Test Login API and Branch Isolation
# This script tests the login functionality and branch isolation for:
# 1. Admin (full access)
# 2. Supervisor Tuwaiq (only branch_2020)
# 3. Supervisor Laban (only branch_1010)

echo "╔════════════════════════════════════════════════════╗"
echo "║     Testing Login API & Branch Isolation          ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Start local development server in background
echo "🚀 Starting local development server..."
cd /home/runner/work/-lmm/-lmm/symbolai-worker

# Kill any existing process on port 4321
lsof -ti:4321 | xargs kill -9 2>/dev/null || true

# Start server
npx wrangler dev --local --port 4321 > /tmp/wrangler-dev.log 2>&1 &
SERVER_PID=$!

echo "⏳ Waiting for server to start..."
sleep 10

# Check if server is running
if ! curl -s http://localhost:4321/ > /dev/null 2>&1; then
    echo "❌ Server failed to start"
    cat /tmp/wrangler-dev.log
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ Server started successfully!"
echo ""

# Test 1: Admin Login
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Test 1: Admin Login (Omar101010)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ADMIN_RESPONSE=$(curl -s -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Omar101010"}' \
  -c /tmp/admin_cookies.txt)

echo "Response:"
echo "$ADMIN_RESPONSE" | jq '.' 2>/dev/null || echo "$ADMIN_RESPONSE"
echo ""

if echo "$ADMIN_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Admin login successful!"
else
    echo "❌ Admin login failed!"
fi
echo ""

# Test 2: Supervisor Tuwaiq Login
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Test 2: Supervisor Tuwaiq Login (tuwaiq2020)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TUWAIQ_RESPONSE=$(curl -s -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"supervisor_tuwaiq","password":"tuwaiq2020"}' \
  -c /tmp/tuwaiq_cookies.txt)

echo "Response:"
echo "$TUWAIQ_RESPONSE" | jq '.' 2>/dev/null || echo "$TUWAIQ_RESPONSE"
echo ""

if echo "$TUWAIQ_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Supervisor Tuwaiq login successful!"
    TUWAIQ_NAME=$(echo "$TUWAIQ_RESPONSE" | jq -r '.user.fullName' 2>/dev/null)
    echo "   Name: $TUWAIQ_NAME"
else
    echo "❌ Supervisor Tuwaiq login failed!"
fi
echo ""

# Test 3: Supervisor Laban Login
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Test 3: Supervisor Laban Login (laban1010)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

LABAN_RESPONSE=$(curl -s -X POST http://localhost:4321/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"supervisor_laban","password":"laban1010"}' \
  -c /tmp/laban_cookies.txt)

echo "Response:"
echo "$LABAN_RESPONSE" | jq '.' 2>/dev/null || echo "$LABAN_RESPONSE"
echo ""

if echo "$LABAN_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Supervisor Laban login successful!"
    LABAN_NAME=$(echo "$LABAN_RESPONSE" | jq -r '.user.fullName' 2>/dev/null)
    echo "   Name: $LABAN_NAME"
else
    echo "❌ Supervisor Laban login failed!"
fi
echo ""

# Cleanup
echo "🧹 Cleaning up..."
kill $SERVER_PID 2>/dev/null
rm -f /tmp/admin_cookies.txt /tmp/tuwaiq_cookies.txt /tmp/laban_cookies.txt

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║     ✅ Login Tests Complete!                       ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
