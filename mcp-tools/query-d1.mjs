#!/usr/bin/env node

/**
 * Cloudflare MCP Client - Query D1 Databases
 *
 * Uses Bindings MCP server to interact with D1 databases
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Cloudflare Configuration
const ACCOUNT_ID = '85b01d19439ca53d3cfa740d2621a2bd';
const API_TOKEN = '2Auk5i5N0_pyBpt8kqnylef3ocAOk9a1tMUA4Gqz';
const BINDINGS_MCP_URL = 'https://bindings.mcp.cloudflare.com/mcp';

/**
 * Connect to Bindings MCP server
 */
async function connectToBindingsMCP() {
  console.log('🔗 Connecting to Cloudflare Bindings MCP...\n');

  const client = new Client(
    {
      name: 'cloudflare-d1-cli',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  const transport = new StreamableHTTPClientTransport(
    new URL(BINDINGS_MCP_URL),
    {
      requestInit: {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'X-Account-ID': ACCOUNT_ID,
        },
      },
    }
  );

  await client.connect(transport);
  console.log('✅ Connected to Bindings MCP\n');

  return client;
}

/**
 * List available tools and resources
 */
async function exploreBindings(client) {
  console.log('📋 Exploring Available Bindings...');
  console.log('='.repeat(70));

  try {
    // List available tools
    const toolsResponse = await client.listTools();
    console.log('\n🔧 Available tools:');
    toolsResponse.tools.forEach((tool, index) => {
      console.log(`\n${index + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`   Description: ${tool.description}`);
      }
      if (tool.inputSchema?.properties) {
        const params = Object.keys(tool.inputSchema.properties);
        console.log(`   Parameters: ${params.join(', ')}`);
      }
    });

    // List available resources
    const resourcesResponse = await client.listResources();
    console.log('\n\n📦 Available resources:');
    if (resourcesResponse.resources && resourcesResponse.resources.length > 0) {
      resourcesResponse.resources.forEach((resource, index) => {
        console.log(`\n${index + 1}. ${resource.uri}`);
        if (resource.name) {
          console.log(`   Name: ${resource.name}`);
        }
        if (resource.description) {
          console.log(`   Description: ${resource.description}`);
        }
      });
    } else {
      console.log('   No resources available');
    }

    console.log('\n' + '='.repeat(70));
    return toolsResponse.tools;
  } catch (error) {
    console.error(`❌ Error exploring bindings: ${error.message}`);
    return [];
  }
}

/**
 * Query D1 database
 */
async function queryD1(client, databaseName, query) {
  console.log(`\n🔍 Querying D1 database: ${databaseName}`);
  console.log(`📝 SQL: ${query}`);
  console.log('='.repeat(70));

  try {
    const response = await client.callTool({
      name: 'd1_query',
      arguments: {
        database: databaseName,
        sql: query,
      },
    });

    console.log('Query Results:');
    console.log(JSON.stringify(response, null, 2));
    console.log('='.repeat(70));
  } catch (error) {
    console.error(`❌ Error querying D1: ${error.message}`);
  }
}

/**
 * List D1 databases
 */
async function listD1Databases(client) {
  console.log('\n📊 Listing D1 Databases...');
  console.log('='.repeat(70));

  try {
    // Try to read D1 databases as a resource
    const response = await client.readResource({
      uri: 'cloudflare://d1/databases',
    });

    console.log('D1 Databases:');
    console.log(JSON.stringify(response, null, 2));
    console.log('='.repeat(70));
  } catch (error) {
    console.error(`❌ Error listing D1 databases: ${error.message}`);

    // Alternative: try calling a tool
    try {
      const toolResponse = await client.callTool({
        name: 'list_d1_databases',
        arguments: {},
      });
      console.log('D1 Databases (via tool):');
      console.log(JSON.stringify(toolResponse, null, 2));
    } catch (toolError) {
      console.error(`❌ Tool call also failed: ${toolError.message}`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 Cloudflare D1 Database Explorer');
  console.log('='.repeat(70));
  console.log(`Account ID: ${ACCOUNT_ID}`);
  console.log('='.repeat(70));

  try {
    const client = await connectToBindingsMCP();

    // Explore available bindings
    const tools = await exploreBindings(client);

    // List D1 databases
    await listD1Databases(client);

    // Execute custom query if provided
    const databaseName = process.argv[2];
    const sqlQuery = process.argv[3];

    if (databaseName && sqlQuery) {
      await queryD1(client, databaseName, sqlQuery);
    } else if (tools.length > 0) {
      console.log('\n💡 Usage examples:');
      console.log('   node query-d1.mjs <database-name> "SELECT * FROM users LIMIT 10"');
      console.log('   node query-d1.mjs my-db "SELECT COUNT(*) FROM sessions"');
    }

    // Clean disconnect
    await client.close();
    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute
main();
