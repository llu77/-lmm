/**
 * ReasoningBank with AgentDB
 * 
 * High-performance adaptive learning system with AgentDB backend.
 * Provides both modern API and legacy compatibility.
 * 
 * @module reasoningbank
 */

// Core functionality
export {
  createAgentDBAdapter,
  computeEmbedding,
} from './adapter';

// Legacy API compatibility
export {
  retrieveMemories,
  judgeTrajectory,
  distillMemories,
  closeAdapter,
} from './legacy';

// Type exports
export type {
  // Core types
  Embedding,
  PatternType,
  PatternRecord,
  PatternData,
  Trajectory,
  Memory,
  
  // Options and configuration
  RetrievalOptions,
  ReasoningResult,
  AgentDBConfig,
  AgentDBAdapter,
  LegacyRetrievalOptions,
  
  // Verdict
  Verdict,
} from './types';
