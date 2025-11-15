// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Workers Runtime Environment
 *
 * This file defines the types for the Cloudflare Workers runtime environment
 * including bindings for D1, KV, R2, AI, and other Cloudflare services.
 *
 * Note: Astro 5.x auto-generates types in .astro/types.d.ts
 * Run `astro sync` to update type definitions.
 */

type D1Database = import('@cloudflare/workers-types').D1Database;
type KVNamespace = import('@cloudflare/workers-types').KVNamespace;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;
type Ai = import('@cloudflare/workers-types').Ai;
type Queue = import('@cloudflare/workers-types').Queue;
type WorkflowEntrypoint = import('@cloudflare/workers-types').WorkflowEntrypoint;
type Workflow = import('@cloudflare/workers-types').Workflow;

/**
 * Runtime Environment Interface
 */
export interface RuntimeEnv {
  // Database Bindings
  DB: D1Database;

  // KV Namespace Bindings
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  FILES: KVNamespace;
  OAUTH_KV: KVNamespace;
  RATE_LIMIT: KVNamespace;

  // R2 Bucket Bindings
  PAYROLL_BUCKET: R2Bucket;
  STORAGE: R2Bucket;

  // AI Binding
  AI: Ai;

  // Queue Bindings
  EMAIL_QUEUE: Queue;

  // Workflow Bindings
  WORKFLOWS: WorkflowEntrypoint;
  D1_MIGRATION_WORKFLOW: Workflow;
  KV_BATCH_WORKFLOW: Workflow;

  // Environment Variables
  ENVIRONMENT: string;
  AI_GATEWAY_ACCOUNT_ID: string;
  AI_GATEWAY_NAME: string;

  // Email Configuration
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  ADMIN_EMAIL: string;

  // Secrets (accessed via env but not defined here for security)
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY: string;
  RESEND_WEBHOOK_SECRET: string;
  ZAPIER_WEBHOOK_URL: string;
  SESSION_SECRET: string;

  // Optional: Database ID for MCP operations
  DB_ID?: string;
}

/**
 * User Type (from database)
 */
export type User = {
  id: number;
  username: string;
  email: string;
  role_id: number;
  branch_id: number;
  is_active: boolean;
};

/**
 * Astro Locals with Cloudflare Runtime and Middleware
 *
 * Properties set by middleware and available in all pages/API routes.
 */
declare namespace App {
  interface Locals {
    // Cloudflare Runtime (set by Cloudflare adapter)
    runtime: {
      env: RuntimeEnv;
      cf: import('@cloudflare/workers-types').IncomingRequestCfProperties;
      caches: import('@cloudflare/workers-types').CacheStorage;
      ctx: import('@cloudflare/workers-types').ExecutionContext;
    };

    // Authentication (set by middleware)
    user: User | null;
    isAuthenticated: boolean;
    userId?: number;
    sessionId?: string;

    // MCP Integration (set by MCP auth endpoints)
    mcpToken?: {
      accessToken: string;
      expiresAt: number;
      accountId?: string;
    };

    // Optional: Request metadata
    requestId?: string;
    startTime?: number;
  }
}

/**
 * Export Env type for use in Workers and Agents
 */
export type Env = RuntimeEnv;
