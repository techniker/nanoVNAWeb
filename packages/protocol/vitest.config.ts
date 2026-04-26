import { base } from '@nanovnaweb/vitest-config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  base,
  defineConfig({
    test: {
      name: 'protocol',
      include: ['test/**/*.test.ts'],
    },
  }),
);
