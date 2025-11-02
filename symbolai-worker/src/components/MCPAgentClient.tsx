/**
 * MCP Agent Client Component
 *
 * React-based client for interacting with CloudflareMCPAgent using the Agents framework.
 * Features:
 * - Real-time state synchronization via useAgent hook
 * - Workflow monitoring dashboard
 * - Scheduled task management
 * - Tool invocation interface
 */

import React, { useState, useEffect } from 'react';
import { useAgent } from 'agents/react';
import type { CloudflareMCPAgent } from '@/agents/cloudflare-mcp';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MCPAgentClientProps {
  agentId: string;
  authToken?: string;
}

interface WorkflowState {
  id: string;
  type: 'migration' | 'batch' | 'deployment';
  status: 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  error?: string;
}

interface ScheduledTaskState {
  syncEnabled: boolean;
  syncInterval: string;
  lastSyncStatus?: 'success' | 'error';
  lastSyncError?: string;
}

/**
 * Main MCP Agent Client Component
 */
export function MCPAgentClient({ agentId, authToken }: MCPAgentClientProps) {
  const [activeTab, setActiveTab] = useState<'workflows' | 'scheduled' | 'tools'>('workflows');

  // Connect to the CloudflareMCPAgent using useAgent hook
  // Note: This provides real-time state synchronization
  const agent = useAgent(
    '/api/agents/mcp/mcp',
    agentId,
    authToken ? { headers: { 'Authorization': `Bearer ${authToken}` } } : undefined
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🤖</span>
            <span>Cloudflare MCP Agent</span>
          </CardTitle>
          <CardDescription>
            Real-time agent state and workflow management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${agent.state ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {agent.state ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {agent.state?.activeAccountId && (
              <div className="text-sm text-gray-600">
                Account: {agent.state.activeAccountId}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'workflows' ? 'default' : 'outline'}
          onClick={() => setActiveTab('workflows')}
        >
          Workflows
        </Button>
        <Button
          variant={activeTab === 'scheduled' ? 'default' : 'outline'}
          onClick={() => setActiveTab('scheduled')}
        >
          Scheduled Tasks
        </Button>
        <Button
          variant={activeTab === 'tools' ? 'default' : 'outline'}
          onClick={() => setActiveTab('tools')}
        >
          Tools
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'workflows' && <WorkflowsPanel agent={agent} />}
      {activeTab === 'scheduled' && <ScheduledTasksPanel agent={agent} />}
      {activeTab === 'tools' && <ToolsPanel agent={agent} />}
    </div>
  );
}

/**
 * Workflows Management Panel
 */
function WorkflowsPanel({ agent }: { agent: any }) {
  const [showMigrationForm, setShowMigrationForm] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);

  const workflows: WorkflowState[] = agent.state?.activeWorkflows || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Active Workflows</CardTitle>
          <CardDescription>
            Monitor and manage long-running workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflows.length === 0 ? (
            <p className="text-sm text-gray-500">No active workflows</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-mono text-xs">
                      {workflow.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                        {workflow.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        workflow.status === 'completed' ? 'bg-green-100 text-green-700' :
                        workflow.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {workflow.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(workflow.startedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {workflow.completedAt
                        ? `${Math.round((workflow.completedAt - workflow.startedAt) / 1000)}s`
                        : `${Math.round((Date.now() - workflow.startedAt) / 1000)}s`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Trigger Workflow Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">D1 Migration Workflow</CardTitle>
            <CardDescription>
              Execute database migrations with automatic retries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowMigrationForm(!showMigrationForm)}>
              {showMigrationForm ? 'Cancel' : 'Trigger Migration'}
            </Button>
            {showMigrationForm && (
              <MigrationForm agent={agent} onComplete={() => setShowMigrationForm(false)} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">KV Batch Workflow</CardTitle>
            <CardDescription>
              Process large-scale KV operations with batching
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowBatchForm(!showBatchForm)}>
              {showBatchForm ? 'Cancel' : 'Trigger Batch Operations'}
            </Button>
            {showBatchForm && (
              <BatchOperationForm agent={agent} onComplete={() => setShowBatchForm(false)} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * D1 Migration Form
 */
function MigrationForm({ agent, onComplete }: { agent: any; onComplete: () => void }) {
  const [databaseId, setDatabaseId] = useState('');
  const [migrations, setMigrations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const migrationArray = migrations
        .split(';')
        .map(m => m.trim())
        .filter(m => m.length > 0);

      const result = await agent.triggerMigrationWorkflow(databaseId, migrationArray);

      if (result.error) {
        setError(result.error);
      } else {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="databaseId">Database ID</Label>
        <Input
          id="databaseId"
          value={databaseId}
          onChange={(e) => setDatabaseId(e.target.value)}
          placeholder="Enter D1 database ID"
          required
        />
      </div>
      <div>
        <Label htmlFor="migrations">SQL Migrations (separated by semicolons)</Label>
        <textarea
          id="migrations"
          value={migrations}
          onChange={(e) => setMigrations(e.target.value)}
          placeholder="CREATE TABLE users (id INTEGER PRIMARY KEY);"
          className="w-full min-h-[100px] p-2 border rounded-md font-mono text-sm"
          required
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? 'Starting...' : 'Start Migration'}
      </Button>
    </form>
  );
}

/**
 * KV Batch Operation Form
 */
function BatchOperationForm({ agent, onComplete }: { agent: any; onComplete: () => void }) {
  const [namespaceId, setNamespaceId] = useState('');
  const [operations, setOperations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Parse operations from JSON
      const operationsArray = JSON.parse(operations);

      const result = await agent.triggerBatchKVWorkflow(namespaceId, operationsArray);

      if (result.error) {
        setError(result.error);
      } else {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="namespaceId">KV Namespace ID</Label>
        <Input
          id="namespaceId"
          value={namespaceId}
          onChange={(e) => setNamespaceId(e.target.value)}
          placeholder="Enter KV namespace ID"
          required
        />
      </div>
      <div>
        <Label htmlFor="operations">Operations (JSON array)</Label>
        <textarea
          id="operations"
          value={operations}
          onChange={(e) => setOperations(e.target.value)}
          placeholder='[{"operation":"put","key":"key1","value":"value1"}]'
          className="w-full min-h-[100px] p-2 border rounded-md font-mono text-sm"
          required
        />
      </div>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? 'Starting...' : 'Start Batch Operations'}
      </Button>
    </form>
  );
}

/**
 * Scheduled Tasks Management Panel
 */
function ScheduledTasksPanel({ agent }: { agent: any }) {
  const [syncInterval, setSyncInterval] = useState('0 * * * *');
  const [loading, setLoading] = useState(false);

  const scheduledTasks: ScheduledTaskState = agent.state?.scheduledTasks || {
    syncEnabled: false,
    syncInterval: '0 * * * *',
  };

  const cachedData = agent.state?.cachedData;

  const handleEnableSync = async () => {
    setLoading(true);
    try {
      await agent.enablePeriodicSync(syncInterval);
    } catch (error) {
      console.error('Failed to enable sync:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSync = async () => {
    setLoading(true);
    try {
      await agent.disablePeriodicSync();
    } catch (error) {
      console.error('Failed to disable sync:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setLoading(true);
    try {
      await agent.syncCloudflareResources();
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Periodic Resource Sync</CardTitle>
          <CardDescription>
            Automatically sync Cloudflare resources on a schedule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${scheduledTasks.syncEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm">
              Status: {scheduledTasks.syncEnabled ? 'Enabled' : 'Disabled'}
            </span>
            {scheduledTasks.syncEnabled && (
              <span className="text-xs text-gray-500">
                Interval: {scheduledTasks.syncInterval}
              </span>
            )}
          </div>

          {scheduledTasks.lastSyncStatus && (
            <div className={`p-3 rounded-md text-sm ${
              scheduledTasks.lastSyncStatus === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              Last sync: {scheduledTasks.lastSyncStatus}
              {scheduledTasks.lastSyncError && (
                <div className="mt-1 text-xs">{scheduledTasks.lastSyncError}</div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="syncInterval">Cron Expression</Label>
            <Input
              id="syncInterval"
              value={syncInterval}
              onChange={(e) => setSyncInterval(e.target.value)}
              placeholder="0 * * * * (hourly)"
              disabled={scheduledTasks.syncEnabled}
            />
            <p className="text-xs text-gray-500">
              Examples: "0 * * * *" (hourly), "0 0 * * *" (daily), "*/30 * * * *" (every 30 min)
            </p>
          </div>

          <div className="flex gap-2">
            {scheduledTasks.syncEnabled ? (
              <Button onClick={handleDisableSync} disabled={loading} variant="destructive">
                Disable Sync
              </Button>
            ) : (
              <Button onClick={handleEnableSync} disabled={loading}>
                Enable Sync
              </Button>
            )}
            <Button onClick={handleManualSync} disabled={loading} variant="outline">
              Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cached Data Display */}
      {cachedData && (
        <Card>
          <CardHeader>
            <CardTitle>Cached Resources</CardTitle>
            <CardDescription>
              Last updated: {cachedData.lastCacheUpdate
                ? new Date(cachedData.lastCacheUpdate).toLocaleString()
                : 'Never'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="text-2xl font-bold text-blue-700">
                  {cachedData.databases?.length || 0}
                </div>
                <div className="text-sm text-blue-600">D1 Databases</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-md">
                <div className="text-2xl font-bold text-purple-700">
                  {cachedData.namespaces?.length || 0}
                </div>
                <div className="text-sm text-purple-600">KV Namespaces</div>
              </div>
              <div className="p-3 bg-green-50 rounded-md">
                <div className="text-2xl font-bold text-green-700">
                  {cachedData.buckets?.length || 0}
                </div>
                <div className="text-sm text-green-600">R2 Buckets</div>
              </div>
              <div className="p-3 bg-orange-50 rounded-md">
                <div className="text-2xl font-bold text-orange-700">
                  {cachedData.workers?.length || 0}
                </div>
                <div className="text-sm text-orange-600">Workers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Tools Panel - Direct tool invocation
 */
function ToolsPanel({ agent }: { agent: any }) {
  const [selectedTool, setSelectedTool] = useState('');
  const [toolArgs, setToolArgs] = useState('{}');
  const [toolResult, setToolResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const tools = [
    { name: 'd1_list_databases', description: 'List all D1 databases' },
    { name: 'd1_query', description: 'Execute SQL query on D1 database' },
    { name: 'kv_list_namespaces', description: 'List all KV namespaces' },
    { name: 'kv_list_keys', description: 'List keys in KV namespace' },
    { name: 'r2_list_buckets', description: 'List all R2 buckets' },
    { name: 'workers_list', description: 'List all Workers' },
    { name: 'get_stats', description: 'Get agent statistics' },
  ];

  const handleInvokeTool = async () => {
    if (!selectedTool) return;

    setLoading(true);
    setToolResult(null);

    try {
      const args = JSON.parse(toolArgs);
      const result = await agent.callTool(selectedTool, args);
      setToolResult(result);
    } catch (error) {
      setToolResult({
        error: error instanceof Error ? error.message : 'Tool invocation failed'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>MCP Tool Invocation</CardTitle>
          <CardDescription>
            Directly invoke MCP tools on the agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tool">Select Tool</Label>
            <select
              id="tool"
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Choose a tool...</option>
              {tools.map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name} - {tool.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="args">Arguments (JSON)</Label>
            <textarea
              id="args"
              value={toolArgs}
              onChange={(e) => setToolArgs(e.target.value)}
              placeholder='{"databaseId": "..."}'
              className="w-full min-h-[100px] p-2 border rounded-md font-mono text-sm"
            />
          </div>

          <Button onClick={handleInvokeTool} disabled={!selectedTool || loading}>
            {loading ? 'Invoking...' : 'Invoke Tool'}
          </Button>

          {toolResult && (
            <div className="mt-4">
              <Label>Result</Label>
              <pre className="mt-2 p-4 bg-gray-50 rounded-md overflow-auto text-xs">
                {JSON.stringify(toolResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MCPAgentClient;
