/**
 * ReasoningBank - Legacy API Compatibility
 * 
 * Maintains 100% backward compatibility with legacy ReasoningBank APIs
 * while using AgentDB backend for improved performance.
 */

import { createAgentDBAdapter, computeEmbedding } from './adapter';
import type {
  AgentDBAdapter,
  Trajectory,
  Verdict,
  LegacyRetrievalOptions,
  Memory,
  PatternRecord,
} from './types';

// Global adapter instance for legacy API
let globalAdapter: AgentDBAdapter | null = null;

/**
 * Initialize the legacy API with a global adapter
 */
async function ensureAdapter(): Promise<AgentDBAdapter> {
  if (!globalAdapter) {
    globalAdapter = await createAgentDBAdapter({
      dbPath: '.agentdb/reasoningbank.db',
      enableLearning: true,
      enableReasoning: true,
      cacheSize: 1000,
    });
  }
  return globalAdapter;
}

/**
 * Retrieve memories based on a query
 * 
 * Legacy API: retrieveMemories(query, options)
 * 
 * @param query Query string
 * @param options Retrieval options
 * @returns Array of memories
 */
export async function retrieveMemories(
  query: string,
  options: LegacyRetrievalOptions = {}
): Promise<Memory[]> {
  const adapter = await ensureAdapter();
  const embedding = await computeEmbedding(query);
  
  const result = await adapter.retrieveWithReasoning(embedding, {
    domain: options.domain,
    k: options.limit || 10,
    useMMR: true,
  });
  
  return result.memories;
}

/**
 * Judge a trajectory to determine if it was successful
 * 
 * Legacy API: judgeTrajectory(trajectory, query)
 * 
 * @param trajectory Trajectory to judge
 * @param query Original query
 * @returns Verdict on the trajectory
 */
export async function judgeTrajectory(
  trajectory: Trajectory,
  query: string
): Promise<Verdict> {
  const adapter = await ensureAdapter();
  const embedding = await computeEmbedding(JSON.stringify(trajectory));
  
  const result = await adapter.retrieveWithReasoning(embedding, {
    domain: trajectory.task,
    k: 10,
    minConfidence: 0.7,
  });
  
  // Count successful similar trajectories
  const successfulCount = result.memories.filter(m => {
    const pattern = m.pattern as { outcome?: string };
    return pattern.outcome === 'success' && m.similarity > 0.8;
  }).length;
  
  // Make verdict based on similar successful patterns
  if (trajectory.outcome === 'success') {
    return successfulCount >= 5 ? 'success' : 'likely_success';
  } else if (trajectory.outcome === 'failure') {
    return 'failure';
  } else {
    return successfulCount >= 3 ? 'likely_success' : 'needs_review';
  }
}

/**
 * Distill memories from a trajectory
 * 
 * Legacy API: distillMemories(trajectory, verdict, query, options)
 * 
 * @param trajectory Trajectory to distill
 * @param verdict Verdict on the trajectory
 * @param query Original query
 * @param options Additional options
 * @returns Array of new distilled memories
 */
export async function distillMemories(
  trajectory: Trajectory,
  verdict: Verdict,
  query: string,
  options: LegacyRetrievalOptions = {}
): Promise<Memory[]> {
  const adapter = await ensureAdapter();
  
  // Store the trajectory as a pattern
  const embedding = await computeEmbedding(JSON.stringify(trajectory));
  
  const pattern: PatternRecord = {
    id: '',
    type: 'trajectory',
    domain: options.domain || trajectory.task,
    pattern_data: JSON.stringify({
      embedding,
      pattern: trajectory,
    }),
    confidence: verdict === 'success' ? 0.95 : verdict === 'likely_success' ? 0.8 : 0.5,
    usage_count: 1,
    success_count: verdict === 'success' || verdict === 'likely_success' ? 1 : 0,
    created_at: Date.now(),
    last_used: Date.now(),
  };
  
  await adapter.insertPattern(pattern);
  
  // Retrieve similar patterns to create distilled memories
  const result = await adapter.retrieveWithReasoning(embedding, {
    domain: options.domain || trajectory.task,
    k: 100,
    optimizeMemory: true,
    synthesizeContext: true,
  });
  
  // Create a distilled pattern if we have enough data
  if (result.memories.length >= 5) {
    const successRate = result.memories.reduce((sum, m) => 
      sum + (m.success_count / Math.max(m.usage_count, 1)), 0
    ) / result.memories.length;
    
    const distilledPattern: PatternRecord = {
      id: '',
      type: 'distilled-pattern',
      domain: options.domain || trajectory.task,
      pattern_data: JSON.stringify({
        embedding,
        pattern: {
          domain: options.domain || trajectory.task,
          pattern: result.context || 'Pattern distilled from multiple experiences',
          success_rate: successRate,
          sample_size: result.memories.length,
        },
      }),
      confidence: 0.9,
      usage_count: 0,
      success_count: 0,
      created_at: Date.now(),
      last_used: Date.now(),
    };
    
    await adapter.insertPattern(distilledPattern);
  }
  
  return result.memories;
}

/**
 * Close the global adapter (cleanup)
 */
export async function closeAdapter(): Promise<void> {
  if (globalAdapter) {
    await globalAdapter.close();
    globalAdapter = null;
  }
}
