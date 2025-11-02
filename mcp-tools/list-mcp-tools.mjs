#!/usr/bin/env node

/**
 * Cloudflare MCP Client - List Available Tools
 *
 * Connects to Cloudflare MCP servers using StreamableHTTPClientTransport
 * and lists all available tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Cloudflare Configuration
const ACCOUNT_ID = '85b01d19439ca53d3cfa740d2621a2bd';
const API_TOKEN = '2Auk5i5N0_pyBpt8kqnylef3ocAOk9a1tMUA4Gqz';

const MCP_SERVERS = {
  bindings: 'https://bindings.mcp.cloudflare.com/mcp',
  builds: 'https://builds.mcp.cloudflare.com/mcp',
  observability: 'https://observability.mcp.cloudflare.com/mcp',
  docs: 'https://docs.mcp.cloudflare.com/mcp',
};

/**
 * Create and connect MCP client
 */
async function connectToMCP(serverUrl, serverName) {
  console.log(`\n🔗 Connecting to ${serverName}...`);
  console.log(`   URL: ${serverUrl}`);

  // Create client
  const client = new Client(
    {
      name: 'cloudflare-mcp-cli',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Create transport with auth headers
  const transport = new StreamableHTTPClientTransport(
    new URL(serverUrl),
    {
      requestInit: {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'X-Account-ID': ACCOUNT_ID,
        },
      },
    }
  );

  // Connect
  await client.connect(transport);
  console.log(`✅ Connected to ${serverName}\n`);

  return client;
}

/**
 * List all available tools from a server
 */
async function listTools(client, serverName) {
  console.log(`📋 ${serverName} - Available Tools:`);
  console.log('='.repeat(70));

  try {
    const response = await client.listTools();

    if (!response.tools || response.tools.length === 0) {
      console.log('   No tools available\n');
      return [];
    }

    response.tools.forEach((tool, index) => {
      console.log(`\n${index + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`   Description: ${tool.description}`);
      }
      if (tool.inputSchema?.properties) {
        const params = Object.keys(tool.inputSchema.properties);
        console.log(`   Parameters: ${params.join(', ')}`);
      }
    });

    console.log('\n' + '='.repeat(70));
    return response.tools;
  } catch (error) {
    console.error(`❌ Error listing tools: ${error.message}`);
    return [];
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 Cloudflare MCP Tools Discovery');
  console.log('='.repeat(70));
  console.log(`Account ID: ${ACCOUNT_ID}`);
  console.log('='.repeat(70));

  const allTools = {};

  // Connect to each MCP server
  for (const [key, url] of Object.entries(MCP_SERVERS)) {
    try {
      const client = await connectToMCP(url, key.toUpperCase());
      const tools = await listTools(client, key.toUpperCase());
      allTools[key] = tools;

      // Clean disconnect
      await client.close();
    } catch (error) {
      console.error(`\n❌ Failed to connect to ${key}: ${error.message}`);
      console.error(`   ${error.stack}\n`);
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log('='.repeat(70));
  for (const [server, tools] of Object.entries(allTools)) {
    console.log(`${server.padEnd(20)} ${tools.length} tools`);
  }
  console.log('='.repeat(70));
  console.log('\n✅ Done!\n');
}

// Execute
main().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
