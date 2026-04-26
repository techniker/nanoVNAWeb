import { defineConfig } from 'vitest/config';

export const base = defineConfig({
  test: {
    globals: false,
    environment: 'node',
    passWithNoTests: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
