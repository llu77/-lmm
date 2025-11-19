# ReasoningBank Integration Guide

This guide shows how to integrate ReasoningBank with AgentDB into the LMM financial management system.

## Overview

ReasoningBank provides adaptive learning capabilities that can enhance various aspects of the LMM system:

- Learn from payroll calculation patterns
- Optimize expense categorization
- Improve revenue prediction
- Enhance AI assistant recommendations
- Track successful workflow patterns

## Installation

ReasoningBank is already included in the symbolai-worker package. No additional installation is required.

## Quick Start

### 1. Initialize ReasoningBank

```typescript
import { createAgentDBAdapter } from '@/lib/reasoningbank';

const rb = await createAgentDBAdapter({
  dbPath: '.agentdb/reasoningbank.db',
  enableLearning: true,
  enableReasoning: true,
  cacheSize: 1000,
});
```

### 2. Store a Pattern

```typescript
import { computeEmbedding } from '@/lib/reasoningbank';

const query = "Optimize payroll calculation";
const embedding = await computeEmbedding(query);

await rb.insertPattern({
  id: '',
  type: 'experience',
  domain: 'payroll-optimization',
  pattern_data: JSON.stringify({
    embedding,
    pattern: {
      query,
      approach: 'batch processing with caching',
      outcome: 'success',
      metrics: { time_saved: 0.75 }
    }
  }),
  confidence: 0.95,
  usage_count: 1,
  success_count: 1,
  created_at: Date.now(),
  last_used: Date.now(),
});
```

### 3. Retrieve Similar Patterns

```typescript
const result = await rb.retrieveWithReasoning(embedding, {
  domain: 'payroll-optimization',
  k: 5,
  useMMR: true,
  synthesizeContext: true,
});

console.log('Similar patterns:', result.memories);
console.log('Context:', result.context);
```

## Integration Examples

### Example 1: AI Assistant Enhancement

Enhance the AI assistant with learned patterns:

```typescript
// In symbolai-worker/src/agents/assistant.ts

import { createAgentDBAdapter, computeEmbedding } from '@/lib/reasoningbank';

export async function getAIResponse(query: string): Promise<string> {
  const rb = await createAgentDBAdapter({
    dbPath: '.agentdb/reasoningbank.db',
    enableReasoning: true,
  });

  // Retrieve relevant past experiences
  const embedding = await computeEmbedding(query);
  const result = await rb.retrieveWithReasoning(embedding, {
    k: 5,
    synthesizeContext: true,
  });

  // Use context to enhance response
  const enhancedPrompt = `
    User query: ${query}
    
    Based on past experiences: ${result.context}
    
    Provide a helpful response incorporating these insights.
  `;

  // Generate AI response (implementation depends on AI provider)
  const response = await generateAIResponse(enhancedPrompt);

  await rb.close();
  return response;
}
```

### Example 2: Expense Categorization Learning

Learn from expense categorization patterns:

```typescript
// In symbolai-worker/src/lib/expenses.ts

import { createAgentDBAdapter, computeEmbedding } from '@/lib/reasoningbank';
import type { Trajectory } from '@/lib/reasoningbank';

export async function categorizeExpense(
  description: string,
  amount: number
): Promise<string> {
  const rb = await createAgentDBAdapter({
    dbPath: '.agentdb/reasoningbank.db',
    enableReasoning: true,
  });

  // Retrieve similar past categorizations
  const embedding = await computeEmbedding(description);
  const result = await rb.retrieveWithReasoning(embedding, {
    domain: 'expense-categorization',
    k: 10,
    minConfidence: 0.8,
  });

  // Find most common category in similar expenses
  const categories = result.memories.map(m => {
    const pattern = m.pattern as { category?: string };
    return pattern.category;
  }).filter(Boolean);

  const category = mostCommon(categories) || 'other';

  // Store this categorization for future learning
  await rb.insertPattern({
    id: '',
    type: 'experience',
    domain: 'expense-categorization',
    pattern_data: JSON.stringify({
      embedding,
      pattern: { description, amount, category }
    }),
    confidence: 0.85,
    usage_count: 1,
    success_count: 1,
    created_at: Date.now(),
    last_used: Date.now(),
  });

  await rb.close();
  return category;
}

function mostCommon<T>(arr: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  let max = 0;
  let result: T | undefined;
  for (const [item, count] of counts) {
    if (count > max) {
      max = count;
      result = item;
    }
  }
  return result;
}
```

### Example 3: Payroll Optimization

Track payroll calculation patterns:

```typescript
// In symbolai-worker/src/lib/payroll.ts

import { createAgentDBAdapter, computeEmbedding } from '@/lib/reasoningbank';
import type { Trajectory } from '@/lib/reasoningbank';

export async function calculatePayroll(employeeIds: string[]): Promise<void> {
  const startTime = Date.now();
  
  // Perform payroll calculation
  const results = await performCalculation(employeeIds);
  
  const endTime = Date.now();
  const duration = endTime - startTime;

  // Record trajectory
  const trajectory: Trajectory = {
    task: 'payroll-calculation',
    steps: [
      { action: 'fetch-employee-data', result: `${employeeIds.length} employees` },
      { action: 'calculate-salaries', result: 'completed' },
      { action: 'generate-reports', result: 'completed' }
    ],
    outcome: 'success',
    metrics: {
      duration_ms: duration,
      employee_count: employeeIds.length,
      avg_time_per_employee: duration / employeeIds.length
    }
  };

  // Store in ReasoningBank
  const rb = await createAgentDBAdapter({
    dbPath: '.agentdb/reasoningbank.db',
    enableLearning: true,
  });

  const embedding = await computeEmbedding(JSON.stringify(trajectory));
  await rb.insertPattern({
    id: '',
    type: 'trajectory',
    domain: 'payroll-calculation',
    pattern_data: JSON.stringify({ embedding, pattern: trajectory }),
    confidence: 0.9,
    usage_count: 1,
    success_count: 1,
    created_at: Date.now(),
    last_used: Date.now(),
  });

  await rb.close();
}
```

### Example 4: Revenue Prediction

Use historical patterns for revenue prediction:

```typescript
// In symbolai-worker/src/lib/revenue-prediction.ts

import { createAgentDBAdapter, computeEmbedding } from '@/lib/reasoningbank';

export async function predictRevenue(
  month: number,
  year: number
): Promise<number> {
  const rb = await createAgentDBAdapter({
    dbPath: '.agentdb/reasoningbank.db',
    enableReasoning: true,
  });

  const query = `revenue prediction ${month}/${year}`;
  const embedding = await computeEmbedding(query);

  // Retrieve similar historical patterns
  const result = await rb.retrieveWithReasoning(embedding, {
    domain: 'revenue-prediction',
    k: 12, // Last 12 months
    synthesizeContext: true,
  });

  // Calculate prediction based on historical patterns
  const predictions = result.memories.map(m => {
    const pattern = m.pattern as { revenue?: number };
    return pattern.revenue || 0;
  });

  const avgRevenue = predictions.reduce((sum, val) => sum + val, 0) / predictions.length;

  await rb.close();
  return avgRevenue;
}
```

## CLI Usage

The ReasoningBank CLI provides command-line access to database operations:

```bash
# Initialize database
cd symbolai-worker
npm run reasoningbank -- init

# Insert a pattern
npm run reasoningbank -- insert-pattern payroll "optimize salary calculation"

# Retrieve patterns
npm run reasoningbank -- retrieve "payroll optimization"

# Show statistics
npm run reasoningbank -- stats

# Run examples
npm run reasoningbank -- examples
```

## API Reference

### Core Functions

- `createAgentDBAdapter(config)` - Create adapter instance
- `computeEmbedding(text)` - Compute text embedding
- `insertPattern(pattern)` - Store a pattern
- `retrieveWithReasoning(embedding, options)` - Retrieve patterns

### Legacy Functions

- `retrieveMemories(query, options)` - Legacy retrieval API
- `judgeTrajectory(trajectory, query)` - Judge trajectory success
- `distillMemories(trajectory, verdict, query, options)` - Distill memories

See the [README](./src/lib/reasoningbank/README.md) and [examples](./src/lib/reasoningbank/examples.ts) for more details.

## Performance Considerations

ReasoningBank is designed for high performance:

- **Pattern Search**: 100µs (150x faster than traditional approaches)
- **Memory Retrieval**: <1ms with caching
- **Batch Operations**: 2ms for 100 patterns (500x faster)

For optimal performance:

1. Use caching (`cacheSize: 1000`)
2. Enable MMR for diverse results
3. Set appropriate `k` values (5-20 typically)
4. Use domain filtering to narrow searches
5. Enable memory optimization periodically

## Best Practices

1. **Domain Organization**: Use consistent domain names (e.g., `payroll-calculation`, `expense-categorization`)
2. **Confidence Scores**: Set confidence based on data quality (0.7-0.95)
3. **Pattern Types**: Use appropriate types (`experience`, `trajectory`, `distilled-pattern`)
4. **Memory Management**: Enable `optimizeMemory` periodically to consolidate patterns
5. **Context Synthesis**: Enable for user-facing features to provide explanations

## Troubleshooting

### Low Similarity Scores

If similarity scores are consistently low:

```typescript
const result = await rb.retrieveWithReasoning(embedding, {
  k: 20, // Increase k to get more candidates
  useMMR: true, // Enable diversity
  synthesizeContext: true, // Get better context
});
```

### Memory Growth

If memory grows too large:

```typescript
const result = await rb.retrieveWithReasoning(embedding, {
  optimizeMemory: true, // Consolidate and prune
});

// Or manually:
await rb.optimize();
```

### Performance Issues

For better performance:

1. Use appropriate `cacheSize` (default: 1000)
2. Filter by domain to reduce search space
3. Use batch operations when possible
4. Consider using MinConfidence to filter low-quality patterns

## Next Steps

1. Review the [skill documentation](./.github/skills/reasoningbank-agentdb.md)
2. Explore [examples](./symbolai-worker/src/lib/reasoningbank/examples.ts)
3. Read the [module README](./symbolai-worker/src/lib/reasoningbank/README.md)
4. Integrate into your LMM workflows

## Support

For questions or issues:

1. Check the [ReasoningBank README](./symbolai-worker/src/lib/reasoningbank/README.md)
2. Review the [examples](./symbolai-worker/src/lib/reasoningbank/examples.ts)
3. Consult the [skill documentation](./.github/skills/reasoningbank-agentdb.md)
