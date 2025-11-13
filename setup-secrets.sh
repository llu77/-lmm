#!/bin/bash
# Interactive Setup Script for Cloudflare Pages Secrets
# SymbolAI Financial Management System
# Project: lkm-hr-system

set -e

PROJECT="lkm-hr-system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║     ${CYAN}SymbolAI Secrets Setup Wizard${BLUE}                    ║${NC}"
echo -e "${BLUE}║     ${PURPLE}Interactive Configuration Tool${BLUE}                   ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to generate SESSION_SECRET
generate_session_secret() {
    if command -v node &> /dev/null; then
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    elif command -v openssl &> /dev/null; then
        openssl rand -hex 32
    else
        echo "$(date +%s%N)$(hostname)" | sha256sum | cut -d' ' -f1
    fi
}

# Function to check if wrangler is installed
check_wrangler() {
    if ! command -v wrangler &> /dev/null && ! command -v npx &> /dev/null; then
        echo -e "${RED}✘ Error: Neither 'wrangler' nor 'npx' found${NC}"
        echo -e "${YELLOW}Please install wrangler: npm install -g wrangler${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Wrangler available${NC}"
}

# Function to list current secrets
list_secrets() {
    echo -e "${CYAN}→ Checking existing secrets for project: $PROJECT...${NC}"
    npx wrangler pages secret list --project-name=$PROJECT 2>/dev/null || \
        echo -e "${YELLOW}⚠ Could not list secrets (authentication may be required)${NC}"
}

# Function to set a secret
set_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    echo ""
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Setting: ${YELLOW}$secret_name${NC}"
    echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Description:${NC} $description"
    echo -e "${BLUE}Project:${NC} $PROJECT"
    echo ""

    if [ -n "$secret_value" ]; then
        echo -e "${YELLOW}Value provided: ${secret_value:0:10}...${NC}"
        echo "$secret_value" | npx wrangler pages secret put "$secret_name" --project-name=$PROJECT 2>&1
    else
        echo -e "${YELLOW}Please enter the value for $secret_name:${NC}"
        npx wrangler pages secret put "$secret_name" --project-name=$PROJECT 2>&1
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $secret_name set successfully${NC}"
        return 0
    else
        echo -e "${RED}✘ Failed to set $secret_name${NC}"
        return 1
    fi
}

# Main menu
main_menu() {
    echo ""
    echo -e "${CYAN}╭─────────────────────────────────────────────────────────╮${NC}"
    echo -e "${CYAN}│                    Setup Options                        │${NC}"
    echo -e "${CYAN}╰─────────────────────────────────────────────────────────╯${NC}"
    echo ""
    echo -e "  ${GREEN}1${NC}) 🔴 Set ${YELLOW}RESEND_API_KEY${NC} (REQUIRED)"
    echo -e "  ${GREEN}2${NC}) 🟡 Set ${YELLOW}SESSION_SECRET${NC} (RECOMMENDED)"
    echo -e "  ${GREEN}3${NC}) 🟢 Set ${YELLOW}ANTHROPIC_API_KEY${NC} (Optional)"
    echo -e "  ${GREEN}4${NC}) 🟢 Set ${YELLOW}ZAPIER_WEBHOOK_URL${NC} (Optional)"
    echo -e "  ${GREEN}5${NC}) 🟢 Set ${YELLOW}RESEND_WEBHOOK_SECRET${NC} (Optional)"
    echo ""
    echo -e "  ${BLUE}6${NC}) 🚀 Quick Setup (All Required Secrets)"
    echo -e "  ${BLUE}7${NC}) 🔍 List Current Secrets"
    echo -e "  ${BLUE}8${NC}) 📋 Show Configuration Summary"
    echo ""
    echo -e "  ${PURPLE}0${NC}) 🚪 Exit"
    echo ""
    echo -ne "${CYAN}Enter your choice [0-8]: ${NC}"
}

# Quick setup function
quick_setup() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║           Quick Setup - Required Secrets                ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # 1. RESEND_API_KEY
    echo -e "${YELLOW}1. RESEND_API_KEY${NC}"
    echo -e "   Get it from: ${CYAN}https://resend.com/api-keys${NC}"
    echo -e "   Format: ${BLUE}re_xxxxxxxxxxxxxxxxxx${NC}"
    set_secret "RESEND_API_KEY" "" "Required for email delivery system"

    # 2. SESSION_SECRET
    echo ""
    echo -e "${YELLOW}2. SESSION_SECRET${NC}"
    echo -e "   Generating secure random secret..."
    SESSION_SECRET=$(generate_session_secret)
    echo -e "   Generated: ${BLUE}${SESSION_SECRET:0:16}...${NC}"
    echo -e "   ${GREEN}✓ Automatically generated${NC}"
    set_secret "SESSION_SECRET" "$SESSION_SECRET" "Session encryption key (auto-generated)"

    echo ""
    echo -e "${GREEN}✓ Quick setup complete!${NC}"
    echo -e "${YELLOW}Don't forget to set optional secrets if needed${NC}"
}

# Show configuration summary
show_summary() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              Configuration Summary                       ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    echo -e "${CYAN}📦 Environment Variables (in wrangler.toml):${NC}"
    echo -e "   1. ENVIRONMENT = production"
    echo -e "   2. AI_GATEWAY_ACCOUNT_ID = 85b01d19439ca53d3cfa740d2621a2bd"
    echo -e "   3. AI_GATEWAY_NAME = symbolai-gateway"
    echo -e "   4. EMAIL_FROM = info@symbolai.net"
    echo -e "   5. EMAIL_FROM_NAME = SymbolAI"
    echo -e "   6. ADMIN_EMAIL = admin@symbolai.net"
    echo ""

    echo -e "${CYAN}🔐 Required Secrets:${NC}"
    echo -e "   ${RED}●${NC} RESEND_API_KEY       - Email delivery"
    echo -e "   ${YELLOW}●${NC} SESSION_SECRET        - Session encryption"
    echo ""

    echo -e "${CYAN}🔐 Optional Secrets:${NC}"
    echo -e "   ${GREEN}○${NC} ANTHROPIC_API_KEY     - AI features"
    echo -e "   ${GREEN}○${NC} ZAPIER_WEBHOOK_URL    - Zapier integration"
    echo -e "   ${GREEN}○${NC} RESEND_WEBHOOK_SECRET - Resend webhooks"
    echo ""

    echo -e "${CYAN}🔗 Cloudflare Bindings (already configured):${NC}"
    echo -e "   • D1 Database: DB"
    echo -e "   • KV: SESSIONS, CACHE, FILES, RATE_LIMIT, OAUTH_KV"
    echo -e "   • R2: PAYROLL_BUCKET, STORAGE"
    echo ""

    echo -e "${CYAN}📚 Documentation:${NC}"
    echo -e "   • Full guide: ENVIRONMENT_VARIABLES_COMPLETE.md"
    echo -e "   • Setup guide: ENVIRONMENT_SETUP.md"
    echo ""
}

# Main script
clear
check_wrangler

while true; do
    main_menu
    read -r choice

    case $choice in
        1)
            set_secret "RESEND_API_KEY" "" "Required for email delivery system. Get from: https://resend.com/api-keys"
            ;;
        2)
            echo ""
            echo -e "${CYAN}Generating SESSION_SECRET...${NC}"
            SESSION_SECRET=$(generate_session_secret)
            echo -e "${GREEN}Generated: ${SESSION_SECRET:0:20}...${NC}"
            echo ""
            echo -e "${YELLOW}Do you want to use this auto-generated secret? [Y/n]${NC}"
            read -r use_generated
            if [[ "$use_generated" =~ ^[Nn]$ ]]; then
                set_secret "SESSION_SECRET" "" "Session encryption key (minimum 32 characters)"
            else
                set_secret "SESSION_SECRET" "$SESSION_SECRET" "Session encryption key (auto-generated)"
            fi
            ;;
        3)
            set_secret "ANTHROPIC_API_KEY" "" "Optional: For AI assistant features. Get from: https://console.anthropic.com/"
            ;;
        4)
            set_secret "ZAPIER_WEBHOOK_URL" "" "Optional: For Zapier workflow automation. Get from: https://zapier.com/app/zaps"
            ;;
        5)
            set_secret "RESEND_WEBHOOK_SECRET" "" "Optional: For Resend webhook validation. Get from: https://resend.com/webhooks"
            ;;
        6)
            quick_setup
            ;;
        7)
            list_secrets
            ;;
        8)
            show_summary
            ;;
        0)
            echo ""
            echo -e "${GREEN}✓ Setup wizard completed${NC}"
            echo -e "${YELLOW}Next steps:${NC}"
            echo -e "  1. Verify secrets: ${CYAN}npx wrangler secret list${NC}"
            echo -e "  2. Deploy: ${CYAN}npx wrangler pages deploy symbolai-worker/dist${NC}"
            echo -e "  3. Test: ${CYAN}curl https://symbolai.net/api/health${NC}"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}✘ Invalid choice. Please enter 0-8${NC}"
            ;;
    esac

    echo ""
    echo -ne "${YELLOW}Press Enter to continue...${NC}"
    read -r
    clear
done
