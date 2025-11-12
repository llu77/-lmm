#!/bin/bash
# Quick Setup Script for Required Secrets
# Cloudflare Pages Project: lkm-hr-system

set -e

PROJECT="lkm-hr-system"
SESSION_SECRET="caf411de499d41c5c0ed733ca12f396e6ce01c5f630d0c088bcd3f570d5b2fff"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║     ${CYAN}SymbolAI Required Secrets Setup${BLUE}                  ║${NC}"
echo -e "${BLUE}║     ${YELLOW}Project: lkm-hr-system${BLUE}                           ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check wrangler
if ! command -v npx &> /dev/null; then
    echo -e "${RED}✘ Error: 'npx' not found${NC}"
    echo -e "${YELLOW}Please install Node.js and npm${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npx available${NC}"
echo ""

# Setup 1: RESEND_API_KEY
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}🔴 REQUIRED SECRET 1/2: RESEND_API_KEY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Purpose:${NC} Email delivery system (CRITICAL)"
echo -e "${YELLOW}Get from:${NC} ${CYAN}https://resend.com/api-keys${NC}"
echo -e "${YELLOW}Format:${NC} ${BLUE}re_xxxxxxxxxxxxxxxxxxxx${NC}"
echo ""
echo -e "${YELLOW}Please enter your RESEND_API_KEY:${NC}"

npx wrangler pages secret put RESEND_API_KEY --project-name=$PROJECT

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ RESEND_API_KEY set successfully${NC}"
else
    echo -e "${RED}✘ Failed to set RESEND_API_KEY${NC}"
    exit 1
fi

echo ""

# Setup 2: SESSION_SECRET
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🟡 RECOMMENDED SECRET 2/2: SESSION_SECRET${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Purpose:${NC} Session encryption and security"
echo -e "${YELLOW}Value:${NC} ${BLUE}Auto-generated (64 characters)${NC}"
echo ""
echo -e "${GREEN}Generated SESSION_SECRET:${NC}"
echo -e "${CYAN}${SESSION_SECRET:0:32}...${NC}"
echo ""
echo -e "${YELLOW}Setting SESSION_SECRET...${NC}"

echo "$SESSION_SECRET" | npx wrangler pages secret put SESSION_SECRET --project-name=$PROJECT

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SESSION_SECRET set successfully${NC}"
else
    echo -e "${RED}✘ Failed to set SESSION_SECRET${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Required secrets setup complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verify
echo -e "${CYAN}🔍 Verifying secrets...${NC}"
npx wrangler pages secret list --project-name=$PROJECT

echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo -e "  ${GREEN}1.${NC} Deploy your project:"
echo -e "     ${CYAN}npx wrangler pages deploy symbolai-worker/dist${NC}"
echo ""
echo -e "  ${GREEN}2.${NC} Test email system:"
echo -e "     ${CYAN}curl -X POST https://symbolai.net/api/email/test \\${NC}"
echo -e "     ${CYAN}  -H 'Content-Type: application/json' \\${NC}"
echo -e "     ${CYAN}  -d '{\"to\":[\"test@example.com\"]}'${NC}"
echo ""
echo -e "  ${GREEN}3.${NC} Set optional secrets (if needed):"
echo -e "     ${CYAN}npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=$PROJECT${NC}"
echo -e "     ${CYAN}npx wrangler pages secret put ZAPIER_WEBHOOK_URL --project-name=$PROJECT${NC}"
echo ""
echo -e "${GREEN}✨ Setup completed successfully!${NC}"
echo ""
