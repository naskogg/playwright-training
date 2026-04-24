import eslint from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';

export default [
  eslint.configs.recommended,

  // Disable base rule superseded by the TypeScript-aware equivalent
  {
    rules: {
      'no-unused-vars': 'off',
    },
  },

  // Node.js globals for config and utility files
  {
    files: ['playwright.config.ts', 'utils/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // TypeScript rules for all source files
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'default',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
      ],
    },
  },

  // Playwright rules scoped to test and fixture files only
  {
    files: ['tests/**/*.ts', 'fixtures/**/*.ts'],
    plugins: {
      playwright,
    },
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-element-handle': 'error',
      'playwright/no-eval': 'error',
    },
  },

  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.playwright/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
    ],
  },
];
