import { base } from '@nanovnaweb/vitest-config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  base,
  defineConfig({
    test: {
      name: 'state',
      include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
      environmentMatchGlobs: [['test/react-bindings.test.tsx', 'jsdom']],
    },
  }),
);
