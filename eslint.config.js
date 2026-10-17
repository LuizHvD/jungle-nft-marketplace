import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'playwright-report',
      'test-results',
      'public/mockServiceWorker.js',
      '.chrome-debug-profile',
      'assets-src',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/features/**/*.{ts,tsx}',
      'src/routes/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/mocks/**', '@/mocks/**'],
              message: 'Componentes não importam handlers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        fetch: 'readonly',
        process: 'readonly',
      },
    },
  },
  prettier,
)
