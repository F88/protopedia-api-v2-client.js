import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['tests/setup/env.ts'],
    coverage: {
      include: ['src/**/*'],
      exclude: [
        //
        'src/types/',
        'src/version.ts',
        'node_modules/',
        'dist/',
      ],
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
