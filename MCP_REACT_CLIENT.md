# MCP React Client Documentation

This document describes the React-based client for interacting with the Cloudflare MCP Agent, including workflow management and scheduled task features.

## 🎯 Overview

The MCP React Client provides a modern, real-time interface for managing Cloudflare infrastructure through the Cloudflare Agents framework. It features:

- **Real-time state synchronization** via `useAgent` hook from `agents/react`
- **Workflow monitoring dashboard** for D1 migrations and KV batch operations
- **Scheduled task management** for periodic resource syncing
- **Direct tool invocation** for MCP tools
- **Type-safe** implementation with TypeScript

## 📁 File Structure

```
symbolai-worker/
├── src/
│   ├── components/
│   │   ├── MCPAgentClient.tsx        # Main React component
│   │   └── ui/                       # UI components (Button, Card, etc.)
│   ├── pages/
│   │   └── mcp-agent.astro           # Astro page that uses React component
│   ├── agents/
│   │   ├── cloudflare-mcp.ts         # MCP Agent with workflows & scheduling
│   │   └── mcp-oauth-provider.ts     # OAuth authentication
│   └── workflows/
│       ├── d1-migration-workflow.ts  # D1 migration workflow
│       └── kv-batch-workflow.ts      # KV batch operations workflow
├── wrangler.toml                     # Workflow bindings configuration
└── MCP_REACT_CLIENT.md               # This documentation
```

## 🚀 Features

### 1. Real-Time State Synchronization

The client uses the `useAgent` hook to connect to the CloudflareMCPAgent, providing automatic state updates:

```typescript
import { useAgent } from 'agents/react';

const agent = useAgent(
  '/api/agents/mcp/mcp',     // Agent endpoint
  agentId,                    // Unique agent ID (e.g., "user-123")
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// Access agent state (automatically updates)
const workflows = agent.state?.activeWorkflows || [];
const scheduledTasks = agent.state?.scheduledTasks;
const cachedData = agent.state?.cachedData;
```

**State Structure:**
```typescript
interface CloudflareMCPState {
  activeAccountId?: string;
  activeWorkerId?: string;
  tokenData?: {
    accountId: string;
    apiToken: string;
    expiresAt: number;
  };
  lastSync?: number;
  usageStats?: {
    requestCount: number;
    errorCount: number;
    lastRequestTime?: number;
  };

  // Scheduled tasks state
  scheduledTasks?: {
    syncEnabled: boolean;
    syncInterval: string;
    lastSyncStatus?: 'success' | 'error';
    lastSyncError?: string;
  };

  // Cached data from periodic sync
  cachedData?: {
    databases?: any[];
    namespaces?: any[];
    buckets?: any[];
    workers?: any[];
    lastCacheUpdate?: number;
  };

  // Active workflows
  activeWorkflows?: Array<{
    id: string;
    type: 'migration' | 'batch' | 'deployment';
    status: 'running' | 'completed' | 'failed';
    startedAt: number;
    completedAt?: number;
    error?: string;
  }>;
}
```

### 2. Workflow Management

#### D1 Migration Workflow

Execute database migrations with automatic retries and state persistence:

```typescript
// Trigger a migration workflow
const result = await agent.triggerMigrationWorkflow(
  'database-id-here',
  [
    'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)',
    'CREATE INDEX idx_users_name ON users(name)',
    'INSERT INTO users (name) VALUES ("admin")'
  ]
);

// Monitor workflow progress
const workflows = agent.state?.activeWorkflows || [];
const migrationWorkflow = workflows.find(w => w.type === 'migration');
console.log(`Status: ${migrationWorkflow.status}`);
```

**Migration Workflow Features:**
- ✅ Pre-migration database validation
- ✅ Automatic schema backup
- ✅ SQL safety validation (blocks dangerous operations)
- ✅ Sequential execution with delays
- ✅ Automatic retries on failure
- ✅ Progress tracking via agent state

**File:** `src/workflows/d1-migration-workflow.ts`

#### KV Batch Operations Workflow

Process large-scale KV operations with automatic batching:

```typescript
// Trigger batch operations
const result = await agent.triggerBatchKVWorkflow(
  'namespace-id-here',
  [
    { operation: 'put', key: 'key1', value: 'value1' },
    { operation: 'put', key: 'key2', value: 'value2' },
    { operation: 'delete', key: 'old-key' },
    // ... up to millions of operations
  ]
);

// Track batch progress
const workflows = agent.state?.activeWorkflows || [];
const batchWorkflow = workflows.find(w => w.type === 'batch');
```

**Batch Workflow Features:**
- ✅ Automatic batching (10,000 operations per batch)
- ✅ Rate limiting (2-second delays between batches)
- ✅ Separate PUT and DELETE handling
- ✅ Progress aggregation
- ✅ Error tracking per batch
- ✅ Resumable on failure

**File:** `src/workflows/kv-batch-workflow.ts`

### 3. Scheduled Tasks

Automatically sync Cloudflare resources on a schedule using cron expressions:

```typescript
// Enable periodic sync (hourly by default)
await agent.enablePeriodicSync('0 * * * *');

// Disable sync
await agent.disablePeriodicSync();

// Manual sync
await agent.syncCloudflareResources();

// Check sync status
const { syncEnabled, syncInterval, lastSyncStatus } = agent.state?.scheduledTasks || {};
```

**Cron Expression Examples:**
- `'0 * * * *'` - Every hour (on the hour)
- `'*/30 * * * *'` - Every 30 minutes
- `'0 0 * * *'` - Daily at midnight
- `'0 9 * * 1'` - Every Monday at 9 AM

**What Gets Synced:**
- D1 databases (list with table counts)
- KV namespaces (list with metadata)
- R2 buckets (list with creation dates)
- Workers scripts (list with modification times)

**Cached Data Access:**
```typescript
const cachedData = agent.state?.cachedData;
console.log(`Databases: ${cachedData?.databases?.length || 0}`);
console.log(`Last updated: ${new Date(cachedData?.lastCacheUpdate)}`);
```

### 4. Direct Tool Invocation

Invoke any MCP tool directly from the UI:

```typescript
// List all D1 databases
const databases = await agent.callTool('d1_list_databases', {});

// Execute SQL query
const result = await agent.callTool('d1_query', {
  databaseId: 'db-id',
  sql: 'SELECT * FROM users LIMIT 10'
});

// List KV namespaces
const namespaces = await agent.callTool('kv_list_namespaces', {});

// Get agent statistics
const stats = await agent.callTool('get_stats', {});
```

**Available Tools:**
- `d1_list_databases` - List all D1 databases
- `d1_get_database` - Get details for specific database
- `d1_query` - Execute SQL query
- `kv_list_namespaces` - List all KV namespaces
- `kv_get_namespace` - Get namespace details
- `kv_list_keys` - List keys in namespace
- `r2_list_buckets` - List all R2 buckets
- `r2_get_bucket` - Get bucket details
- `workers_list` - List all Workers
- `workers_get` - Get Worker details
- `builds_list` - List recent builds
- `builds_get_logs` - Get build logs
- `get_stats` - Get agent statistics
- `set_active_account` - Switch Cloudflare account

## 🎨 UI Components

### Workflow Panel

Displays active workflows with:
- Workflow ID (truncated for display)
- Type badge (migration/batch/deployment)
- Status indicator (running/completed/failed)
- Start time and duration
- Forms to trigger new workflows

### Scheduled Tasks Panel

Shows:
- Sync status (enabled/disabled)
- Current cron interval
- Last sync result
- Cached resource counts
- Controls to enable/disable/trigger sync

### Tools Panel

Provides:
- Tool selector dropdown
- JSON arguments input
- Invoke button
- Result display (formatted JSON)

## 🔧 Configuration

### Workflow Bindings (wrangler.toml)

```toml
# D1 Database Migration Workflow
[[workflows]]
binding = "D1_MIGRATION_WORKFLOW"
name = "d1-migration-workflow"
class_name = "D1MigrationWorkflow"

# KV Batch Operations Workflow
[[workflows]]
binding = "KV_BATCH_WORKFLOW"
name = "kv-batch-workflow"
class_name = "KVBatchWorkflow"
```

### Environment Types (src/env.d.ts)

```typescript
interface RuntimeEnv {
  // ... other bindings

  // Workflow Bindings
  WORKFLOWS: WorkflowEntrypoint;
  D1_MIGRATION_WORKFLOW: Workflow;
  KV_BATCH_WORKFLOW: Workflow;
}
```

## 🚦 Usage

### Access the React Client

1. **Navigate to:** `/mcp-agent`
2. **Authentication:** Requires admin role
3. **Connection:** Automatically connects to your agent instance

### Trigger a Migration

1. Click **"Workflows"** tab
2. Click **"Trigger Migration"** under D1 Migration Workflow
3. Enter:
   - Database ID (from your D1 dashboard)
   - SQL migrations (separated by semicolons)
4. Click **"Start Migration"**
5. Monitor progress in the Active Workflows table

### Trigger Batch Operations

1. Click **"Workflows"** tab
2. Click **"Trigger Batch Operations"** under KV Batch Workflow
3. Enter:
   - KV Namespace ID
   - Operations JSON array:
     ```json
     [
       {"operation":"put","key":"key1","value":"value1"},
       {"operation":"delete","key":"old-key"}
     ]
     ```
4. Click **"Start Batch Operations"**
5. Monitor progress in real-time

### Enable Scheduled Sync

1. Click **"Scheduled Tasks"** tab
2. Enter cron expression (e.g., `0 * * * *` for hourly)
3. Click **"Enable Sync"**
4. View cached data updated automatically
5. Click **"Sync Now"** for manual refresh

### Invoke Tools

1. Click **"Tools"** tab
2. Select tool from dropdown
3. Enter arguments as JSON (e.g., `{"databaseId":"..."}`)
4. Click **"Invoke Tool"**
5. View formatted result

## 📊 Monitoring

### Workflow Status Checking

The agent automatically monitors workflow status every 5 minutes using a scheduled task:

```typescript
// Scheduled task runs every 5 minutes
await this.schedule('*/5 * * * *', 'checkWorkflowStatus', {
  workflowId: workflow.id,
  type: workflow.type
});
```

When a workflow completes:
- Agent state is updated
- Status changed to 'completed' or 'failed'
- Completion timestamp recorded
- Monitoring task is cancelled

### State Persistence

All agent state is persisted in SQLite via Durable Objects:
- Survives agent restarts
- Available across sessions
- Synchronized in real-time to client

## 🔐 Security

### Authentication

- OAuth 2.0 for MCP clients
- Session-based auth for web UI
- Token validation on every request
- Admin role required for access

### Authorization

- User-specific agent instances
- Token scoped to user's Cloudflare account
- API tokens stored securely in KV

### SQL Safety

Migration workflow validates SQL to prevent:
- `DROP DATABASE` commands
- `TRUNCATE` operations
- Unguarded `DELETE` statements
- `EXEC` injection attempts
- `ATTACH`/`DETACH` operations

## 🎯 Best Practices

### Migrations

1. **Test locally first** - Test migrations on development database
2. **Create backups** - Workflow creates automatic backups
3. **Batch related changes** - Group related DDL statements
4. **Use transactions** - Wrap critical operations
5. **Monitor progress** - Watch workflow status in real-time

### Batch Operations

1. **Prepare data** - Format operations array correctly
2. **Monitor size** - Large batches (100k+ ops) take time
3. **Check results** - Review batch results for errors
4. **Handle failures** - Failed batches can be retried

### Scheduled Tasks

1. **Start conservative** - Begin with longer intervals
2. **Monitor performance** - Check sync durations
3. **Use cached data** - Reduce API calls by using cache
4. **Disable when not needed** - Save resources

## 🐛 Troubleshooting

### Build fails with React error

**Solution:** Ensure React and React DOM versions match:
```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0"
}
```

### Agent disconnected

**Symptoms:** Red status indicator, no state updates

**Solutions:**
1. Check authentication token is valid
2. Verify agent ID is correct
3. Check browser console for errors
4. Refresh page to reconnect

### Workflow stuck in "running"

**Symptoms:** Workflow shows running for extended time

**Solutions:**
1. Wait for next status check (every 5 minutes)
2. Check Cloudflare dashboard for workflow logs
3. Trigger manual sync to refresh state
4. Check workflow implementation for errors

### Scheduled sync failing

**Symptoms:** `lastSyncStatus: 'error'`

**Solutions:**
1. Check `lastSyncError` for details
2. Verify Cloudflare API token permissions
3. Check account ID is correct
4. Disable and re-enable sync

## 📚 References

- [Cloudflare Agents Documentation](https://developers.cloudflare.com/agents)
- [Cloudflare Workflows](https://developers.cloudflare.com/workflows)
- [MCP Protocol](https://modelcontextprotocol.io)
- [React Hooks for Agents](https://developers.cloudflare.com/agents/react)

## 🔄 Updates

### Version 1.0 (Current)

- ✅ Real-time state synchronization
- ✅ D1 migration workflow
- ✅ KV batch operations workflow
- ✅ Scheduled resource syncing
- ✅ Direct tool invocation
- ✅ Admin-only access control
- ✅ Type-safe TypeScript implementation

### Future Enhancements

- 🔄 R2 file upload workflow
- 🔄 Worker deployment workflow
- 🔄 Multi-account management
- 🔄 Advanced analytics dashboard
- 🔄 Webhook notifications
- 🔄 Export/import workflow templates
