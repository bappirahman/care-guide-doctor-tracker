import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Runs before any test file imports the app, so env.ts parses the test values.
    setupFiles: ['test/env.ts'],
    // Downloading the MongoDB binary on a cold CI cache can take a while.
    hookTimeout: 120_000,
    testTimeout: 20_000,
  },
});
