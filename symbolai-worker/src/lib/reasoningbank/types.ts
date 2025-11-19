/**
 * ReasoningBank with AgentDB - Type Definitions
 * 
 * TypeScript types and interfaces for the ReasoningBank adaptive learning system
 * with AgentDB high-performance backend integration.
 */

/**
 * Embedding vector type (1536 dimensions for OpenAI embeddings)
 */
export type Embedding = number[];

/**
 * Pattern types supported by ReasoningBank
 */
export type PatternType = 
  | 'experience'
  | 'trajectory'
  | 'distilled-pattern'
  | 'concrete'
  | 'pattern'
  | 'principle';

/**
 * Pattern record stored in AgentDB
 */
export interface PatternRecord {
  /** Unique identifier (auto-generated if empty string) */
  id: string;
  
  /** Type of pattern */
  type: PatternType;
  
  /** Domain/category for organization */
  domain: string;
  
  /** JSON-encoded pattern data including embedding */
  pattern_data: string;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Number of times this pattern has been used */
  usage_count: number;
  
  /** Number of successful outcomes */
  success_count: number;
  
  /** Timestamp when created */
  created_at: number;
  
  /** Timestamp when last used */
  last_used: number;
}

/**
 * Pattern data structure
 */
export interface PatternData {
  /** Embedding vector */
  embedding: Embedding;
  
  /** Pattern content */
  pattern: unknown;
}

/**
 * Trajectory for tracking agent execution paths
 */
export interface Trajectory {
  /** Task identifier */
  task: string;
  
  /** Sequence of steps taken */
  steps: Array<{
    action: string;
    result: string;
  }>;
  
  /** Final outcome */
  outcome: 'success' | 'failure' | 'partial';
  
  /** Performance metrics */
  metrics?: Record<string, number>;
}

/**
 * Memory retrieved from ReasoningBank
 */
export interface Memory {
  /** Pattern record */
  pattern: unknown;
  
  /** Similarity score to query */
  similarity: number;
  
  /** Confidence in this memory */
  confidence: number;
  
  /** Usage statistics */
  usage_count: number;
  success_count: number;
}

/**
 * Retrieval options for querying ReasoningBank
 */
export interface RetrievalOptions {
  /** Domain to filter by */
  domain?: string;
  
  /** Number of results to return */
  k?: number;
  
  /** Use Maximal Marginal Relevance for diversity */
  useMMR?: boolean;
  
  /** Synthesize context from memories */
  synthesizeContext?: boolean;
  
  /** Optimize memory during retrieval */
  optimizeMemory?: boolean;
  
  /** Minimum confidence threshold */
  minConfidence?: number;
}

/**
 * Result from retrieveWithReasoning
 */
export interface ReasoningResult {
  /** Retrieved memories */
  memories: Memory[];
  
  /** Synthesized context (if enabled) */
  context?: string;
  
  /** Extracted patterns */
  patterns?: unknown[];
  
  /** Memory optimizations performed */
  optimizations?: {
    consolidated: number;
    pruned: number;
    improved_quality: number;
  };
}

/**
 * Configuration for AgentDB adapter
 */
export interface AgentDBConfig {
  /** Path to database file */
  dbPath: string;
  
  /** Enable learning plugins */
  enableLearning?: boolean;
  
  /** Enable reasoning agents */
  enableReasoning?: boolean;
  
  /** Pattern cache size */
  cacheSize?: number;
  
  /** Embedding dimension */
  dimension?: number;
}

/**
 * AgentDB adapter interface
 */
export interface AgentDBAdapter {
  /** Insert a new pattern */
  insertPattern(pattern: PatternRecord): Promise<void>;
  
  /** Retrieve patterns with reasoning */
  retrieveWithReasoning(
    embedding: Embedding,
    options: RetrievalOptions
  ): Promise<ReasoningResult>;
  
  /** Optimize memory (consolidate and prune) */
  optimize(): Promise<void>;
  
  /** Close the database connection */
  close(): Promise<void>;
}

/**
 * Legacy API options
 */
export interface LegacyRetrievalOptions {
  domain?: string;
  agent?: string;
  limit?: number;
}

/**
 * Verdict for trajectory judgment
 */
export type Verdict = 'success' | 'failure' | 'likely_success' | 'needs_review';
