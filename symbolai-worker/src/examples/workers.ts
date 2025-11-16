/**
 * Cloudflare Workers Examples
 * 
 * أمثلة على Workers متوافقة تمامًا مع معايير Cloudflare
 * Following the standard pattern from Cloudflare Workers documentation
 */

import type { Env, ExecutionContext } from '../types/cloudflare';

/**
 * Example 1: Basic Worker with KV
 * مثال أساسي على Worker مع KV binding
 */
export const basicWorkerWithKV = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Store a value in KV
      await env.KV?.put("KEY", "VALUE");
      
      // Retrieve the value
      const value = await env.KV?.get("KEY");
      
      // List all keys
      const allKeys = await env.KV?.list();
      
      // Delete the key
      await env.KV?.delete("KEY");
      
      return new Response(
        JSON.stringify({
          value,
          allKeys
        }),
        {
          headers: {
            "content-type": "application/json"
          }
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error"
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }
  }
};

/**
 * Example 2: Worker with Request Routing
 * مثال على Worker مع توجيه الطلبات
 */
export const routingWorker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Route based on pathname
    switch (url.pathname) {
      case "/":
        return new Response("Welcome to the API", {
          headers: { "content-type": "text/plain; charset=utf-8" }
        });
        
      case "/api/hello":
        return new Response(
          JSON.stringify({ message: "Hello World", timestamp: new Date().toISOString() }),
          { headers: { "content-type": "application/json" } }
        );
        
      case "/api/data":
        // Use KV to store/retrieve data
        if (request.method === "POST") {
          const data = await request.json();
          await env.KV?.put("user-data", JSON.stringify(data));
          return new Response(JSON.stringify({ success: true }), {
            headers: { "content-type": "application/json" }
          });
        } else {
          const data = await env.KV?.get("user-data");
          return new Response(data || JSON.stringify({ error: "No data found" }), {
            headers: { "content-type": "application/json" }
          });
        }
        
      default:
        return new Response("Not Found", { status: 404 });
    }
  }
};

/**
 * Default export following Cloudflare Workers standard pattern
 */
export default basicWorkerWithKV;
