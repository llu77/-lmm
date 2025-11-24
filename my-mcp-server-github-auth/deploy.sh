#!/bin/bash

# MCP Server GitHub Auth - Deployment Script
# This script automates the deployment process for the MCP Server with GitHub OAuth
#
# Usage: ./deploy.sh
# Make executable with: chmod +x deploy.sh
# Or run with: bash deploy.sh

set -e  # Exit on error

# Configuration
DATABASE_NAME="symbolai-financial-db"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists npx; then
    print_error "npx is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if Wrangler is available via npx
if ! npx wrangler --version >/dev/null 2>&1; then
    print_error "Wrangler CLI is not available via npx."
    print_info "Please install it with: npm install -g wrangler"
    exit 1
fi

print_success "Prerequisites check passed"

# Navigate to the correct directory
cd "$(dirname "$0")" || exit 1
print_info "Working directory: $(pwd)"

# Check if .dev.vars exists for reference
if [ ! -f .dev.vars ]; then
    print_warning ".dev.vars file not found. Make sure to set secrets in production."
fi

# Step 1: Login to Cloudflare
print_info "Step 1: Logging in to Cloudflare..."
npx wrangler login
print_success "Logged in to Cloudflare"

# Step 2: Set secrets
print_info "Step 2: Setting up secrets..."
print_warning "You will be prompted to enter the following secrets:"
echo "  1. GITHUB_CLIENT_ID (from your GitHub OAuth App)"
echo "  2. GITHUB_CLIENT_SECRET (from your GitHub OAuth App)"
echo "  3. COOKIE_ENCRYPTION_KEY (generate a random 32-byte hex string)"
echo ""
print_info "Generate encryption key with one of these methods:"
echo "  - OpenSSL: openssl rand -hex 32"
echo "  - Node.js: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
echo ""

read -p "Press Enter to continue with setting secrets..."

# Set GITHUB_CLIENT_ID
print_info "Setting GITHUB_CLIENT_ID..."
npx wrangler secret put GITHUB_CLIENT_ID

# Set GITHUB_CLIENT_SECRET
print_info "Setting GITHUB_CLIENT_SECRET..."
npx wrangler secret put GITHUB_CLIENT_SECRET

# Set COOKIE_ENCRYPTION_KEY
print_info "Setting COOKIE_ENCRYPTION_KEY..."
npx wrangler secret put COOKIE_ENCRYPTION_KEY

print_success "Secrets configured"

# Step 3: Initialize D1 Database
print_info "Step 3: Initializing D1 database..."

# Check if database exists
if npx wrangler d1 list | grep -q "$DATABASE_NAME"; then
    print_success "Database '$DATABASE_NAME' found"
    read -p "Do you want to re-apply the schema? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Applying database schema..."
        npx wrangler d1 execute "$DATABASE_NAME" --file=./schema.sql
        print_success "Database schema applied"
    else
        print_info "Skipping schema application"
    fi
else
    print_error "Database '$DATABASE_NAME' not found!"
    print_info "Please create the database first using one of these methods:"
    echo "  1. Via Cloudflare Dashboard: Workers & Pages > D1 > Create database"
    echo "  2. Via Wrangler CLI: npx wrangler d1 create $DATABASE_NAME"
    echo ""
    print_info "After creating the database, update wrangler.jsonc with the database ID"
    read -p "Would you like to continue without database initialization? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled. Please create the database first."
        exit 1
    fi
    print_warning "Continuing without database initialization..."
fi

# Step 4: Deploy
print_info "Step 4: Deploying to Cloudflare Workers..."
npx wrangler deploy

print_success "🎉 Deployment completed successfully!"

# Display post-deployment information
echo ""
print_info "Next steps:"
echo "  1. Test your deployment using the MCP Inspector:"
echo "     npx @modelcontextprotocol/inspector@latest"
echo ""
echo "  2. Your MCP server should be available at:"
echo "     https://my-mcp-server-github-auth.<your-subdomain>.workers.dev"
echo ""
echo "  3. Connect Claude Desktop by adding to your config:"
echo '     {
       "mcpServers": {
         "github-mcp": {
           "command": "npx",
           "args": ["mcp-remote", "https://my-mcp-server-github-auth.<subdomain>.workers.dev/sse"]
         }
       }
     }'
echo ""
print_info "For more information, see DEPLOYMENT.md"
