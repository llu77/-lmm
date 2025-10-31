# Configuration Files

This directory contains configuration files for various system optimizations and settings.

## Performance Configuration

**File:** `performance.json`

This configuration file controls performance optimization settings for AI/ML inference and processing.

### Settings

#### Prediction Cache
```json
{
  "predictionCache": {
    "enabled": true,
    "maxEntries": 10000,
    "ttl": 300000
  }
}
```

- **enabled**: Enable/disable prediction result caching
- **maxEntries**: Maximum number of cached predictions (default: 10,000)
- **ttl**: Time-to-live in milliseconds (default: 300,000ms = 5 minutes)

**Use case:** Cache frequently requested predictions to reduce API calls and improve latency.

#### Model Preloading
```json
{
  "preload": {
    "models": [
      "task_predictor",
      "error_preventer",
      "performance_optimizer"
    ],
    "warmup": true
  }
}
```

- **models**: List of models to preload at startup
- **warmup**: Run warmup inference to prepare models

**Use case:** Reduce cold start latency by preloading critical models.

#### Batching
```json
{
  "batching": {
    "enabled": true,
    "maxBatchSize": 100,
    "maxWaitTime": 50
  }
}
```

- **enabled**: Enable/disable request batching
- **maxBatchSize**: Maximum requests per batch (default: 100)
- **maxWaitTime**: Maximum wait time in milliseconds before processing batch (default: 50ms)

**Use case:** Batch multiple requests together to improve throughput and reduce costs.

#### WebAssembly Optimization
```json
{
  "wasm": {
    "simd": true,
    "threads": 4,
    "memoryPages": 256
  }
}
```

- **simd**: Enable SIMD (Single Instruction, Multiple Data) operations
- **threads**: Number of worker threads for parallel processing
- **memoryPages**: WebAssembly memory allocation in pages (1 page = 64KB)

**Use case:** Optimize edge computing and browser-based inference performance.

## Usage

### Python
```python
import json
from pathlib import Path

# Load configuration
config_path = Path(__file__).parent / "config" / "performance.json"
with open(config_path) as f:
    config = json.load(f)

# Use settings
cache_enabled = config["predictionCache"]["enabled"]
batch_size = config["batching"]["maxBatchSize"]
```

### JavaScript/TypeScript
```javascript
import config from './config/performance.json';

// Use settings
const cacheEnabled = config.predictionCache.enabled;
const batchSize = config.batching.maxBatchSize;
```

## Environment-Specific Configurations

You can create environment-specific configs:
- `performance.dev.json` - Development settings
- `performance.prod.json` - Production settings
- `performance.test.json` - Testing settings

## Quality Gate Configuration

**File:** `quality-gate.json`

This configuration file controls quality assurance and CI/CD enforcement settings.

### Settings

#### Mode and Thresholds
```json
{
  "enabled": false,
  "mode": "passive",
  "truth_threshold": 0.80,
  "rollback_enabled": false
}
```

- **enabled**: Enable/disable quality gate checks
- **mode**: Enforcement mode (`passive`, `active`, `strict`)
- **truth_threshold**: Minimum confidence threshold for validation (0.0-1.0)
- **rollback_enabled**: Auto-rollback on quality gate failure

#### Quality Weights
```json
{
  "weights": {
    "tests": 0.40,
    "lint": 0.20,
    "types": 0.20,
    "build": 0.20
  }
}
```

Relative importance of different quality checks (must sum to 1.0):
- **tests**: Unit/integration test results
- **lint**: Code style and linting
- **types**: Type checking
- **build**: Build success

#### Enforcement Modes

**Passive Mode** (default):
- Log results only
- No warnings or failures
- Good for monitoring

**Active Mode**:
- Log results
- Warn on failures
- Don't block execution

**Strict Mode**:
- Log results
- Warn on failures
- Block on failures (fail CI/CD)

#### Integrations
```json
{
  "integrations": {
    "github_actions": true,
    "mcp_tools": true,
    "npx_commands": true,
    "memory_persistence": true
  }
}
```

- **github_actions**: GitHub Actions integration
- **mcp_tools**: Model Context Protocol tools
- **npx_commands**: NPX command execution
- **memory_persistence**: Persist results across runs

#### Reporting
```json
{
  "reporting": {
    "auto_generate": true,
    "frequency": "on_completion",
    "format": "markdown",
    "include_evidence": true
  }
}
```

- **auto_generate**: Automatically generate reports
- **frequency**: When to generate (`on_completion`, `always`, `on_failure`)
- **format**: Report format (`markdown`, `json`, `html`)
- **include_evidence**: Include detailed evidence in reports

### Usage Scenarios

**Development (Passive)**:
```json
{
  "mode": "passive",
  "enabled": true
}
```

**Pre-production (Active)**:
```json
{
  "mode": "active",
  "enabled": true,
  "truth_threshold": 0.85
}
```

**Production (Strict)**:
```json
{
  "mode": "strict",
  "enabled": true,
  "truth_threshold": 0.95,
  "rollback_enabled": true
}
```

## Claude Flow Configuration

**File:** `claude-flow.json`

Advanced orchestration system for Claude Code with neural optimization, memory persistence, and automated workflow management.

### Overview

Claude Flow is an advanced system that provides:
- **Automatic checkpointing** - Save work every 5 minutes
- **Memory persistence** - Remember context across sessions
- **Neural optimization** - AI-powered task prediction and error prevention
- **GitHub integration** - Auto-backup, gists, issues, PRs
- **Hooks system** - Pre/post operation automation
- **MCP integration** - Model Context Protocol servers

### Key Features

#### 1. **Checkpoints**
```json
{
  "checkpoints": {
    "enabled": true,
    "interval": 300,
    "auto_commit": true,
    "commit_message_prefix": "🔄 Checkpoint:"
  }
}
```

- Auto-save every 5 minutes
- Git commits with metrics
- Branch strategy: `checkpoint/{timestamp}`
- Maximum 20 checkpoints retained

#### 2. **Memory Persistence**
```json
{
  "memory": {
    "auto_persist": true,
    "compression": true,
    "sync_interval": 60,
    "namespaces": ["swarm", "tasks", "patterns", "errors", "optimizations"]
  }
}
```

Namespaces:
- **swarm**: Multi-agent coordination
- **tasks**: Todo and task tracking
- **patterns**: Learned coding patterns
- **errors**: Error history and solutions
- **optimizations**: Performance improvements

#### 3. **Neural Models**

**Task Predictor** - Predicts optimal task order and approach
```json
{
  "task_predictor": {
    "enabled": true,
    "learning_rate": 0.001,
    "update_frequency": 100
  }
}
```

**Error Preventer** - Blocks risky operations before execution
```json
{
  "error_preventer": {
    "enabled": true,
    "threshold": 0.85,
    "block_risky_operations": true
  }
}
```

**Performance Optimizer** - Tunes operations for speed/accuracy/efficiency
```json
{
  "performance_optimizer": {
    "enabled": true,
    "target_metrics": ["speed", "accuracy", "efficiency"],
    "auto_tune": true
  }
}
```

#### 4. **Hooks System**

Hooks execute automatically at different lifecycle points:

**PreToolUse Hooks** - Before operations:
- Safety validation
- Resource preparation
- Outcome prediction
- Pattern checking
- Context loading

**PostToolUse Hooks** - After operations:
- Metric tracking
- Result storage
- Performance analysis
- Quality scoring
- Neural model training

**Checkpoint Hooks** - Every 5 minutes:
- Create git checkpoint
- Sync memory to remote
- Compress and backup

**Error Hooks** - On errors:
- Store error pattern
- Train error preventer
- Suggest fixes
- Auto-create GitHub issue (optional)

**Stop Hooks** - Session end:
- Generate summary
- Persist state
- Export metrics
- Backup memory to GitHub gist
- Train all models comprehensively

#### 5. **Permissions System**

**Allowed Operations**:
- Claude Flow commands
- npm/npx operations
- Git operations
- GitHub CLI (gh)
- Safe system commands

**Denied Operations**:
- Destructive file operations (`rm -rf /`)
- Piped remote scripts (`curl * | bash`)
- Eval injection (`eval *`)

#### 6. **GitHub Integration**

```json
{
  "github": {
    "checkpoint_branch": "checkpoints",
    "memory_backup_gists": true,
    "auto_issue_on_error": true,
    "pr_on_major_improvement": true,
    "sync_learnings": true
  }
}
```

Features:
- Auto-create checkpoint branch
- Backup memory to private gists
- Create issues on errors
- Auto-PR on major improvements
- Sync learnings across team

### Installation

```bash
# Install Claude Flow (alpha version)
npm install -g claude-flow@alpha

# Or use with npx
npx claude-flow@alpha --version
```

### Usage

#### Enable Claude Flow

Set environment variables or use the config file:

```bash
export CLAUDE_FLOW_AUTO_COMMIT=true
export CLAUDE_FLOW_HOOKS_ENABLED=true
export CLAUDE_FLOW_NEURAL_OPTIMIZATION=true
```

Or use in Claude Code settings/hooks.

#### Manual Checkpoint

```bash
npx claude-flow@alpha checkpoint create --message "Manual checkpoint"
```

#### View Memory

```bash
npx claude-flow@alpha memory list --namespace tasks
npx claude-flow@alpha memory get --key "todos/12345"
```

#### Neural Predictions

```bash
# Predict task complexity
npx claude-flow@alpha neural predict --model task_predictor --input "Implement OAuth"

# Analyze error risk
npx claude-flow@alpha neural predict --model error_preventer --input "rm -rf build/"
```

#### Performance Analysis

```bash
# View performance metrics
npx claude-flow@alpha analysis performance --period "last-hour"

# View error patterns
npx claude-flow@alpha analysis errors --suggest-fixes
```

### Performance Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Command execution | < 500ms overhead | ~300ms |
| Memory operations | < 100ms | ~50ms |
| Neural predictions | < 50ms | ~30ms |

### MCP Integration

Enable Model Context Protocol servers:

```json
{
  "enabledMcpjsonServers": ["claude-flow", "ruv-swarm"]
}
```

- **claude-flow**: Memory, checkpoints, neural models
- **ruv-swarm**: Multi-agent coordination

### Advanced Configuration

**Disable Auto-Push** (safer for production):
```json
{
  "env": {
    "CLAUDE_FLOW_AUTO_PUSH": "false"
  }
}
```

**Reduce Checkpoint Frequency** (less noise):
```json
{
  "checkpoints": {
    "interval": 600
  }
}
```

**Increase Error Prevention Threshold** (stricter):
```json
{
  "neural": {
    "models": {
      "error_preventer": {
        "threshold": 0.95
      }
    }
  }
}
```

### Troubleshooting

**Checkpoints not working?**
- Ensure git is configured
- Check `CLAUDE_FLOW_CHECKPOINT_ENABLED=true`
- Verify write permissions

**Memory not persisting?**
- Check `.claude/` directory exists
- Verify `CLAUDE_FLOW_MEMORY_PERSISTENCE=true`
- Look for memory backup files

**Neural models not training?**
- Ensure `CLAUDE_FLOW_NEURAL_OPTIMIZATION=true`
- Check update_frequency settings
- Review model logs

### Best Practices

1. **Start with passive mode** - Monitor before enabling auto-commit
2. **Review checkpoints** - Clean up old checkpoints periodically
3. **Backup memory** - Claude Flow auto-backups to GitHub gists
4. **Monitor performance** - Check overhead stays within targets
5. **Train models** - More usage = better predictions

### Security Considerations

- Memory backups may contain sensitive data
- Use private gists for memory backup
- Review allowed/denied permissions
- Don't commit secrets to checkpoints
- Use `.gitignore` for sensitive memory namespaces

## Tuning Guidelines

### For High Throughput
- Increase `batching.maxBatchSize` to 200-500
- Reduce `batching.maxWaitTime` to 20-30ms
- Increase `predictionCache.maxEntries` to 50,000+

### For Low Latency
- Reduce `batching.maxBatchSize` to 10-20
- Reduce `batching.maxWaitTime` to 10ms
- Enable `preload.warmup`

### For Cost Optimization
- Increase `predictionCache.ttl` to 600,000ms (10 minutes)
- Increase `batching.maxBatchSize` to maximize batching
- Enable aggressive caching

### For Memory-Constrained Environments
- Reduce `predictionCache.maxEntries` to 1,000-5,000
- Reduce `wasm.memoryPages` to 128
- Reduce `wasm.threads` to 2
