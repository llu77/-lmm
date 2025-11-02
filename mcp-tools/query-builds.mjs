#!/usr/bin/env node

/**
 * Cloudflare MCP Client - Query Pages Builds
 *
 * Uses Builds MCP server to check deployment status
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Cloudflare Configuration
const ACCOUNT_ID = '85b01d19439ca53d3cfa740d2621a2bd';
const API_TOKEN = '2Auk5i5N0_pyBpt8kqnylef3ocAOk9a1tMUA4Gqz';
const BUILDS_MCP_URL = 'https://builds.mcp.cloudflare.com/mcp';

/**
 * Connect to Builds MCP server
 */
async function connectToBuildsMCP() {
  console.log('🔗 Connecting to Cloudflare Builds MCP...\n');

  const client = new Client(
    {
      name: 'cloudflare-builds-cli',
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
    new URL(BUILDS_MCP_URL),
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
  console.log('✅ Connected to Builds MCP\n');

  return client;
}

/**
 * List all Pages projects
 */
async function listPagesProjects(client) {
  console.log('📋 Listing Pages Projects...');
  console.log('='.repeat(70));

  try {
    // List available tools first
    const toolsResponse = await client.listTools();
    console.log('\n🔧 Available tools:');
    toolsResponse.tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`     ${tool.description}`);
      }
    });

    // List resources (projects, deployments)
    const resourcesResponse = await client.listResources();
    console.log('\n📦 Available resources:');
    if (resourcesResponse.resources && resourcesResponse.resources.length > 0) {
      resourcesResponse.resources.forEach((resource, index) => {
        console.log(`  ${index + 1}. ${resource.uri}`);
        if (resource.name) {
          console.log(`     Name: ${resource.name}`);
        }
        if (resource.description) {
          console.log(`     Description: ${resource.description}`);
        }
      });
    } else {
      console.log('   No resources available');
    }

    console.log('\n' + '='.repeat(70));
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

/**
 * Get deployment status for a project
 */
async function getDeploymentStatus(client, projectName) {
  console.log(`\n🔍 Checking deployment status for: ${projectName}`);
  console.log('='.repeat(70));

  try {
    // Try to call a tool to get deployment status
    const response = await client.callTool({
      name: 'get_deployments',
      arguments: {
        project_name: projectName,
        limit: 10,
      },
    });

    console.log('Deployment Status:');
    console.log(JSON.stringify(response, null, 2));
    console.log('='.repeat(70));
  } catch (error) {
    console.error(`❌ Error getting deployment status: ${error.message}`);

    // Try reading as resource
    try {
      console.log('Trying to read as resource...');
      const resourceResponse = await client.readResource({
        uri: `cloudflare://pages/${projectName}/deployments`,
      });
      console.log('Resource data:');
      console.log(JSON.stringify(resourceResponse, null, 2));
    } catch (resError) {
      console.error(`❌ Resource read failed: ${resError.message}`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 Cloudflare Pages Builds Monitor');
  console.log('='.repeat(70));
  console.log(`Account ID: ${ACCOUNT_ID}`);
  console.log('='.repeat(70));

  try {
    const client = await connectToBuildsMCP();

    // List projects and resources
    await listPagesProjects(client);

    // Check specific project if provided
    const projectName = process.argv[2];
    if (projectName) {
      await getDeploymentStatus(client, projectName);
    } else {
      console.log('\n💡 Tip: Run with project name to check specific deployments:');
      console.log('   node query-builds.mjs <project-name>');
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
