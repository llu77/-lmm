#!/usr/bin/env node

/**
 * Cloudflare Pages Build Status Checker
 * Updated for 2024/2025 - Uses official Pages API
 *
 * API Documentation:
 * https://developers.cloudflare.com/api/resources/pages/
 */

const ACCOUNT_ID = '85b01d19439ca53d3cfa740d2621a2bd';
const API_TOKEN = '2Auk5i5N0_pyBpt8kqnylef3ocAOk9a1tMUA4Gqz';
const API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * Make authenticated request to Cloudflare API
 */
async function cfApiRequest(endpoint) {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ API Request failed: ${error.message}`);
    throw error;
  }
}

/**
 * List all Pages projects
 */
async function listPagesProjects() {
  console.log('📦 Fetching Cloudflare Pages projects...\n');

  const data = await cfApiRequest(`/accounts/${ACCOUNT_ID}/pages/projects`);

  if (!data.success) {
    throw new Error(`API Error: ${JSON.stringify(data.errors)}`);
  }

  return data.result || [];
}

/**
 * Get deployments for a specific project
 */
async function getProjectDeployments(projectName, limit = 10) {
  const data = await cfApiRequest(
    `/accounts/${ACCOUNT_ID}/pages/projects/${projectName}/deployments?per_page=${limit}`
  );

  if (!data.success) {
    throw new Error(`API Error: ${JSON.stringify(data.errors)}`);
  }

  return data.result || [];
}

/**
 * Format deployment stage status
 */
function formatStageStatus(stage) {
  const statusEmojis = {
    'success': '✅',
    'failure': '❌',
    'active': '🔄',
    'queued': '⏳',
    'canceled': '⚠️',
    'skipped': '⏭️',
  };

  const status = stage?.status || 'unknown';
  const emoji = statusEmojis[status] || '❓';

  return `${emoji} ${status.toUpperCase()}`;
}

/**
 * Format deployment info
 */
function formatDeployment(deployment, index) {
  const stage = deployment.latest_stage || {};
  const metadata = deployment.deployment_trigger?.metadata || {};

  console.log(`\n  ${index + 1}. ${formatStageStatus(stage)}`);
  console.log(`     🆔 ID: ${deployment.id}`);
  console.log(`     🌿 Branch: ${metadata.branch || 'N/A'}`);
  console.log(`     📝 Commit: ${metadata.commit_hash?.substring(0, 7) || 'N/A'}`);
  console.log(`     💬 Message: ${metadata.commit_message?.substring(0, 60) || 'N/A'}`);
  console.log(`     🔗 URL: ${deployment.url || 'N/A'}`);
  console.log(`     📅 Created: ${new Date(deployment.created_on).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}`);

  if (stage.started_on && stage.ended_on) {
    const duration = new Date(stage.ended_on) - new Date(stage.started_on);
    console.log(`     ⏱️  Duration: ${Math.round(duration / 1000)}s`);
  }

  if (stage.status === 'failure') {
    console.log(`     ⚠️  Build failed - check logs at: https://dash.cloudflare.com/${ACCOUNT_ID}/pages`);
  }
}

/**
 * Calculate success rate
 */
function calculateSuccessRate(deployments) {
  if (deployments.length === 0) return 0;

  const successful = deployments.filter(d => d.latest_stage?.status === 'success').length;
  return Math.round((successful / deployments.length) * 100);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('\n🚀 Cloudflare Pages Build Status Checker');
    console.log('='.repeat(60));
    console.log(`📅 Date: ${new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}`);
    console.log('='.repeat(60));

    // Get all projects
    const projects = await listPagesProjects();

    if (projects.length === 0) {
      console.log('\n⚠️  No Pages projects found in this account.');
      console.log('   Create one at: https://dash.cloudflare.com/pages');
      return;
    }

    console.log(`\n📦 Found ${projects.length} Pages project(s):\n`);

    // Process each project
    for (const project of projects) {
      console.log('\n' + '='.repeat(60));
      console.log(`📄 Project: ${project.name}`);
      console.log('='.repeat(60));
      console.log(`🌐 Production URL: https://${project.subdomain}`);
      console.log(`🔗 Custom Domains: ${project.domains?.join(', ') || 'None'}`);
      console.log(`🌿 Production Branch: ${project.production_branch || 'main'}`);
      console.log(`📅 Created: ${new Date(project.created_on).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })}`);

      // Get deployments
      console.log('\n📊 Latest 10 Deployments:');
      const deployments = await getProjectDeployments(project.name, 10);

      if (deployments.length === 0) {
        console.log('   No deployments found.');
        continue;
      }

      deployments.forEach((deployment, index) => {
        formatDeployment(deployment, index);
      });

      // Statistics
      const successRate = calculateSuccessRate(deployments);
      const productionDeployment = deployments.find(d => d.environment === 'production');

      console.log('\n' + '-'.repeat(60));
      console.log(`📈 Success Rate: ${successRate}% (last ${deployments.length} deployments)`);

      if (productionDeployment) {
        console.log(`\n🚀 Production Deployment:`);
        console.log(`   Status: ${formatStageStatus(productionDeployment.latest_stage)}`);
        console.log(`   URL: ${productionDeployment.url}`);
        console.log(`   Branch: ${productionDeployment.deployment_trigger?.metadata?.branch || 'N/A'}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Done!');
    console.log('='.repeat(60));
    console.log('\n💡 Tip: Visit https://dash.cloudflare.com/' + ACCOUNT_ID + '/pages for full details\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check your API token has "Cloudflare Pages:Edit" permission');
    console.error('   2. Verify the Account ID is correct');
    console.error('   3. Ensure you have Pages projects in this account');
    process.exit(1);
  }
}

// Run
main();
