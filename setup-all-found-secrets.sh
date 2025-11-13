#!/bin/bash
# Setup All Found Secrets - جميع الأسرار الموجودة
# SymbolAI Financial Management System

set -e

PROJECT="lkm-hr-system"

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
echo -e "${BLUE}║     ${CYAN}Setup All Found Secrets${BLUE}                          ║${NC}"
echo -e "${BLUE}║     ${YELLOW}تعيين جميع الأسرار الموجودة${BLUE}                    ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check npx
if ! command -v npx &> /dev/null; then
    echo -e "${RED}✘ Error: 'npx' not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npx available${NC}"
echo -e "${CYAN}Project: ${YELLOW}$PROJECT${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Found Secrets Summary:${NC}"
echo -e "${GREEN}✅ SESSION_SECRET${NC} - Auto-generated (64 chars)"
echo -e "${GREEN}✅ ZAPIER_WEBHOOK_URL${NC} - From repository"
echo -e "${YELLOW}⚠️  RESEND_API_KEY${NC} - You need to provide"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. SESSION_SECRET
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}[1/3] Setting SESSION_SECRET${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Value:${NC} ${YELLOW}caf411de...d5b2fff${NC} (auto-generated)"
echo ""

echo "caf411de499d41c5c0ed733ca12f396e6ce01c5f630d0c088bcd3f570d5b2fff" | \
  npx wrangler pages secret put SESSION_SECRET --project-name=$PROJECT

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SESSION_SECRET set successfully${NC}"
else
    echo -e "${RED}✘ Failed to set SESSION_SECRET${NC}"
    exit 1
fi

echo ""

# 2. ZAPIER_WEBHOOK_URL
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}[2/3] Setting ZAPIER_WEBHOOK_URL${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}URL:${NC} ${YELLOW}https://hooks.zapier.com/hooks/catch/4045e58...${NC}"
echo -e "${CYAN}Usage:${NC} Daily & Monthly scheduled tasks"
echo ""

echo "https://hooks.zapier.com/hooks/catch/4045e58858fec2e48109352fcd71ead5/" | \
  npx wrangler pages secret put ZAPIER_WEBHOOK_URL --project-name=$PROJECT

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ZAPIER_WEBHOOK_URL set successfully${NC}"
else
    echo -e "${RED}✘ Failed to set ZAPIER_WEBHOOK_URL${NC}"
    exit 1
fi

echo ""

# 3. RESEND_API_KEY
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}[3/3] Setting RESEND_API_KEY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Get from:${NC} ${YELLOW}https://resend.com/api-keys${NC}"
echo -e "${CYAN}Format:${NC} ${BLUE}re_xxxxxxxxxxxxxxxxxxxx${NC}"
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
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ All found secrets configured successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verify
echo -e "${CYAN}🔍 Verifying secrets...${NC}"
npx wrangler pages secret list --project-name=$PROJECT

echo ""
echo -e "${YELLOW}📋 Configuration Summary:${NC}"
echo ""
echo -e "  ${GREEN}✅ SESSION_SECRET${NC} - Session encryption (256-bit)"
echo -e "  ${GREEN}✅ ZAPIER_WEBHOOK_URL${NC} - Scheduled tasks automation"
echo -e "  ${GREEN}✅ RESEND_API_KEY${NC} - Email delivery service"
echo ""
echo -e "${YELLOW}📝 Optional Secrets (if needed):${NC}"
echo ""
echo -e "  ${BLUE}○${NC} RESEND_WEBHOOK_SECRET"
echo -e "     ${CYAN}npx wrangler pages secret put RESEND_WEBHOOK_SECRET --project-name=$PROJECT${NC}"
echo ""
echo -e "  ${BLUE}○${NC} ANTHROPIC_API_KEY"
echo -e "     ${CYAN}npx wrangler pages secret put ANTHROPIC_API_KEY --project-name=$PROJECT${NC}"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo ""
echo -e "  ${GREEN}1.${NC} Deploy your project:"
echo -e "     ${CYAN}npx wrangler pages deploy symbolai-worker/dist${NC}"
echo ""
echo -e "  ${GREEN}2.${NC} Test email system:"
echo -e "     ${CYAN}curl -X POST https://symbolai.net/api/email/test${NC}"
echo ""
echo -e "  ${GREEN}3.${NC} Test Zapier webhook:"
echo -e "     ${CYAN}curl -X POST https://hooks.zapier.com/hooks/catch/4045e58...${NC}"
echo ""
echo -e "${GREEN}✨ Setup completed successfully!${NC}"
echo ""
