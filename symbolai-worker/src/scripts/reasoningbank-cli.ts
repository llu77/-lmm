#!/usr/bin/env node

/**
 * ReasoningBank CLI - Command-line interface for ReasoningBank operations
 * 
 * Usage:
 *   npm run reasoningbank -- init
 *   npm run reasoningbank -- insert-pattern <domain> <query>
 *   npm run reasoningbank -- retrieve <query>
 *   npm run reasoningbank -- stats
 *   npm run reasoningbank -- examples
 */

import { createAgentDBAdapter, computeEmbedding } from '../lib/reasoningbank/index';
import { runAllExamples } from '../lib/reasoningbank/examples';
import type { PatternRecord } from '../lib/reasoningbank/types';

const DB_PATH = '.agentdb/reasoningbank.db';

async function init() {
  console.log('Initializing ReasoningBank database...');
  const adapter = await createAgentDBAdapter({
    dbPath: DB_PATH,
    enableLearning: true,
    enableReasoning: true,
    cacheSize: 1000,
  });
  console.log('✓ ReasoningBank initialized at', DB_PATH);
  await adapter.close();
}

async function insertPattern(domain: string, query: string) {
  console.log(`Inserting pattern for domain: ${domain}`);
  const adapter = await createAgentDBAdapter({
    dbPath: DB_PATH,
    enableLearning: true,
    enableReasoning: true,
  });

  const embedding = await computeEmbedding(query);
  const pattern: PatternRecord = {
    id: '',
    type: 'experience',
    domain,
    pattern_data: JSON.stringify({
      embedding,
      pattern: {
        query,
        outcome: 'success',
        timestamp: Date.now(),
      },
    }),
    confidence: 0.9,
    usage_count: 1,
    success_count: 1,
    created_at: Date.now(),
    last_used: Date.now(),
  };

  await adapter.insertPattern(pattern);
  console.log('✓ Pattern inserted successfully');
  await adapter.close();
}

async function retrieve(query: string) {
  console.log(`Retrieving patterns for query: ${query}`);
  const adapter = await createAgentDBAdapter({
    dbPath: DB_PATH,
    enableLearning: true,
    enableReasoning: true,
  });

  const embedding = await computeEmbedding(query);
  const result = await adapter.retrieveWithReasoning(embedding, {
    k: 5,
    useMMR: true,
    synthesizeContext: true,
  });

  console.log(`\n✓ Found ${result.memories.length} memories`);
  console.log('\nContext:', result.context);
  
  console.log('\nTop memories:');
  result.memories.forEach((mem, i) => {
    console.log(`  ${i + 1}. Similarity: ${mem.similarity.toFixed(3)}, Confidence: ${mem.confidence.toFixed(3)}`);
  });

  await adapter.close();
}

async function stats() {
  console.log('ReasoningBank Statistics');
  console.log('========================');
  console.log('Database path:', DB_PATH);
  console.log('Status: Active');
  console.log('\nNote: Using in-memory implementation');
  console.log('For production, connect to actual AgentDB instance');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'init':
        await init();
        break;
      
      case 'insert-pattern':
        if (args.length < 3) {
          console.error('Usage: reasoningbank insert-pattern <domain> <query>');
          process.exit(1);
        }
        await insertPattern(args[1], args.slice(2).join(' '));
        break;
      
      case 'retrieve':
        if (args.length < 2) {
          console.error('Usage: reasoningbank retrieve <query>');
          process.exit(1);
        }
        await retrieve(args.slice(1).join(' '));
        break;
      
      case 'stats':
        await stats();
        break;
      
      case 'examples':
        await runAllExamples();
        break;
      
      default:
        console.log('ReasoningBank CLI');
        console.log('================\n');
        console.log('Commands:');
        console.log('  init                           Initialize database');
        console.log('  insert-pattern <domain> <query> Insert a pattern');
        console.log('  retrieve <query>               Retrieve patterns');
        console.log('  stats                          Show statistics');
        console.log('  examples                       Run examples');
        console.log('\nExample:');
        console.log('  npm run reasoningbank -- insert-pattern optimization "How to optimize queries"');
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
