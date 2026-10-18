// file: eslint.config.js
// description: ESLint configuration for ClawKeeper enforcing snake_case conventions
// reference: CLAUDE.md, package.json

import js from '@eslint/js';
import ts_parser from '@typescript-eslint/parser';
import ts_plugin from '@typescript-eslint/eslint-plugin';

export default [
  js.configs.recommended,
  {
    rules: {
      'no-extra-semi': 'error',
      'no-inner-declarations': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-new-symbol': 'error',
    },
  },
  {
    files: ['src/**/*.ts', 'src/**/*.js', 'test/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: ts_parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': ts_plugin,
    },
    rules: {
      // Naming conventions
      // ClawKeeper intentionally uses snake_case for finance-domain data contracts.
      'camelcase': 'off',

      // Code quality
      'no-unused-vars': 'off',
      // Public API type exports and finance-domain contracts intentionally include symbols
      // that are consumed by downstream modules, generated clients, or future integrations.
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off', // We use console for logging
      'prefer-const': 'error',
      'no-var': 'error',
      'no-redeclare': 'off',

      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-throw-literal': 'error',
      'no-return-await': 'off', // Deprecated; return await is valid in try/catch

      // TypeScript-specific (handled by tsc)
      'no-undef': 'off', // TypeScript handles this
    },
  },
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      'dist/**',
      'dashboard/**', // Dashboard has its own config
      'db/**',
      'scripts/**',
      'memory/**',
      'src/demo/**', // Demo data can have any naming
    ],
  },
];
