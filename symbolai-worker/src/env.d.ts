/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Workers Runtime Environment
 *
 * This file defines the types for the Cloudflare Workers runtime environment
 * including bindings for D1, KV, R2, AI, and other Cloudflare services.
 */

type D1Database = import('@cloudflare/workers-types').D1Database;
type KVNamespace = import('@cloudflare/workers-types').KVNamespace;
type R2Bucket = import('@cloudflare/workers-types').R2Bucket;
type Ai = import('@cloudflare/workers-types').Ai;
type Queue = import('@cloudflare/workers-types').Queue;
type WorkflowEntrypoint = import('@cloudflare/workers-types').WorkflowEntrypoint;

/**
 * Runtime Environment Interface
 */
interface RuntimeEnv {
  // Database Bindings
  DB: D1Database;

  // KV Namespace Bindings
  SESSIONS: KVNamespace;

  // R2 Bucket Bindings
  PAYROLL_PDFS: R2Bucket;

  // AI Binding
  AI: Ai;

  // Queue Bindings
  EMAIL_QUEUE: Queue;

  // Workflow Bindings
  WORKFLOWS: WorkflowEntrypoint;

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
 * Astro Locals with Cloudflare Runtime
 */
declare namespace App {
  interface Locals {
    runtime: {
      env: RuntimeEnv;
      cf: CfProperties;
      ctx: ExecutionContext;
    };
    user?: {
      id: number;
      username: string;
      email: string;
      role_id: number;
      branch_id: number;
    };
  }
}

/**
 * Cloudflare Request Properties
 */
interface CfProperties {
  asn: number;
  colo: string;
  city?: string;
  continent?: string;
  country?: string;
  latitude?: string;
  longitude?: string;
  postalCode?: string;
  region?: string;
  regionCode?: string;
  timezone?: string;
}

/**
 * Execution Context for Cloudflare Workers
 */
interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}
