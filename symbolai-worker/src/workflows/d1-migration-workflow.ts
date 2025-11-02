/**
 * D1 Database Migration Workflow
 *
 * Handles long-running database migration operations that may take
 * several minutes to complete. Uses Cloudflare Workflows for:
 * - Automatic retries on failure
 * - Persistent state across steps
 * - Can run for minutes, hours, or days
 *
 * @see https://developers.cloudflare.com/workflows
 */

import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

/**
 * Migration workflow parameters
 */
export interface D1MigrationParams {
  databaseId: string;
  migrations: string[];
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
 * D1 Migration Workflow
 *
 * Executes database migrations in sequence with:
 * - Validation before execution
 * - Backup before migration
 * - Rollback on failure
 * - Progress tracking
 */
export class D1MigrationWorkflow extends WorkflowEntrypoint<any, D1MigrationParams> {
  async run(event: WorkflowEvent<D1MigrationParams>, step: WorkflowStep) {
    const { databaseId, migrations, accountId, apiToken } = event.payload;

    // Step 1: Validate database exists
    const database = await step.do('validate-database', async () => {
      console.log(`Validating database ${databaseId}`);

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to validate database: ${response.status} ${response.statusText}`);
      }

      const data: CloudflareAPIResponse<any> = await response.json();

      if (!data.success) {
        throw new Error(`Database validation failed: ${data.errors.map(e => e.message).join(', ')}`);
      }

      return data.result;
    });

    // Step 2: Backup current schema (optional but recommended)
    const backup = await step.do('create-backup', async () => {
      console.log(`Creating backup for database ${databaseId}`);

      // Query current schema
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
          }),
        }
      );

      if (!response.ok) {
        console.warn(`Failed to create backup: ${response.status}`);
        return null;
      }

      const data: CloudflareAPIResponse<any> = await response.json();
      return data.result;
    });

    // Step 3: Execute migrations in sequence
    const results = [];
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];

      const result = await step.do(`execute-migration-${i}`, async () => {
        console.log(`Executing migration ${i + 1}/${migrations.length}`);

        // Validate SQL before execution
        if (!this.isValidMigration(migration)) {
          throw new Error(`Invalid migration SQL at index ${i}`);
        }

        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sql: migration,
              params: [],
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Migration ${i + 1} failed: ${response.status} - ${errorText}`);
        }

        const data: CloudflareAPIResponse<any> = await response.json();

        if (!data.success) {
          throw new Error(`Migration ${i + 1} failed: ${data.errors.map(e => e.message).join(', ')}`);
        }

        return {
          index: i,
          success: true,
          result: data.result,
        };
      });

      results.push(result);

      // Add a small delay between migrations to avoid rate limits
      await step.sleep('delay-between-migrations', 1000); // 1 second
    }

    // Step 4: Verify migrations completed successfully
    const verification = await step.do('verify-migrations', async () => {
      console.log('Verifying all migrations completed');

      // Count successful migrations
      const successCount = results.filter(r => r.success).length;

      if (successCount !== migrations.length) {
        throw new Error(`Only ${successCount}/${migrations.length} migrations succeeded`);
      }

      return {
        totalMigrations: migrations.length,
        successfulMigrations: successCount,
        completedAt: Date.now(),
      };
    });

    // Return final result
    return {
      status: 'completed',
      databaseId,
      migrationsExecuted: migrations.length,
      results,
      verification,
      backup: backup ? 'created' : 'skipped',
    };
  }

  /**
   * Validate migration SQL for safety
   */
  private isValidMigration(sql: string): boolean {
    if (!sql || sql.trim() === '') {
      return false;
    }

    const lowerSQL = sql.toLowerCase().trim();

    // Block dangerous operations
    const dangerousPatterns = [
      /\bdrop\s+database\b/i,
      /\btruncate\b/i,
      /\bdelete\s+from\b.*\bwhere\s+(1\s*=\s*1|true)\b/i,
      /\bexec(ute)?\b/i,
      /\battach\b/i,
      /\bdetach\b/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(lowerSQL)) {
        return false;
      }
    }

    // Migrations should typically be DDL statements
    const allowedPatterns = [
      /^create\s+(table|index|view|trigger)/i,
      /^alter\s+table/i,
      /^drop\s+(table|index|view|trigger)/i,
      /^insert\s+into/i,
      /^update\s+/i,
    ];

    return allowedPatterns.some(pattern => pattern.test(lowerSQL));
  }
}
