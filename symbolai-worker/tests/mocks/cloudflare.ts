/**
 * Cloudflare Runtime Mocks
 * 
 * Provides mock implementations of Cloudflare bindings for testing:
 * - D1 Database
 * - KV Namespace
 * - R2 Bucket
 * - AI Binding
 */

import { vi } from 'vitest';

/**
 * Mock D1 Database
 * 
 * Simulates Cloudflare D1 database operations in memory.
 */
export class MockD1Database {
  private data: Map<string, any[]> = new Map();

  prepare(query: string) {
    const self = this;
    
    return {
      bind: (...params: any[]) => ({
        first: async <T = any>(): Promise<T | null> => {
          // Simple mock: return first item from table
          if (query.includes('SELECT') && query.includes('users_new')) {
            const users = self.data.get('users') || [];
            if (query.includes('WHERE username = ?')) {
              return users.find((u: any) => u.username === params[0]) || null;
            }
            if (query.includes('WHERE id = ?')) {
              return users.find((u: any) => u.id === params[0]) || null;
            }
            return users[0] || null;
          }
          return null;
        },
        
        all: async <T = any>(): Promise<{ results: T[] }> => {
          if (query.includes('users_new')) {
            return { results: self.data.get('users') || [] };
          }
          if (query.includes('roles')) {
            return { results: self.data.get('roles') || [] };
          }
          if (query.includes('branches')) {
            return { results: self.data.get('branches') || [] };
          }
          return { results: [] };
        },
        
        run: async (): Promise<{ success: boolean; meta?: any }> => {
          // Mock INSERT/UPDATE/DELETE
          if (query.includes('INSERT INTO users_new')) {
            const user = {
              id: params[0],
              username: params[1],
              password: params[2],
              email: params[3],
              full_name: params[4],
              phone: params[5],
              role_id: params[6],
              branch_id: params[7],
              is_active: params[8],
            };
            const users = self.data.get('users') || [];
            users.push(user);
            self.data.set('users', users);
            return { success: true };
          }
          
          if (query.includes('UPDATE users_new')) {
            // Update password hash
            if (query.includes('SET password = ?')) {
              const users = self.data.get('users') || [];
              const userIndex = users.findIndex((u: any) => u.id === params[1]);
              if (userIndex !== -1) {
                users[userIndex].password = params[0];
                self.data.set('users', users);
              }
            }
            return { success: true };
          }
          
          return { success: true };
        },
      }),
    };
  }

  /**
   * Test helper: Seed database with test data
   */
  seedData(table: string, rows: any[]) {
    this.data.set(table, rows);
  }

  /**
   * Test helper: Clear all data
   */
  clear() {
    this.data.clear();
  }
}

/**
 * Mock KV Namespace
 * 
 * Simulates Cloudflare KV storage in memory.
 */
export class MockKVNamespace {
  private data: Map<string, string> = new Map();
  private expirations: Map<string, number> = new Map();

  async get(key: string): Promise<string | null> {
    // Check expiration
    const expiration = this.expirations.get(key);
    if (expiration && expiration < Date.now()) {
      this.data.delete(key);
      this.expirations.delete(key);
      return null;
    }
    
    return this.data.get(key) || null;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    this.data.set(key, value);
    
    if (options?.expirationTtl) {
      const expirationTime = Date.now() + (options.expirationTtl * 1000);
      this.expirations.set(key, expirationTime);
    }
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
    this.expirations.delete(key);
  }

  async list(options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }> {
    const keys = Array.from(this.data.keys());
    const filteredKeys = options?.prefix
      ? keys.filter(k => k.startsWith(options.prefix!))
      : keys;
    
    return {
      keys: filteredKeys.map(name => ({ name })),
    };
  }

  /**
   * Test helper: Clear all data
   */
  clear() {
    this.data.clear();
    this.expirations.clear();
  }

  /**
   * Test helper: Get all keys (for debugging)
   */
  getAllKeys(): string[] {
    return Array.from(this.data.keys());
  }
}

/**
 * Mock R2 Bucket
 * 
 * Simulates Cloudflare R2 storage in memory.
 */
export class MockR2Bucket {
  private objects: Map<string, { data: ArrayBuffer; metadata?: any; httpMetadata?: any }> = new Map();

  async put(key: string, value: ArrayBuffer | string, options?: any): Promise<void> {
    const data = typeof value === 'string' 
      ? new TextEncoder().encode(value).buffer 
      : value;
    
    this.objects.set(key, {
      data,
      metadata: options?.customMetadata,
      httpMetadata: options?.httpMetadata,
    });
  }

  async get(key: string): Promise<any | null> {
    const obj = this.objects.get(key);
    if (!obj) return null;
    
    return {
      arrayBuffer: async () => obj.data,
      text: async () => new TextDecoder().decode(obj.data),
      blob: async () => new Blob([obj.data]),
      json: async () => JSON.parse(new TextDecoder().decode(obj.data)),
      customMetadata: obj.metadata,
      httpMetadata: obj.httpMetadata,
    };
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async list(options?: { prefix?: string }): Promise<{ objects: Array<{ key: string }> }> {
    const keys = Array.from(this.objects.keys());
    const filteredKeys = options?.prefix
      ? keys.filter(k => k.startsWith(options.prefix!))
      : keys;
    
    return {
      objects: filteredKeys.map(key => ({ key })),
    };
  }

  /**
   * Test helper: Clear all objects
   */
  clear() {
    this.objects.clear();
  }
}

/**
 * Mock AI Binding
 * 
 * Simulates Cloudflare AI binding.
 */
export class MockAI {
  async run(model: string, inputs: any): Promise<any> {
    // Return mock AI response based on model
    if (model.includes('text-generation')) {
      return {
        response: 'Mock AI generated response',
        tokens: 100,
      };
    }
    
    if (model.includes('embedding')) {
      return {
        data: Array(768).fill(0).map(() => Math.random()),
        shape: [768],
      };
    }
    
    return {
      response: 'Mock AI response',
    };
  }
}

/**
 * Create complete mock environment
 */
export function createMockEnv() {
  return {
    DB: new MockD1Database(),
    SESSIONS: new MockKVNamespace(),
    CACHE: new MockKVNamespace(),
    FILES: new MockR2Bucket(),
    AI: new MockAI(),
    // Add any environment variables
    ANTHROPIC_API_KEY: 'test-key',
    RESEND_API_KEY: 'test-key',
  };
}

/**
 * Create mock context.locals for Astro middleware
 */
export function createMockLocals(env: ReturnType<typeof createMockEnv>) {
  return {
    runtime: {
      env,
    },
    user: null as any,
    isAuthenticated: false,
    userId: undefined as string | undefined,
    sessionId: undefined as string | undefined,
  };
}
