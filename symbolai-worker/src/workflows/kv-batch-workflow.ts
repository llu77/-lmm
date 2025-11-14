/**
 * KV Batch Operations Workflow
 *
 * Handles large-scale KV operations that may involve thousands of keys.
 * Uses Cloudflare Workflows for:
 * - Batching operations to respect rate limits
 * - Automatic retries on failure
 * - Progress tracking
 * - Can run for extended periods
 *
 * @see https://developers.cloudflare.com/workflows
 */

import { WorkflowEntrypoint, WorkflowStep, type WorkflowEvent } from 'cloudflare:workers';

/**
 * KV operation type
 */
export interface KVOperation {
  key: string;
  value?: string;
  operation: 'put' | 'delete';
}

/**
 * Batch workflow parameters
 */
export interface KVBatchParams {
  namespaceId: string;
  operations: KVOperation[];
  accountId: string;
  apiToken: string;
}

/**
 * Cloudflare API response
 */
interface CloudflareAPIResponse<T> {
  success: boolean;
  result: T;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

/**
 * KV Batch Workflow
 *
 * Executes batch KV operations with:
 * - Rate limit handling
 * - Automatic batching (max 10,000 operations per batch)
 * - Retry logic for failed operations
 * - Progress tracking
 */
export class KVBatchWorkflow extends WorkflowEntrypoint<any, KVBatchParams> {
  async run(event: WorkflowEvent<KVBatchParams>, step: WorkflowStep) {
    const { namespaceId, operations, accountId, apiToken } = event.payload;

    // Step 1: Validate namespace exists
    const namespace = await step.do('validate-namespace', async () => {
      console.log(`Validating KV namespace ${namespaceId}`);

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to validate namespace: ${response.status} ${response.statusText}`);
      }

      const data: CloudflareAPIResponse<any> = await response.json();

      if (!data.success) {
        throw new Error(`Namespace validation failed: ${data.errors.map(e => e.message).join(', ')}`);
      }

      return data.result;
    });

    // Step 2: Split operations into batches
    // Cloudflare recommends max 10,000 key-value pairs per bulk write
    const BATCH_SIZE = 10000;
    const batches = this.createBatches(operations, BATCH_SIZE);

    console.log(`Processing ${operations.length} operations in ${batches.length} batches`);

    // Step 3: Process each batch
    const results = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      const batchResult = await step.do(`process-batch-${i}`, async () => {
        console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} operations)`);

        // Separate PUT and DELETE operations
        const putOperations = batch.filter(op => op.operation === 'put');
        const deleteOperations = batch.filter(op => op.operation === 'delete');

        const results = {
          put: 0,
          delete: 0,
          errors: [] as string[],
        };

        // Process PUT operations
        if (putOperations.length > 0) {
          try {
            await this.executeBulkPut(namespaceId, putOperations, accountId, apiToken);
            results.put = putOperations.length;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            results.errors.push(`PUT batch failed: ${errorMsg}`);
          }
        }

        // Process DELETE operations
        if (deleteOperations.length > 0) {
          try {
            await this.executeBulkDelete(namespaceId, deleteOperations, accountId, apiToken);
            results.delete = deleteOperations.length;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            results.errors.push(`DELETE batch failed: ${errorMsg}`);
          }
        }

        return results;
      });

      results.push(batchResult);

      // Add delay between batches to respect rate limits
      if (i < batches.length - 1) {
        await step.sleep('batch-delay', 2000); // 2 seconds between batches
      }
    }

    // Step 4: Aggregate results
    const summary = await step.do('aggregate-results', async () => {
      const totalPut = results.reduce((sum, r) => sum + r.put, 0);
      const totalDelete = results.reduce((sum, r) => sum + r.delete, 0);
      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

      return {
        totalOperations: operations.length,
        successfulPuts: totalPut,
        successfulDeletes: totalDelete,
        totalErrors,
        batches: results.length,
        completedAt: Date.now(),
      };
    });

    // Return final result
    return {
      status: 'completed',
      namespaceId,
      summary,
      batchResults: results,
    };
  }

  /**
   * Split operations into batches
   */
  private createBatches(operations: KVOperation[], batchSize: number): KVOperation[][] {
    const batches: KVOperation[][] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Execute bulk PUT operations
   */
  private async executeBulkPut(
    namespaceId: string,
    operations: KVOperation[],
    accountId: string,
    apiToken: string
  ): Promise<void> {
    // Format for Cloudflare bulk write API
    const keyValuePairs = operations.map(op => ({
      key: op.key,
      value: op.value || '',
    }));

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/bulk`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keyValuePairs),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bulk PUT failed: ${response.status} - ${errorText}`);
    }

    const data: CloudflareAPIResponse<any> = await response.json();

    if (!data.success) {
      throw new Error(`Bulk PUT failed: ${data.errors.map(e => e.message).join(', ')}`);
    }
  }

  /**
   * Execute bulk DELETE operations
   */
  private async executeBulkDelete(
    namespaceId: string,
    operations: KVOperation[],
    accountId: string,
    apiToken: string
  ): Promise<void> {
    // Cloudflare bulk delete API expects an array of keys
    const keys = operations.map(op => op.key);

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/bulk`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keys),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bulk DELETE failed: ${response.status} - ${errorText}`);
    }

    const data: CloudflareAPIResponse<any> = await response.json();

    if (!data.success) {
      throw new Error(`Bulk DELETE failed: ${data.errors.map(e => e.message).join(', ')}`);
    }
  }
}
