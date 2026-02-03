// file: eslint.config.js
// description: ESLint configuration for ClawKeeper enforcing snake_case conventions
// reference: CLAUDE.md, package.json

import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      // Naming conventions
      'camelcase': ['error', {
        properties: 'never',
        ignoreDestructuring: false,
        ignoreImports: false,
        ignoreGlobals: false,
        allow: ['^UNSAFE_', '^[A-Z]+_[A-Z]+$'], // Allow SCREAMING_SNAKE_CASE for constants
      }],
      
      // Code quality
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': 'off', // We use console for logging
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-throw-literal': 'error',
      'no-return-await': 'error',
      
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
