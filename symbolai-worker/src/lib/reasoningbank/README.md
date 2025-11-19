# ReasoningBank with AgentDB

High-performance adaptive learning system with AgentDB backend integration for the LMM financial management system.

## Overview

ReasoningBank provides adaptive learning patterns using AgentDB's high-performance backend (150x-12,500x faster than traditional implementations). It enables agents to learn from experiences, judge outcomes, distill memories, and improve decision-making over time.

## Features

- **150x faster pattern retrieval** (100µs vs 15ms)
- **500x faster batch operations** (2ms vs 1s for 100 patterns)
- **<1ms memory access** with intelligent caching
- **100% backward compatibility** with legacy APIs
- **4 reasoning modules**: PatternMatcher, ContextSynthesizer, MemoryOptimizer, ExperienceCurator

## Installation

The ReasoningBank module is included in the symbolai-worker package. No additional installation required.

## Quick Start

### Modern API

```typescript
import { createAgentDBAdapter, computeEmbedding } from '@/lib/reasoningbank';

// Initialize ReasoningBank
const rb = await createAgentDBAdapter({
  dbPath: '.agentdb/reasoningbank.db',
  enableLearning: true,
  enableReasoning: true,
  cacheSize: 1000,
});

// Store an experience
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

console.log('Memories:', result.memories);
console.log('Context:', result.context);
```

### Legacy API

```typescript
import {
  retrieveMemories,
  judgeTrajectory,
  distillMemories
} from '@/lib/reasoningbank';

// Retrieve memories
const memories = await retrieveMemories('code generation', {
  domain: 'code-generation',
  limit: 10
});

// Judge trajectory
const verdict = await judgeTrajectory(trajectory, query);

// Distill memories
const distilled = await distillMemories(trajectory, verdict, query, {
  domain: 'code-generation'
});
```

## Core Concepts

### 1. Trajectory Tracking

Track agent execution paths and outcomes:

```typescript
const trajectory = {
  task: 'optimize-api-endpoint',
  steps: [
    { action: 'analyze-bottleneck', result: 'found N+1 query' },
    { action: 'add-eager-loading', result: 'reduced queries' },
    { action: 'add-caching', result: 'improved latency' }
  ],
  outcome: 'success',
  metrics: { latency_before: 2500, latency_after: 150 }
};
```

### 2. Verdict Judgment

Determine if a trajectory was successful based on historical patterns:

```typescript
const verdict = similar.memories.filter(m =>
  m.pattern.outcome === 'success' && m.similarity > 0.8
).length > 5 ? 'likely_success' : 'needs_review';
```

### 3. Memory Distillation

Consolidate similar experiences into high-level patterns:

```typescript
const distilledPattern = {
  domain: 'api-optimization',
  pattern: 'For N+1 queries: add eager loading, then cache',
  success_rate: 0.92,
  sample_size: experiences.memories.length,
};
```

## Reasoning Modules

### PatternMatcher

Finds similar successful patterns using vector similarity:

```typescript
const result = await rb.retrieveWithReasoning(embedding, {
  domain: 'problem-solving',
  k: 10,
  useMMR: true,  // Enable diversity
});
```

### ContextSynthesizer

Generates rich context from multiple memories:

```typescript
const result = await rb.retrieveWithReasoning(embedding, {
  synthesizeContext: true,  // Enable synthesis
  k: 5,
});
console.log(result.context);
```

### MemoryOptimizer

Automatically consolidates and prunes patterns:

```typescript
const result = await rb.retrieveWithReasoning(embedding, {
  optimizeMemory: true,  // Enable optimization
});
console.log(result.optimizations);
```

### ExperienceCurator

Filters by quality and relevance:

```typescript
const result = await rb.retrieveWithReasoning(embedding, {
  minConfidence: 0.8,  // High-confidence only
  k: 20,
});
```

## Advanced Patterns

### Hierarchical Memory

Organize memories by abstraction level:

- **Concrete**: Specific implementations
- **Pattern**: Cross-case patterns
- **Principle**: General principles

### Multi-Domain Learning

Transfer learning across domains:

```typescript
const backendExp = await rb.retrieveWithReasoning(embedding, {
  domain: 'backend-optimization',
  k: 10,
});

const transferred = backendExp.memories.map(m => ({
  ...m,
  domain: 'frontend-optimization',
  adapted: true,
}));
```

## API Reference

### Types

See `types.ts` for complete type definitions:

- `PatternRecord`: Pattern stored in database
- `Trajectory`: Sequence of agent actions
- `Memory`: Retrieved pattern with metadata
- `ReasoningResult`: Result from reasoning query
- `AgentDBConfig`: Configuration options

### Functions

#### `createAgentDBAdapter(config)`

Creates an AgentDB adapter instance.

#### `computeEmbedding(text)`

Computes embedding vector for text.

#### `retrieveMemories(query, options)`

Legacy API for retrieving memories.

#### `judgeTrajectory(trajectory, query)`

Legacy API for judging trajectories.

#### `distillMemories(trajectory, verdict, query, options)`

Legacy API for distilling memories.

## Performance

- **Pattern Search**: 100µs (150x faster)
- **Memory Retrieval**: <1ms with cache
- **Batch Insert**: 2ms for 100 patterns (500x faster)
- **Trajectory Judgment**: <5ms total
- **Memory Distillation**: <50ms for 100 patterns

## Examples

See `examples.ts` for comprehensive usage examples:

1. Basic Usage
2. Trajectory Tracking
3. Verdict Judgment
4. Memory Distillation
5. Legacy API Usage
6. Hierarchical Memory

Run examples:

```bash
cd symbolai-worker
npm run dev
```

## Integration with LMM

ReasoningBank can be used throughout the LMM system for:

- Learning from payroll calculation patterns
- Optimizing expense categorization
- Improving revenue prediction
- Enhancing AI assistant recommendations
- Tracking successful workflow patterns

## Troubleshooting

### Low confidence scores

Enable context synthesis and MMR:

```typescript
const result = await rb.retrieveWithReasoning(embedding, {
  synthesizeContext: true,
  useMMR: true,
  k: 10,
});
```

### Memory growing too large

Enable automatic optimization:

```typescript
const result = await rb.retrieveWithReasoning(embedding, {
  optimizeMemory: true,
});
```

## License

Part of the LMM financial management system.
