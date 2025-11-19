/**
 * ReasoningBank with AgentDB - Usage Examples
 * 
 * Comprehensive examples showing how to use ReasoningBank
 * in various scenarios.
 */

import {
  createAgentDBAdapter,
  computeEmbedding,
  retrieveMemories,
  judgeTrajectory,
  distillMemories,
} from './index';

import type { Trajectory, PatternRecord } from './types';

/**
 * Example 1: Basic Pattern Storage and Retrieval
 */
export async function example1_BasicUsage() {
  console.log('=== Example 1: Basic Usage ===\n');
  
  // Initialize ReasoningBank
  const rb = await createAgentDBAdapter({
    dbPath: '.agentdb/reasoningbank.db',
    enableLearning: true,
    enableReasoning: true,
    cacheSize: 1000,
  });

  // Store a successful experience
  const query = "How to optimize database queries?";
  const embedding = await computeEmbedding(query);

  await rb.insertPattern({
    id: '',
    type: 'experience',
    domain: 'database-optimization',
    pattern_data: JSON.stringify({
      embedding,
      pattern: {
        query,
        approach: 'indexing + query optimization',
        outcome: 'success',
        metrics: { latency_reduction: 0.85 }
      }
    }),
    confidence: 0.95,
    usage_count: 1,
    success_count: 1,
    created_at: Date.now(),
    last_used: Date.now(),
  });

  // Retrieve similar experiences
  const result = await rb.retrieveWithReasoning(embedding, {
    domain: 'database-optimization',
    k: 5,
    useMMR: true,
    synthesizeContext: true,
  });

  console.log('Memories found:', result.memories.length);
  console.log('Context:', result.context);
  
  await rb.close();
}

/**
 * Example 2: Trajectory Tracking
 */
export async function example2_TrajectoryTracking() {
  console.log('\n=== Example 2: Trajectory Tracking ===\n');
  
  const rb = await createAgentDBAdapter({
    dbPath: '.agentdb/reasoningbank.db',
    enableLearning: true,
    enableReasoning: true,
  });

  // Record a trajectory
  const trajectory: Trajectory = {
    task: 'optimize-api-endpoint',
    steps: [
      { action: 'analyze-bottleneck', result: 'found N+1 query' },
      { action: 'add-eager-loading', result: 'reduced queries' },
      { action: 'add-caching', result: 'improved latency' }
    ],
    outcome: 'success',
    metrics: { latency_before: 2500, latency_after: 150 }
  };

  const embedding = await computeEmbedding(JSON.stringify(trajectory));

  await rb.insertPattern({
    id: '',
    type: 'trajectory',
    domain: 'api-optimization',
    pattern_data: JSON.stringify({ embedding, pattern: trajectory }),
    confidence: 0.9,
    usage_count: 1,
    success_count: 1,
    created_at: Date.now(),
    last_used: Date.now(),
  });

  console.log('Trajectory stored successfully');
  
  await rb.close();
}

/**
 * Example 3: Verdict Judgment
 */
export async function example3_VerdictJudgment() {
  console.log('\n=== Example 3: Verdict Judgment ===\n');
  
  const rb = await createAgentDBAdapter({
    dbPath: '.agentdb/reasoningbank.db',
    enableLearning: true,
    enableReasoning: true,
  });

  // Create sample trajectory
  const trajectory: Trajectory = {
    task: 'api-optimization',
    steps: [
      { action: 'profile-code', result: 'identified bottleneck' },
      { action: 'optimize-query', result: 'improved performance' }
    ],
    outcome: 'success',
    metrics: { improvement: 0.75 }
  };

  const queryEmbedding = await computeEmbedding(JSON.stringify(trajectory));

  // Retrieve similar past trajectories
  const similar = await rb.retrieveWithReasoning(queryEmbedding, {
    domain: 'api-optimization',
    k: 10,
  });

  // Judge based on similarity to successful patterns
  const verdict = similar.memories.filter(m => {
    const pattern = m.pattern as { outcome?: string };
    return pattern.outcome === 'success' && m.similarity > 0.8;
  }).length > 5 ? 'likely_success' : 'needs_review';

  console.log('Verdict:', verdict);
  console.log('Confidence:', similar.memories[0]?.similarity || 0);
  
  await rb.close();
}

/**
 * Example 4: Memory Distillation
 */
export async function example4_MemoryDistillation() {
  console.log('\n=== Example 4: Memory Distillation ===\n');
  
  const rb = await createAgentDBAdapter({
    dbPath: '.agentdb/reasoningbank.db',
    enableLearning: true,
    enableReasoning: true,
  });

  const query = "api optimization patterns";
  const embedding = await computeEmbedding(query);

  // Get all experiences in domain
  const experiences = await rb.retrieveWithReasoning(embedding, {
    domain: 'api-optimization',
    k: 100,
    optimizeMemory: true,
  });

  // Distill into high-level pattern
  const distilledPattern = {
    domain: 'api-optimization',
    pattern: 'For N+1 queries: add eager loading, then cache',
    success_rate: 0.92,
    sample_size: experiences.memories.length,
    confidence: 0.95
  };

  await rb.insertPattern({
    id: '',
    type: 'distilled-pattern',
    domain: 'api-optimization',
    pattern_data: JSON.stringify({
      embedding: await computeEmbedding(JSON.stringify(distilledPattern)),
      pattern: distilledPattern
    }),
    confidence: 0.95,
    usage_count: 0,
    success_count: 0,
    created_at: Date.now(),
    last_used: Date.now(),
  });

  console.log('Distilled pattern created from', experiences.memories.length, 'experiences');
  console.log('Optimizations:', experiences.optimizations);
  
  await rb.close();
}

/**
 * Example 5: Legacy API Usage
 */
export async function example5_LegacyAPI() {
  console.log('\n=== Example 5: Legacy API ===\n');

  // Use legacy API (automatically uses AgentDB backend)
  const memories = await retrieveMemories('code generation best practices', {
    domain: 'code-generation',
    limit: 5,
  });

  console.log('Retrieved', memories.length, 'memories using legacy API');

  // Judge a trajectory
  const trajectory: Trajectory = {
    task: 'generate-component',
    steps: [
      { action: 'analyze-requirements', result: 'understood specs' },
      { action: 'generate-code', result: 'created component' },
      { action: 'test', result: 'all tests pass' }
    ],
    outcome: 'success',
  };

  const verdict = await judgeTrajectory(trajectory, 'generate component');
  console.log('Trajectory verdict:', verdict);

  // Distill memories
  const distilled = await distillMemories(
    trajectory,
    verdict,
    'generate component',
    { domain: 'code-generation' }
  );

  console.log('Distilled', distilled.length, 'memories');
}

/**
 * Example 6: Hierarchical Memory
 */
export async function example6_HierarchicalMemory() {
  console.log('\n=== Example 6: Hierarchical Memory ===\n');
  
  const rb = await createAgentDBAdapter({
    dbPath: '.agentdb/reasoningbank.db',
    enableLearning: true,
    enableReasoning: true,
  });

  // Low-level: Specific implementation
  const concreteEmbedding = await computeEmbedding('null pointer exception fix');
  await rb.insertPattern({
    id: '',
    type: 'concrete',
    domain: 'debugging/null-pointer',
    pattern_data: JSON.stringify({
      embedding: concreteEmbedding,
      pattern: { bug: 'NPE in UserService.getUser()', fix: 'Add null check' }
    }),
    confidence: 0.9,
    usage_count: 1,
    success_count: 1,
    created_at: Date.now(),
    last_used: Date.now(),
  });

  // Mid-level: Pattern across similar cases
  const patternEmbedding = await computeEmbedding('null pointer handling pattern');
  await rb.insertPattern({
    id: '',
    type: 'pattern',
    domain: 'debugging',
    pattern_data: JSON.stringify({
      embedding: patternEmbedding,
      pattern: { category: 'null-pointer', approach: 'defensive-checks' }
    }),
    confidence: 0.85,
    usage_count: 5,
    success_count: 4,
    created_at: Date.now(),
    last_used: Date.now(),
  });

  // High-level: General principle
  const principleEmbedding = await computeEmbedding('error handling principle');
  await rb.insertPattern({
    id: '',
    type: 'principle',
    domain: 'software-engineering',
    pattern_data: JSON.stringify({
      embedding: principleEmbedding,
      pattern: { principle: 'fail-fast with clear errors' }
    }),
    confidence: 0.95,
    usage_count: 20,
    success_count: 18,
    created_at: Date.now(),
    last_used: Date.now(),
  });

  console.log('Created hierarchical memory structure');
  
  await rb.close();
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  await example1_BasicUsage();
  await example2_TrajectoryTracking();
  await example3_VerdictJudgment();
  await example4_MemoryDistillation();
  await example5_LegacyAPI();
  await example6_HierarchicalMemory();
  
  console.log('\n=== All examples completed ===\n');
}
