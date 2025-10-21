// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: [
      //
      'coverage/**',
      'dist/**',
      'lib/**',
    ],
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      // Minimal globals to avoid no-undef in Node ESM scripts without extra deps
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
]);
