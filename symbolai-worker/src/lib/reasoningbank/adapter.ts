/**
 * ReasoningBank with AgentDB - Core Implementation
 * 
 * High-performance adaptive learning system with AgentDB backend.
 * Provides pattern storage, retrieval, and reasoning capabilities.
 */

import type {
  AgentDBAdapter,
  AgentDBConfig,
  Embedding,
  PatternRecord,
  ReasoningResult,
  RetrievalOptions,
  Memory,
} from './types';

/**
 * Compute embedding for text using a simple hash-based approach
 * In production, this would use OpenAI's embedding API
 * 
 * @param text Text to embed
 * @returns Embedding vector
 */
export async function computeEmbedding(text: string): Promise<Embedding> {
  // Simple deterministic embedding based on text hash
  // In production, use: await openai.embeddings.create({ model: 'text-embedding-ada-002', input: text })
  const embedding: number[] = new Array(1536).fill(0);
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    embedding[i % 1536] += charCode / 1000;
  }
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * In-memory AgentDB adapter implementation
 * 
 * This is a simplified in-memory implementation for demonstration.
 * In production, this would connect to an actual AgentDB instance.
 */
class InMemoryAgentDBAdapter implements AgentDBAdapter {
  private patterns: Map<string, PatternRecord> = new Map();
  private config: AgentDBConfig;
  private cache: Map<string, ReasoningResult> = new Map();

  constructor(config: AgentDBConfig) {
    this.config = config;
  }

  async insertPattern(pattern: PatternRecord): Promise<void> {
    const id = pattern.id || `pattern_${Date.now()}_${Math.random()}`;
    this.patterns.set(id, { ...pattern, id });
    
    // Clear cache on insert
    this.cache.clear();
  }

  async retrieveWithReasoning(
    embedding: Embedding,
    options: RetrievalOptions = {}
  ): Promise<ReasoningResult> {
    const {
      domain,
      k = 10,
      useMMR = false,
      synthesizeContext = false,
      optimizeMemory = false,
      minConfidence = 0,
    } = options;

    // Filter by domain if specified
    let candidates = Array.from(this.patterns.values());
    if (domain) {
      candidates = candidates.filter(p => p.domain === domain);
    }

    // Filter by confidence
    candidates = candidates.filter(p => p.confidence >= minConfidence);

    // Calculate similarities
    const scoredMemories = candidates.map(pattern => {
      const patternData = JSON.parse(pattern.pattern_data);
      const similarity = cosineSimilarity(embedding, patternData.embedding);
      
      return {
        pattern: patternData.pattern,
        similarity,
        confidence: pattern.confidence,
        usage_count: pattern.usage_count,
        success_count: pattern.success_count,
      };
    });

    // Sort by similarity
    scoredMemories.sort((a, b) => b.similarity - a.similarity);

    // Apply MMR if requested (diversify results)
    let memories: Memory[];
    if (useMMR) {
      memories = this.applyMMR(scoredMemories, k);
    } else {
      memories = scoredMemories.slice(0, k);
    }

    // Build result
    const result: ReasoningResult = { memories };

    // Synthesize context if requested
    if (synthesizeContext && memories.length > 0) {
      result.context = this.synthesizeContext(memories, domain);
    }

    // Extract patterns
    result.patterns = memories.map(m => m.pattern);

    // Optimize memory if requested
    if (optimizeMemory) {
      result.optimizations = await this.performOptimizations(domain);
    }

    return result;
  }

  private applyMMR(memories: Memory[], k: number): Memory[] {
    if (memories.length <= k) return memories;
    
    const selected: Memory[] = [memories[0]];
    const remaining = memories.slice(1);
    
    while (selected.length < k && remaining.length > 0) {
      let maxScore = -Infinity;
      let maxIndex = 0;
      
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        
        // Calculate minimum similarity to already selected items
        const minSimToSelected = Math.min(
          ...selected.map(s => 
            this.calculatePatternSimilarity(candidate.pattern, s.pattern)
          )
        );
        
        // MMR score balances relevance and diversity
        const mmrScore = 0.7 * candidate.similarity + 0.3 * (1 - minSimToSelected);
        
        if (mmrScore > maxScore) {
          maxScore = mmrScore;
          maxIndex = i;
        }
      }
      
      selected.push(remaining[maxIndex]);
      remaining.splice(maxIndex, 1);
    }
    
    return selected;
  }

  private calculatePatternSimilarity(p1: unknown, p2: unknown): number {
    // Simple similarity based on JSON string comparison
    const s1 = JSON.stringify(p1);
    const s2 = JSON.stringify(p2);
    
    if (s1 === s2) return 1;
    
    // Jaccard similarity on words
    const words1 = new Set(s1.toLowerCase().match(/\w+/g) || []);
    const words2 = new Set(s2.toLowerCase().match(/\w+/g) || []);
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private synthesizeContext(memories: Memory[], domain?: string): string {
    const successRate = memories.reduce((sum, m) => 
      sum + (m.success_count / Math.max(m.usage_count, 1)), 0
    ) / memories.length;
    
    const avgConfidence = memories.reduce((sum, m) => sum + m.confidence, 0) / memories.length;
    
    return `Based on ${memories.length} similar ${domain ? domain : 'experiences'}, ` +
           `the patterns show an ${(successRate * 100).toFixed(0)}% success rate ` +
           `with ${(avgConfidence * 100).toFixed(0)}% average confidence. ` +
           `Most effective approaches involve consistent methodology and iterative refinement.`;
  }

  private async performOptimizations(domain?: string): Promise<{
    consolidated: number;
    pruned: number;
    improved_quality: number;
  }> {
    let consolidated = 0;
    let pruned = 0;
    
    // Find similar patterns to consolidate
    const patterns = Array.from(this.patterns.values());
    const toRemove: string[] = [];
    
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        if (domain && patterns[i].domain !== domain) continue;
        
        const data1 = JSON.parse(patterns[i].pattern_data);
        const data2 = JSON.parse(patterns[j].pattern_data);
        
        const similarity = cosineSimilarity(data1.embedding, data2.embedding);
        
        // If very similar, consolidate
        if (similarity > 0.95) {
          consolidated++;
          toRemove.push(patterns[j].id);
        }
      }
    }
    
    // Remove low-quality patterns
    for (const pattern of patterns) {
      if (pattern.confidence < 0.3 && pattern.usage_count > 10) {
        pruned++;
        toRemove.push(pattern.id);
      }
    }
    
    // Delete marked patterns
    for (const id of toRemove) {
      this.patterns.delete(id);
    }
    
    return {
      consolidated,
      pruned,
      improved_quality: (consolidated + pruned) / patterns.length,
    };
  }

  async optimize(): Promise<void> {
    await this.performOptimizations();
  }

  async close(): Promise<void> {
    this.patterns.clear();
    this.cache.clear();
  }
}

/**
 * Create an AgentDB adapter for ReasoningBank
 * 
 * @param config Configuration options
 * @returns AgentDB adapter instance
 */
export async function createAgentDBAdapter(
  config: AgentDBConfig
): Promise<AgentDBAdapter> {
  // In production, this would connect to actual AgentDB
  // For now, return in-memory implementation
  return new InMemoryAgentDBAdapter(config);
}

/**
 * Export types for external use
 */
export type { AgentDBAdapter, AgentDBConfig };
