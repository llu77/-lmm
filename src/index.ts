/**
 * Cloudflare Worker with KV and D1 Database operations
 * Demonstrates key-value storage and database interactions
 */

/// <reference types="@cloudflare/workers-types" />

interface Env {
	KV: KVNamespace;
	DB: D1Database;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			// write a key-value pair
			await env.KV.put('KEY', 'VALUE');

			// read a key-value pair
			const value = await env.KV.get('KEY');

			// list all key-value pairs
			const allKeys = await env.KV.list();

			// delete a key-value pair
			await env.KV.delete('KEY');

			// return a Workers response
			return new Response(
				JSON.stringify({
					value: value,
					allKeys: allKeys,
				}),
				{
					headers: {
						'content-type': 'application/json',
					},
				}
			);
		} catch (error) {
			return new Response(
				JSON.stringify({
					error: error instanceof Error ? error.message : 'Unknown error',
				}),
				{
					status: 500,
					headers: {
						'content-type': 'application/json',
					},
				}
			);
		}
	},
};
