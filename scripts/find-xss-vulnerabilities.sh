#!/bin/bash

# XSS Vulnerability Scanner for Astro Files
# Scans for potentially dangerous innerHTML usage

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       🔍 XSS Vulnerability Scanner                        ║"
echo "║       Scanning Astro files for innerHTML usage...         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

ASTRO_DIR="symbolai-worker/src/pages"
FOUND=0

echo "📁 Scanning directory: $ASTRO_DIR"
echo ""

# 1. Find all innerHTML usage
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  innerHTML usage (potentially unsafe):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESULT=$(grep -rn "\.innerHTML" "$ASTRO_DIR" --include="*.astro" 2>/dev/null | grep -v "// Safe" | grep -v "innerHTML = ''" || echo "")
if [ -n "$RESULT" ]; then
  echo "$RESULT"
  COUNT=$(echo "$RESULT" | wc -l)
  FOUND=$((FOUND + COUNT))
  echo ""
  echo "⚠️  Found $COUNT instances of innerHTML usage"
else
  echo "✅ No innerHTML usage found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Dangerous template literals with variables:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESULT=$(grep -rn "\.innerHTML.*\$\{" "$ASTRO_DIR" --include="*.astro" 2>/dev/null || echo "")
if [ -n "$RESULT" ]; then
  echo "$RESULT"
  COUNT=$(echo "$RESULT" | wc -l)
  FOUND=$((FOUND + COUNT))
  echo ""
  echo "🔴 Found $COUNT dangerous patterns (innerHTML with template literals)"
else
  echo "✅ No dangerous patterns found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Template literals with HTML and variables:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESULT=$(grep -rn "\`.*<.*\${.*}.*>\`" "$ASTRO_DIR" --include="*.astro" 2>/dev/null || echo "")
if [ -n "$RESULT" ]; then
  echo "$RESULT"
  COUNT=$(echo "$RESULT" | wc -l)
  FOUND=$((FOUND + COUNT))
  echo ""
  echo "⚠️  Found $COUNT HTML template literals with variables"
else
  echo "✅ No HTML template literals with variables found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Files summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FILES=$(grep -rl "\.innerHTML" "$ASTRO_DIR" --include="*.astro" 2>/dev/null | sort | uniq || echo "")
if [ -n "$FILES" ]; then
  echo "Files with innerHTML usage:"
  echo "$FILES" | nl
  FILE_COUNT=$(echo "$FILES" | wc -l)
  echo ""
  echo "📝 Total files affected: $FILE_COUNT"
else
  echo "✅ No files with innerHTML usage"
  FILE_COUNT=0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Scan Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   Total potential vulnerabilities: $FOUND"
echo "   Files affected: $FILE_COUNT"
echo ""

if [ $FOUND -gt 0 ]; then
  echo "🔴 Status: VULNERABLE"
  echo "   Action required: Review and fix innerHTML usage"
  echo "   See: XSS_FIX_GUIDE.md for instructions"
  echo ""
  exit 1
else
  echo "✅ Status: SAFE"
  echo "   No XSS vulnerabilities detected"
  echo ""
  exit 0
fi
