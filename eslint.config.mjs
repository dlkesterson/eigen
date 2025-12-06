import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  // Ignore patterns
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'src-tauri/target/**',
      'src-tauri/gen/**',
      '*.min.js',
      'coverage/**',
      'public/**',
    ],
  },

  // Base JavaScript/TypeScript config
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
        // DOM types
        EventListener: 'readonly',
        RequestInit: 'readonly',
        RequestInfo: 'readonly',
        Response: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript rules
      ...typescriptPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',

      // React rules
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
      'react/jsx-no-comment-textnodes': 'warn',
      // Allow React Three Fiber properties (attach, args, position, etc.)
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            'attach',
            'args',
            'position',
            'rotation',
            'intensity',
            'decay',
            'fog',
            'transparent',
            'opacity',
            'linewidth',
            'material',
            'side',
            'wireframe',
            'metalness',
            'roughness',
            'emissive',
            'emissiveIntensity',
            'sizeAttenuation',
            // Additional Three.js material properties
            'transmission',
            'thickness',
            'envMapIntensity',
            'clearcoat',
            'clearcoatRoughness',
            'distance',
            'geometry',
            'blending',
            'depthWrite',
            'depthTest',
            'vertexColors',
          ],
        },
      ],

      // React Hooks rules - Core rules
      ...reactHooksPlugin.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React Compiler rules (eslint-plugin-react-hooks v7+)
      // Downgraded to warnings - these are valid issues but need careful refactoring
      'react-hooks/config': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/component-hook-factories': 'warn',
      'react-hooks/gating': 'warn',
      'react-hooks/globals': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/unsupported-syntax': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-hooks/incompatible-library': 'warn',

      // Prettier
      'prettier/prettier': 'warn',

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off', // Use TypeScript's version
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // React Three Fiber components - relax purity rules for 3D rendering patterns
  {
    files: ['**/components/constellation/**/*.ts', '**/components/constellation/**/*.tsx'],
    rules: {
      // R3F components often use Math.random() for visual effects (particles, dust, etc.)
      // and update refs during render for performance optimization
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
    },
  },

  // JavaScript files
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'warn',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Prettier config (disables conflicting rules)
  prettierConfig,
];
