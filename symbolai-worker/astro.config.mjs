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
  // Optimize build for memory-constrained environments
  build: {
    inlineStylesheets: 'auto',
    split: true,
    excludeMiddleware: false
  },
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
    // Build optimizations for memory efficiency
    build: {
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: undefined, // Let Vite handle chunking automatically
        }
      }
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
        'node:async_hooks'
      ]
    }
  }
});
