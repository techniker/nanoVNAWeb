import { base } from '@nanovnaweb/vitest-config';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
  base,
  defineConfig({
    plugins: [react()],
    test: {
      name: 'web',
      environment: 'jsdom',
      include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
      setupFiles: ['./test/setup.ts'],
    },
  }),
);
