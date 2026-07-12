import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'lib/**',
      'coverage/**',
      'node_modules/**',
      'example/.expo/**',
      'example/expo-env.d.ts',
    ],
  },

  js.configs.recommended,
  tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat['recommended-latest'],

  {
    languageOptions: {
      globals: {
        ...globals.es2021,
        ...globals.node,
        __DEV__: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // This library lives or dies on hook correctness.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // The React Compiler forbids mutating anything reached through a hook argument.
      // Reanimated shared values (`progress.value = ...`) and expo-video players
      // (`player.timeUpdateEventInterval = ...`) are imperative handles whose entire
      // purpose is to be mutated off the render path — that's what keeps progress off
      // the JS thread. The rule cannot distinguish those from an accidental prop
      // mutation, and this library is made of them. `refs`, `purity`, and
      // `set-state-in-effect` stay on: those catch real concurrency bugs.
      'react-hooks/immutability': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: globals.jest,
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      // Metro/babel/jest configs are CommonJS by contract.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  prettier,
);
