import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry points
  entry: ['src/lib/mcp-client.ts'],

  // Output formats
  format: ['cjs', 'esm'],

  // Output directory
  outDir: 'dist',

  // Generate TypeScript declaration files
  dts: true,

  // Generate source maps
  sourcemap: true,

  // Clean output directory before build
  clean: true,

  // Split output into chunks
  splitting: false,

  // Minify output
  minify: false,

  // Target environment
  target: 'es2022',

  // External dependencies (don't bundle these)
  external: [
    '@cloudflare/workers-types',
  ],

  // Keep names for better debugging
  keepNames: true,

  // Tree shaking
  treeshake: true,

  // Banner to add to output files
  banner: {
    js: '// SymbolAI MCP Client Library\n// Built with tsup',
  },
});
