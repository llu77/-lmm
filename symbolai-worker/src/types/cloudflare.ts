/**
 * Cloudflare Workers Type Definitions
 * 
 * This file provides TypeScript type definitions following Cloudflare Workers standards
 * Compatible with the official @cloudflare/workers-types
 */

/**
 * Environment bindings for the worker
 * Extend this interface to add your custom bindings
 */
export interface Env {
  // KV Namespace bindings
  KV?: KVNamespace;
  
  // D1 Database bindings
  DB?: D1Database;
  
  // R2 Bucket bindings
  BUCKET?: R2Bucket;
  
  // Service bindings
  AI?: Ai;
  
  // Environment variables
  ENVIRONMENT?: string;
  
  // Add your custom bindings here
  [key: string]: unknown;
}

/**
 * Execution context for the worker
 */
export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

/**
 * Standard Cloudflare Workers fetch handler
 * 
 * @example
 * ```typescript
 * export default {
 *   async fetch(request, env, ctx) {
 *     return new Response('Hello World');
 *   }
 * };
 * ```
 */
export type FetchHandler<E = Env> = (
  request: Request,
  env: E,
  ctx: ExecutionContext
) => Response | Promise<Response>;

/**
 * Scheduled event handler for Cron Triggers
 */
export type ScheduledHandler<E = Env> = (
  event: ScheduledEvent,
  env: E,
  ctx: ExecutionContext
) => void | Promise<void>;

/**
 * Queue consumer handler
 */
export type QueueHandler<E = Env, Message = unknown> = (
  batch: MessageBatch<Message>,
  env: E,
  ctx: ExecutionContext
) => void | Promise<void>;

/**
 * Standard exported handler interface
 * This is the main entry point for Cloudflare Workers
 */
export interface ExportedHandler<E = Env> {
  fetch?: FetchHandler<E>;
  scheduled?: ScheduledHandler<E>;
  queue?: QueueHandler<E>;
}

/**
 * Helper type for creating a standard worker export
 * 
 * @example
 * ```typescript
 * const worker: WorkerEntrypoint = {
 *   async fetch(request, env, ctx) {
 *     return new Response('Hello');
 *   }
 * };
 * export default worker;
 * ```
 */
export type WorkerEntrypoint<E = Env> = ExportedHandler<E>;

/**
 * Request handler with typed environment
 */
export type RequestHandler<E = Env> = (
  request: Request,
  env: E,
  ctx: ExecutionContext
) => Response | Promise<Response>;

/**
 * Helper for creating typed fetch handlers
 */
export function createFetchHandler<E = Env>(
  handler: FetchHandler<E>
): FetchHandler<E> {
  return handler;
}

/**
 * Helper for creating typed worker exports
 */
export function createWorker<E = Env>(
  handlers: ExportedHandler<E>
): ExportedHandler<E> {
  return handlers;
}

// Re-export common Cloudflare types for convenience
export type {
  KVNamespace,
  D1Database,
  R2Bucket,
  Ai,
  AnalyticsEngineDataset,
  DurableObjectNamespace,
  DurableObjectStub,
  Fetcher,
  Queue,
  RateLimit,
  Vectorize,
} from '@cloudflare/workers-types';
