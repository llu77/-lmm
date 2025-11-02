#!/bin/bash

# Get the subdomain from wrangler deployment
# This script extracts the HOST URL from deployed worker

WORKER_NAME="mcp-agent-worker"

# Try to get the subdomain from wrangler
SUBDOMAIN=$(npx wrangler deployments list --name "$WORKER_NAME" 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.workers\.dev' | head -1)

if [ -z "$SUBDOMAIN" ]; then
    # Default to workers.dev subdomain format
    echo "https://${WORKER_NAME}.workers.dev"
else
    echo "$SUBDOMAIN"
fi
