import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

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
    ssr: {
      external: ['node:buffer', 'node:path', 'node:fs', 'node:stream']
    }
  }
});
