import { base } from '@nanovnaweb/vitest-config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  base,
  defineConfig({
    test: {
      name: 'shared',
      include: ['test/**/*.test.ts'],
    },
  }),
);
