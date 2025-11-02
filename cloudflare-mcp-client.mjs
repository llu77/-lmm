#!/usr/bin/env node

/**
 * Cloudflare MCP Client
 * Connects to Cloudflare MCP servers and executes tools
 *
 * Based on official Cloudflare MCP documentation:
 * https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Cloudflare Account Details
const ACCOUNT_ID = '85b01d19439ca53d3cfa740d2621a2bd';
const API_TOKEN = '2Auk5i5N0_pyBpt8kqnylef3ocAOk9a1tMUA4Gqz';

// MCP Server Endpoints
const MCP_SERVERS = {
  bindings: 'https://bindings.mcp.cloudflare.com/sse',
  builds: 'https://builds.mcp.cloudflare.com/sse',
  observability: 'https://observability.mcp.cloudflare.com/sse',
  docs: 'https://docs.mcp.cloudflare.com/sse',
};

/**
 * Create MCP client connected to Cloudflare server
 */
async function createMCPClient(serverUrl) {
  console.log(`🔗 Connecting to: ${serverUrl}`);

  const transport = new SSEClientTransport(new URL(serverUrl), {
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  const client = new Client({
    name: 'cloudflare-mcp-cli',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  await client.connect(transport);
  console.log('✅ Connected to MCP server\n');

  return client;
}

/**
 * List available tools
 */
async function listTools(client) {
  console.log('📋 Available Tools:');
  console.log('='.repeat(60));

  const result = await client.listTools();

  result.tools.forEach((tool, index) => {
    console.log(`\n${index + 1}. ${tool.name}`);
    console.log(`   Description: ${tool.description || 'N/A'}`);
    if (tool.inputSchema?.properties) {
      console.log(`   Parameters: ${Object.keys(tool.inputSchema.properties).join(', ')}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  return result.tools;
}

/**
 * Execute a tool
 */
async function executeTool(client, toolName, args = {}) {
  console.log(`\n🔧 Executing tool: ${toolName}`);
  console.log(`   Arguments: ${JSON.stringify(args, null, 2)}`);

  try {
    const result = await client.callTool({ name: toolName, arguments: args });

    console.log('\n✅ Result:');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 Cloudflare MCP Client');
  console.log('='.repeat(60));
  console.log(`Account ID: ${ACCOUNT_ID}`);
  console.log('='.repeat(60));

  try {
    // Connect to Bindings MCP server (D1, KV, R2, Workers)
    console.log('\n📦 Connecting to Cloudflare Bindings MCP Server...\n');
    const bindingsClient = await createMCPClient(MCP_SERVERS.bindings);

    // List available tools
    const tools = await listTools(bindingsClient);

    // Example: List D1 databases
    console.log('\n' + '='.repeat(60));
    console.log('🗄️  Querying D1 Databases...');
    console.log('='.repeat(60));

    const d1Tool = tools.find(t => t.name.includes('d1_databases_list') || t.name.includes('list') && t.name.includes('d1'));
    if (d1Tool) {
      await executeTool(bindingsClient, d1Tool.name, {});
    } else {
      console.log('⚠️  D1 list tool not found. Available tools:', tools.map(t => t.name).join(', '));
    }

    // Connect to Builds MCP server
    console.log('\n\n📦 Connecting to Cloudflare Builds MCP Server...\n');
    const buildsClient = await createMCPClient(MCP_SERVERS.builds);

    // List build tools
    const buildTools = await listTools(buildsClient);

    // Example: List recent builds
    console.log('\n' + '='.repeat(60));
    console.log('🏗️  Querying Recent Builds...');
    console.log('='.repeat(60));

    const listBuildsTools = buildTools.find(t => t.name.includes('list'));
    if (listBuildsTools) {
      await executeTool(buildsClient, listBuildsTools.name, { limit: 10 });
    }

    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createMCPClient, listTools, executeTool };
