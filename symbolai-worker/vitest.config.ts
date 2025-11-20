import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '.astro/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/*',
        'scripts/',
      ],
      // Coverage thresholds
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      // Per-file coverage (enforce higher standards for critical files)
      perFile: true,
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    // Reporters
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
