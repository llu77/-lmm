import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true
    },
    imageService: 'cloudflare'
  }),
  integrations: [
    react()
  ],
  vite: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Force using main zod export to avoid versioned import issues
        'zod/v3': 'zod',
        'zod/v4': 'zod'
      }
    },
    optimizeDeps: {
      include: ['zod']
    },
    ssr: {
      external: [
        'node:buffer',
        'node:path',
        'node:fs',
        'node:fs/promises',
        'node:stream',
        'node:url',
        'node:crypto',
        'node:async_hooks',
        'agents'
      ],
      noExternal: ['@modelcontextprotocol/sdk']
    }
  }
});
