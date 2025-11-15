/**
 * Simple Cloudflare Worker that responds with "Hello World"
 */

export default {
  async fetch(): Promise<Response> {
    return new Response('Hello World from Cloudflare Worker! 🚀', {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'access-control-allow-origin': '*',
      },
    });
  },
};
