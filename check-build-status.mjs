#!/usr/bin/env node

/**
 * Check Cloudflare Pages Build Status
 * Uses Cloudflare API directly to check deployment status
 */

const ACCOUNT_ID = '85b01d19439ca53d3cfa740d2621a2bd';
const API_TOKEN = '2Auk5i5N0_pyBpt8kqnylef3ocAOk9a1tMUA4Gqz';

async function checkBuildStatus() {
  try {
    console.log('🔍 Fetching Cloudflare Pages projects...\n');

    // List all Pages projects
    const projectsResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects`,
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const projectsData = await projectsResponse.json();

    if (!projectsData.success) {
      console.error('❌ Failed to fetch projects:', projectsData.errors);
      process.exit(1);
    }

    const projects = projectsData.result || [];
    console.log(`📦 Found ${projects.length} Pages project(s):\n`);

    for (const project of projects) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 Project: ${project.name}`);
      console.log(`🌐 Production URL: https://${project.subdomain}`);
      console.log(`🔗 Custom Domains: ${project.domains?.join(', ') || 'None'}`);
      console.log(`🌿 Production Branch: ${project.production_branch}`);
      console.log(`📅 Created: ${new Date(project.created_on).toLocaleString()}`);

      // Get latest deployments
      const deploymentsResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${project.name}/deployments?per_page=5`,
        {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const deploymentsData = await deploymentsResponse.json();

      if (deploymentsData.success) {
        const deployments = deploymentsData.result || [];
        console.log(`\n📊 Latest ${deployments.length} Deployment(s):\n`);

        deployments.forEach((deployment, index) => {
          const statusEmoji = {
            'success': '✅',
            'failure': '❌',
            'active': '🔄',
            'canceled': '⚠️',
          }[deployment.latest_stage?.status] || '❓';

          console.log(`  ${index + 1}. ${statusEmoji} ${deployment.latest_stage?.status?.toUpperCase() || 'UNKNOWN'}`);
          console.log(`     🆔 ID: ${deployment.id}`);
          console.log(`     🌿 Branch: ${deployment.deployment_trigger?.metadata?.branch || 'N/A'}`);
          console.log(`     💬 Commit: ${deployment.deployment_trigger?.metadata?.commit_message?.substring(0, 60) || 'N/A'}`);
          console.log(`     🔗 URL: ${deployment.url}`);
          console.log(`     ⏱️  Created: ${new Date(deployment.created_on).toLocaleString()}`);

          if (deployment.latest_stage?.ended_on) {
            const duration = new Date(deployment.latest_stage.ended_on) - new Date(deployment.latest_stage.started_on);
            console.log(`     ⏳ Duration: ${Math.round(duration / 1000)}s`);
          }

          // Show build log if failed
          if (deployment.latest_stage?.status === 'failure') {
            console.log(`     📝 Error: Check build logs at https://dash.cloudflare.com`);
          }

          console.log('');
        });

        // Show production deployment
        const productionDeployment = deployments.find(d => d.environment === 'production');
        if (productionDeployment) {
          console.log(`\n🚀 Production Deployment:`);
          console.log(`   Status: ${productionDeployment.latest_stage?.status?.toUpperCase()}`);
          console.log(`   URL: ${productionDeployment.url}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBuildStatus();
