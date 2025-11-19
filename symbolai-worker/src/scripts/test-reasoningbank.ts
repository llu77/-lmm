/**
 * ReasoningBank Tests
 * 
 * Basic tests to verify ReasoningBank functionality
 */

import { createAgentDBAdapter, computeEmbedding } from '../lib/reasoningbank/index';
import type { PatternRecord } from '../lib/reasoningbank/types';

async function testBasicFunctionality() {
  console.log('Testing basic ReasoningBank functionality...\n');

  // Test 1: Create adapter
  console.log('Test 1: Creating adapter...');
  const adapter = await createAgentDBAdapter({
    dbPath: '.agentdb/test-reasoningbank.db',
    enableLearning: true,
    enableReasoning: true,
  });
  console.log('✓ Adapter created\n');

  // Test 2: Compute embedding
  console.log('Test 2: Computing embedding...');
  const embedding = await computeEmbedding('test query');
  console.log(`✓ Embedding computed (length: ${embedding.length})\n`);

  // Test 3: Insert pattern
  console.log('Test 3: Inserting pattern...');
  const pattern: PatternRecord = {
    id: '',
    type: 'experience',
    domain: 'test',
    pattern_data: JSON.stringify({
      embedding,
      pattern: { query: 'test', outcome: 'success' }
    }),
    confidence: 0.9,
    usage_count: 1,
    success_count: 1,
    created_at: Date.now(),
    last_used: Date.now(),
  };
  await adapter.insertPattern(pattern);
  console.log('✓ Pattern inserted\n');

  // Test 4: Retrieve with reasoning
  console.log('Test 4: Retrieving with reasoning...');
  const result = await adapter.retrieveWithReasoning(embedding, {
    domain: 'test',
    k: 5,
    useMMR: true,
    synthesizeContext: true,
  });
  console.log(`✓ Retrieved ${result.memories.length} memories`);
  console.log(`  Context: ${result.context}\n`);

  // Test 5: Close adapter
  console.log('Test 5: Closing adapter...');
  await adapter.close();
  console.log('✓ Adapter closed\n');

  console.log('All tests passed! ✓\n');
}

async function testLegacyAPI() {
  console.log('Testing legacy API compatibility...\n');

  const { retrieveMemories, judgeTrajectory, distillMemories } = await import('../lib/reasoningbank/legacy');
  const { Trajectory } = await import('../lib/reasoningbank/types');

  // Test legacy retrieveMemories
  console.log('Test 1: Legacy retrieveMemories...');
  const memories = await retrieveMemories('test query', {
    domain: 'test',
    limit: 5,
  });
  console.log(`✓ Retrieved ${memories.length} memories\n`);

  // Test legacy judgeTrajectory
  console.log('Test 2: Legacy judgeTrajectory...');
  const trajectory = {
    task: 'test-task',
    steps: [
      { action: 'step1', result: 'ok' },
      { action: 'step2', result: 'ok' }
    ],
    outcome: 'success' as const,
  };
  const verdict = await judgeTrajectory(trajectory, 'test');
  console.log(`✓ Verdict: ${verdict}\n`);

  // Test legacy distillMemories
  console.log('Test 3: Legacy distillMemories...');
  const distilled = await distillMemories(
    trajectory,
    verdict,
    'test',
    { domain: 'test' }
  );
  console.log(`✓ Distilled ${distilled.length} memories\n`);

  console.log('All legacy API tests passed! ✓\n');
}

async function testPerformance() {
  console.log('Testing performance...\n');

  const adapter = await createAgentDBAdapter({
    dbPath: '.agentdb/perf-test.db',
    enableLearning: true,
    cacheSize: 1000,
  });

  // Benchmark embedding computation
  console.log('Benchmark 1: Embedding computation...');
  const start1 = Date.now();
  for (let i = 0; i < 100; i++) {
    await computeEmbedding(`test query ${i}`);
  }
  const time1 = Date.now() - start1;
  console.log(`✓ 100 embeddings: ${time1}ms (${(time1 / 100).toFixed(2)}ms avg)\n`);

  // Benchmark pattern insertion
  console.log('Benchmark 2: Pattern insertion...');
  const start2 = Date.now();
  for (let i = 0; i < 100; i++) {
    const embedding = await computeEmbedding(`pattern ${i}`);
    await adapter.insertPattern({
      id: '',
      type: 'experience',
      domain: 'perf-test',
      pattern_data: JSON.stringify({
        embedding,
        pattern: { index: i }
      }),
      confidence: 0.9,
      usage_count: 1,
      success_count: 1,
      created_at: Date.now(),
      last_used: Date.now(),
    });
  }
  const time2 = Date.now() - start2;
  console.log(`✓ 100 insertions: ${time2}ms (${(time2 / 100).toFixed(2)}ms avg)\n`);

  // Benchmark retrieval
  console.log('Benchmark 3: Pattern retrieval...');
  const queryEmbedding = await computeEmbedding('test query');
  const start3 = Date.now();
  for (let i = 0; i < 100; i++) {
    await adapter.retrieveWithReasoning(queryEmbedding, {
      domain: 'perf-test',
      k: 10,
    });
  }
  const time3 = Date.now() - start3;
  console.log(`✓ 100 retrievals: ${time3}ms (${(time3 / 100).toFixed(2)}ms avg)\n`);

  await adapter.close();
  console.log('Performance tests completed! ✓\n');
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('ReasoningBank Test Suite');
  console.log('='.repeat(60));
  console.log('\n');

  try {
    await testBasicFunctionality();
    await testLegacyAPI();
    await testPerformance();

    console.log('='.repeat(60));
    console.log('All tests passed successfully! ✓');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    process.exit(1);
  }
}

runAllTests();
