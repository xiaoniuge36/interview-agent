import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const TYPESCRIPT_FILES = ['**/*.{ts,tsx}'];
const TEST_FILES = ['**/*.spec.ts', '**/*.test.ts', '**/*.test.tsx'];

const qualityRules = {
  'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': [
    'error',
    { max: 50, skipBlankLines: true, skipComments: true, IIFEs: true },
  ],
  'max-depth': ['error', 3],
  'max-params': ['error', 3],
  complexity: ['error', 10],
  'no-magic-numbers': [
    'error',
    {
      ignore: [-1, 0, 1, 2],
      ignoreArrayIndexes: true,
      ignoreDefaultValues: true,
      ignoreClassFieldInitialValues: true,
      enforceConst: true,
      detectObjects: false,
    },
  ],
};

const testRules = {
  'no-magic-numbers': 'off',
};

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/coverage/**',
    '**/.turbo/**',
    '**/.venv/**',
    'apps/agent-runtime/**',
    '设计稿/**',
    '参考资料/**',
    '技术方案/**',
    '需求/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: TYPESCRIPT_FILES,
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: qualityRules,
  },
  {
    files: TEST_FILES,
    rules: testRules,
  },
  prettier,
]);
